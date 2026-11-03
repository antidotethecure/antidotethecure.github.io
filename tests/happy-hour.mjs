/* Happy hour window maths (Antidote, 2026-11-02). Pure logic, no browser: the same leftMin() the strip uses.
   node tests/happy-hour.mjs */
const S = 15 * 60, E = 18 * 60;
function leftMin(t, S, E, DAYS) {
  const wrap = E < S, on = wrap ? (t.m >= S || t.m < E) : (t.m >= S && t.m < E);
  if (!on) return 0;
  if (DAYS) { const day = wrap && t.m < E ? (t.d + 6) % 7 : t.d; if (DAYS.indexOf(day) < 0) return 0; }
  return (wrap && t.m >= S ? E + 1440 : E) - t.m;
}
let bad = 0;
const t = (n, got, want) => { const ok = got === want; console.log((ok ? 'ok   ' : 'FAIL ') + n, ok ? '' : `got ${got} want ${want}`); if (!ok) bad++; };
const at = (h, m, d = 3) => ({ d, m: h * 60 + m, s: 0 });
t('2:59 PM - not yet',        leftMin(at(14, 59), S, E), 0);
t('3:00 PM - 180 min left',   leftMin(at(15, 0), S, E), 180);
t('4:30 PM - 90 min left',    leftMin(at(16, 30), S, E), 90);
t('5:59 PM - 1 min left',     leftMin(at(17, 59), S, E), 1);
t('6:00 PM - over',           leftMin(at(18, 0), S, E), 0);
t('midnight - over',          leftMin(at(0, 0), S, E), 0);
// a late window that runs past midnight belongs to the day it started on
const LS = 22 * 60, LE = 2 * 60;
t('late 11 PM Wed - 180 left', leftMin(at(23, 0, 3), LS, LE), 180);
t('late 1 AM Thu - 60 left',   leftMin(at(1, 0, 4), LS, LE), 60);
t('late 1 AM Thu counts as Wed', leftMin(at(1, 0, 4), LS, LE, [3]), 60);
t('late 1 AM Thu not Thu-only',  leftMin(at(1, 0, 4), LS, LE, [4]), 0);
t('days filter: Tue-only on Wed', leftMin(at(16, 0, 3), S, E, [2]), 0);
t('days filter: Wed-only on Wed', leftMin(at(16, 0, 3), S, E, [3]), 180 - 60);
console.log(bad ? 'FAILURES ' + bad : 'ALL OK'); process.exit(bad ? 1 : 0);
