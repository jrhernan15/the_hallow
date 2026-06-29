# The Hollow — Ordering System Plan

Turn the menu into a shared, live ordering board — **The Pass** — where guests
queue drinks from their phones onto **The Rail**, the bartender fires same-drink
tickets into auto-scaled **Rounds**, and everyone watches status update live.

## Terminology

- **The Pass** — the whole board (the order station): the rail plus rounds in progress.
- **The Rail** — tickets waiting to be made.
- **Ticket** — one guest's drink order.
- **Round** — a batch of the *same* drink fired together; the recipe is auto-scaled
  with `scale.js`.
- Flow verbs: a ticket gets **fired** → **working** → **up** (ready) → **served**.

## Decisions (locked in)

- **Guest name:** optional + playful — reuse the existing "Name or table" field.
- **Bar controls:** open to anyone on the LAN (no PIN for now).
- **Live status:** yes — each guest watches their drink move.
- **Rounds:** group identical drinks and auto-scale the recipe via `scale.js`.
- **Notes:** a per-ticket notes field ("extra lime, no salt").
- **Scale:** ~8 people at peak, so concurrency is a non-issue — the light stack is plenty.

## The good news: the UI mostly already exists

The current app already has the queue ("The Well") and **batches** built in — but
they live in each phone's `localStorage` (`hollow_orders_v1`, `hollow_batches_v1`),
so they're private to one device and can't be shared.

So the job is **not** new screens — it's replacing per-phone storage with a
**shared server + live updates**, and relabeling: today's "The Well" becomes
**The Pass**, "orders" become tickets on **The Rail**, and "batches" become
**Rounds**. The component logic is hand-editable in `index.html`; `support.js`
(the generated React runtime) stays untouched.

## Architecture

```
  Guest phones                          NUC (always-on)
  ┌──────────────┐   http://thehollow.local
  │ menu + Rail  │ ──────────────► Caddy ──/ (static files)
  │  (index.html)│ ◄── live SSE ──┐  │
  └──────────────┘                │  └──/api/* ──► Node service ──► SQLite file
                                  └─────────────────┘   (tickets, rounds)
```

- **Node service** on the NUC — one language with the frontend, easy to run.
- **SQLite** for storage — one file, zero admin, survives reboots.
- **Server-Sent Events (SSE)** for live updates — one-way server→client is all we
  need; simpler than WebSockets, auto-reconnects, proxies cleanly through Caddy.
- **Caddy** reverse-proxies `/api/*` to the Node service; guests still only ever
  hit `http://thehollow.local/`.
- Runs as a **systemd service** (always-on, like Caddy and the mDNS alias).

## Data model (SQLite)

**tickets**

| field | notes |
| --- | --- |
| id | primary key |
| drink | cocktail name (from `cocktails.js`) |
| guest_name | nullable — the optional playful name |
| notes | nullable — e.g. "extra lime, no salt" |
| status | `rail` → `working` → `up` → `served` (or `cancelled`) |
| round_id | nullable — which round it was fired into |
| created_at / updated_at | timestamps |

**rounds**

| field | notes |
| --- | --- |
| id | primary key |
| drink | the batched drink (same-drink grouping) |
| count | how many (drives the `scale.js` multiplier) |
| status | `working` → `up` → `served` |
| created_at / updated_at | timestamps |

**Status a guest sees:** `On the Rail → Working → Up → Served`. Advancing a round
cascades to its tickets.

## API (all open on the LAN)

| method | path | purpose |
| --- | --- | --- |
| GET | `/api/state` | snapshot `{ rail: [...], rounds: [...] }` |
| GET | `/api/stream` | SSE — emits on every change |
| POST | `/api/tickets` | `{ drink, name?, notes? }` → add to The Rail |
| DELETE | `/api/tickets/:id` | cancel a ticket |
| POST | `/api/rounds` | `{ ticketIds: [...] }` → fire same-drink tickets into a round; `scale.js` scales the recipe |
| PATCH | `/api/rounds/:id` | `{ status }` → working / up / served (cascades to tickets) |
| DELETE | `/api/rounds/:id` | disband → tickets return to The Rail |
| POST | `/api/reset` | clear The Pass for a fresh party |

## Frontend changes (inside `index.html`)

- **Add to the rail** → `POST /api/tickets` instead of writing `localStorage`.
- **The Rail + Rounds** read from `/api/state` and subscribe to `/api/stream`, so
  every phone shows the same live board.
- **Rename** "Name or table" → optional + playful (e.g. "Who's it for? (optional)").
- Each phone still uses `localStorage` for two small things: remembering the
  guest's name (to prefill) and which ticket ids are "mine" (to badge **yours** and
  show personal live status).
- Bar actions (fire a round, advance status, reset) are visible to everyone (open).

## Deployment additions

- Install **Node** on the NUC.
- New `thehollow-api.service` systemd unit (always-on).
- Caddyfile: add `handle /api/* { reverse_proxy 127.0.0.1:3000 }`.
- SQLite db at `/srv/the_hollow/data/hollow.db` — **gitignored** (never commit live
  party data).
- A **Reset the Pass** control to start each party clean.

## Build in phases

1. **Backend skeleton** — Node + SQLite + endpoints + SSE; verify with `curl`; wire
   up the systemd service and Caddy proxy.
2. **Wire ordering** — add-to-rail posts to the API; The Rail becomes shared + live;
   rename the name field; add the notes field.
3. **Rounds** — fire same-drink tickets, auto-scale with `scale.js`, advance
   `working → up → served`, and surface live status to each guest.
4. **Polish** — reset the Pass, "yours" badges, SSE reconnect on phone wake, empty
   and edge states.

## Risks & notes

- **Re-exporting the design:** if you later edit the look in Claude Design and
  re-export, hand edits to the ordering layer could be overwritten. We'll keep the
  API/order code well-contained and documented; longer term it could move to a
  small separate module.
- **Open API:** anyone on your wifi can cancel or serve. Fine for a trusted home; a
  light PIN on the bar actions can be added later if you ever want it.
- **Concurrency:** an 8-person peak is trivial; SQLite in WAL mode handles it easily.
- **Sleeping phones:** SSE auto-reconnects and refetches state on wake.
