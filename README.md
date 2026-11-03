# TalwindEditorPro

> Working title. Final naming and trademark decision: `docs/adr/0003-name-and-trademark.md`.

Visual editor for static HTML + Tailwind CSS v4 that preserves source bytes.

محرر بصري لملفات HTML الثابتة مع Tailwind CSS v4، يحفظ الكود بايتيًا ويشرح أثر كل تعديل.

## Requirements

- Node.js 22.22 or newer
- npm 10 or newer

## Setup

```bash
npm install
```

## Verify

```bash
npm run verify
npm run bench
```

## Demo

```bash
cd demo
npm install
npm run build
npm run serve
```

ثم افتح `http://127.0.0.1:8000/`.

## Structure

- `docs/research/` — product and architecture research
- `docs/adr/` — binding decisions
- `docs/superpowers/plans/` — execution plans
- `packages/` — core, framework-free modules
- `apps/` — desktop shell and UI (from Phase 3)
- `demo/` — browser demo of byte-faithful editing
- `spikes/` — historical experiments, not production code

## Principles

1. Files on disk are the source of truth.
2. Saving never runs `parse + serialize`; only the targeted byte range changes.
3. Every edit goes through `Command → Patch → Ledger → Verify`.
4. The official Tailwind engine is used, never reimplemented.
5. Exports contain no editor metadata.

## License

All rights reserved. Terms pending decision D-06; see `LICENSE`.
