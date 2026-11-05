import fs from 'node:fs';

const results = JSON.parse(fs.readFileSync('bench/results.json', 'utf8'));
const p95 = results.html.setClasses.p95Ms;
const budget = Number(process.env.TEP_EDIT_BUDGET_MS ?? 200);

if (!results.html.restoredExactly) {
  console.error('bench: round-trip is not byte exact');
  process.exit(1);
}
if (p95 > budget) {
  console.error(`bench: edit p95 ${p95}ms exceeds ${budget}ms`);
  process.exit(1);
}
console.error(`bench: ok (p95 ${p95}ms)`);
