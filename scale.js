/* =========================================================================
   THE HOLLOW — RECIPE SCALER
   -------------------------------------------------------------------------
   Pure helpers for multiplying a cocktail spec by a batch quantity.
   Handles unicode fractions (½ ⅓ ⅔ ¼ ¾ ⅛ ⅙ …), mixed numbers (1½),
   ranges (3–4 dashes, 6–8), units (oz, dash/dashes, tsp), and leaves
   qualitative amounts (top, rinse, float, splash) untouched.
   ========================================================================= */

// glyph → decimal value
const GLYPHS = {
  '¼':1/4, '½':1/2, '¾':3/4,
  '⅐':1/7, '⅑':1/9, '⅒':1/10,
  '⅓':1/3, '⅔':2/3,
  '⅕':1/5, '⅖':2/5, '⅗':3/5, '⅘':4/5,
  '⅙':1/6, '⅚':5/6,
  '⅛':1/8, '⅜':3/8, '⅝':5/8, '⅞':7/8,
};
const GLYPH_KEYS = Object.keys(GLYPHS).join('');

// decimal → nice fraction glyph (within tolerance), else null
const NICE = [
  [1/8,'⅛'],[1/6,'⅙'],[1/4,'¼'],[1/3,'⅓'],[3/8,'⅜'],
  [1/2,'½'],[5/8,'⅝'],[2/3,'⅔'],[3/4,'¾'],[5/6,'⅚'],[7/8,'⅞'],
];

function parseNumberToken(tok){
  // tok like "1½", "⅔", "2", "1¾", "12"
  const t = tok.trim();
  if (!t) return null;
  const m = t.match(new RegExp('^(\\d+)?\\s*([' + GLYPH_KEYS + '])?$'));
  if (!m || (!m[1] && !m[2])) {
    // plain decimal fallback
    const f = parseFloat(t);
    return isNaN(f) ? null : f;
  }
  let v = 0;
  if (m[1]) v += parseInt(m[1], 10);
  if (m[2]) v += GLYPHS[m[2]];
  return v;
}

function formatNumber(value){
  if (!isFinite(value)) return String(value);
  const whole = Math.floor(value + 1e-9);
  const frac = value - whole;
  // exact-ish integer
  if (frac < 0.02) return String(whole);
  // find nice fraction
  for (const [fv, gl] of NICE){
    if (Math.abs(frac - fv) < 0.02){
      return (whole > 0 ? whole : '') + gl;
    }
  }
  // fallback: round to 2 decimals, trim
  const r = Math.round(value * 100) / 100;
  return String(r);
}

// Split an amount into { num, unit } where num is the leading quantity token
// and unit is everything after the first space. Returns null if no quantity.
function splitAmount(amount){
  const s = String(amount).trim();
  // must start with a digit or a fraction glyph to be scalable
  if (!new RegExp('^[\\d' + GLYPH_KEYS + ']').test(s)) return null;
  const sp = s.indexOf(' ');
  if (sp === -1) return { num: s, unit: '' };
  return { num: s.slice(0, sp), unit: s.slice(sp + 1) };
}

function pluralizeUnit(unit, value){
  if (!unit) return unit;
  // dash → dashes when >1 ; dashes → dash when ==1
  if (/^dash(es)?\b/i.test(unit)){
    const rest = unit.replace(/^dash(es)?/i, '');
    return (value > 1 ? 'dashes' : 'dash') + rest;
  }
  return unit;
}

// Scale a single amount string by integer n. n>=1.
function scaleAmount(amount, n){
  if (!n || n === 1) return amount;
  const parts = splitAmount(amount);
  if (!parts) return amount; // qualitative: top, rinse, float, splash, etc.

  const { num, unit } = parts;

  // range? a–b or a-b (en-dash or hyphen between two numbers)
  const rangeMatch = num.match(new RegExp('^([\\d' + GLYPH_KEYS + ']+)[\\u2013\\-]([\\d' + GLYPH_KEYS + ']+)$'));
  if (rangeMatch){
    const a = parseNumberToken(rangeMatch[1]);
    const b = parseNumberToken(rangeMatch[2]);
    if (a == null || b == null) return amount;
    const sa = formatNumber(a * n), sb = formatNumber(b * n);
    const u = unit ? ' ' + pluralizeUnit(unit, b * n) : '';
    return sa + '\u2013' + sb + u;
  }

  const v = parseNumberToken(num);
  if (v == null) return amount;
  const scaled = v * n;
  const u = unit ? ' ' + pluralizeUnit(unit, scaled) : '';
  return formatNumber(scaled) + u;
}

// Scale an entire spec [[amount, ingredient], ...] by n.
function scaleSpec(spec, n){
  return (spec || []).map(row => [scaleAmount(row[0], n), row[1]]);
}

export { scaleAmount, scaleSpec, parseNumberToken, formatNumber };
