# The Hollow — Cocktail Menu

A cocktail menu and recipe book for the Hernandez House Bar, served on the home
network so anyone can pull it up on their phone at `http://<your-nuc>/`.
See **[DEPLOY.md](DEPLOY.md)** for hosting.

## Files

| File | What it is | Edit it? |
| --- | --- | --- |
| `cocktails.js` | **The menu data — all the drinks** | **Yes — this is the one** |
| `index.html` | The page itself (a Claude Design component) | Rarely |
| `scale.js` | Batch-scaling helper (e.g. double/triple a recipe) | No |
| `support.js` | Generated React runtime — **do not edit** | No |
| `assets/` | Logo, spirit artwork, and a local copy of React | No |
| `deploy/Caddyfile`, `DEPLOY.md` | Hosting config + setup guide | Setup only |

To change the menu you only ever touch `cocktails.js`.

> **Heads up:** this version must be **served over the network** (see DEPLOY.md),
> not opened by double-clicking the file. The page loads its data as a browser
> module, which the `file://` protocol blocks.

## Add a drink

1. Open `cocktails.js` in any text editor.
2. Copy an existing `{ ... }` block.
3. Paste it inside the `[ ... ]` list, after another drink's `},`.
4. Fill in the fields, **keep the trailing comma** after the closing `}`.
5. Get the file onto the server and refresh (see DEPLOY.md → "Updating the menu").

A drink looks like this:

```js
{
  name:     "Gimlet",
  spirit:   "Gin",                 // section + Spirit filter
  base:     "Gin",                 // little label above the title
  tags:     ["Sour/Tart","Citrus"],// Flavor chips
  build:    "Shaken",              // Stirred | Shaken | Built | Muddled
  glass:    "Coupe",
  occasion: "Anytime",             // Aperitif | Anytime | Brunch | Nightcap | Digestif
  summary:  "Gin and lime, sharp and spare.",
  spec:[                           // each line is [amount, ingredient]
    ["2 oz","Hendrick's gin"],
    ["¾ oz","lime juice"],
    ["¾ oz","simple syrup"]
  ],
  steps:[ "Shake with ice.", "Strain into a chilled coupe." ],
  garnish: "Lime wheel",
  history: "Royal Navy origin — gin cut with lime against scurvy.",
  note:    "Any spec caveat goes here (shown as 'Source note —')."
},
```

## Remove a drink

Delete its entire `{ ... },` block (including the trailing comma) and save.

## Recommended field values

A brand-new value is fine — it still appears and gets its own filter chip.
These are just the ones already in use:

- **spirit:** Gin, Bourbon, Rye, Tequila, Rum, Vodka, Cognac, Aperitivo
- **tags (flavor):** Spirit-forward, Bitter, Sour/Tart, Sweet, Herbal, Floral, Citrus, Fruity, Refreshing/Long, Creamy/Rich
- **build:** Stirred, Shaken, Built, Muddled
- **glass:** Rocks, Coupe, Highball, Collins, Copper mug, Mug, Julep cup, Wine glass
- **occasion:** Aperitif, Anytime, Brunch, Nightcap, Digestif

## Handy fraction glyphs

Copy/paste as needed: `½  ⅓  ⅔  ¼  ¾  ⅛  ⅙`

## Common mistakes

- **Card didn't show up?** You probably missed a comma or left a quote unclosed.
  After editing `cocktails.js`, check the browser console (F12) — a syntax error
  there means a punctuation slip. Fix it and refresh.
- Keep quotes straight (`"`), and don't delete the `[` at the top or `];` at the
  bottom of the list.
