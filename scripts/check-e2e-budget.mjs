import fs from 'node:fs';

const path = 'bench/browser.json';
if (!fs.existsSync(path)) {
  console.error(`bench: missing ${path}; run npm run test:e2e`);
  process.exit(1);
}
const results = JSON.parse(fs.readFileSync(path, 'utf8'));
const budget = Number(process.env.TEP_OPEN_PROJECT_BUDGET_MS ?? 3000);
const elapsed = results.openProjectMs;
if (typeof elapsed !== 'number') {
  console.error('bench: openProjectMs missing from browser results');
  process.exit(1);
}
if (elapsed > budget) {
  console.error(`bench: open project took ${elapsed}ms, budget is ${budget}ms`);
  process.exit(1);
}
console.error(`bench: open project ${elapsed}ms (budget ${budget}ms)`);
