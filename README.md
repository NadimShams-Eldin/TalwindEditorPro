# TalwindEditorPro

> Working title: `docs/adr/0003-name-and-trademark.md`.

Visual editor for static HTML + Tailwind CSS v4 that preserves source bytes.

## Requirements

Node.js 22.22+ and npm 10+.

```bash
npm install
npm run verify
npm run bench && node scripts/check-budget.mjs
```

Browser and desktop gates:

```bash
npx playwright install chromium
npm run test:e2e && npm run check:e2e-budget
npm run build --workspace @tep/desktop
```

## Demo

```bash
cd demo && npm install && npm run build && npm run serve
```

Open `http://127.0.0.1:8000/`.

## Structure

`docs/` research, ADRs, plans · `packages/` core modules (`parser`, `tailwind`, `contracts`, `fs`, `preview`, `editor`) · `apps/desktop` Electron shell · `e2e/` Playwright journeys · `demo/` editing demo · `spikes/` historical experiments.

## Principles

1. Files on disk are the source of truth.
2. Saving never runs `parse + serialize`.
3. Every edit: `Command → Patch → Ledger → Verify`.
4. Official Tailwind engine, never reimplemented.
5. Exports contain no editor metadata.

## License

All rights reserved. Terms pending D-06; see `LICENSE`.
