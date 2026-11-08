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
const indexedP95 = results.html.indexedEdit?.p95Ms ?? Number.POSITIVE_INFINITY;
const indexedBudget = Number(process.env.TEP_INDEXED_BUDGET_MS ?? 30);
if (results.html.indexedDrift) {
  console.error('bench: indexed offsets drifted from the reparsed document');
  process.exit(1);
}
if (indexedP95 > indexedBudget) {
  console.error(`bench: indexed edit p95 ${indexedP95}ms exceeds ${indexedBudget}ms`);
  process.exit(1);
}
console.error(`bench: ok (p95 ${p95}ms, indexed ${indexedP95}ms)`);
