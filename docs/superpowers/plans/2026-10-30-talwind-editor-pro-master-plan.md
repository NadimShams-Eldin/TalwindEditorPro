# TalwindEditorPro — الخطة التنفيذية المرحلية (Master Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**الهدف:** تحويل دراسة `docs/research/` إلى منتج قابل للتشغيل: محرر Tailwind-native يحفظ الكود بايتيًا، يشرح كل تعديل، ويضمن تطابق المعاينة مع البناء.

**المعمارية:** Monorepo بحزم `packages/*` مستقلة عن Electron وReact. النواة (parser، ledger، class-ir، tailwind، tokens) تعمل في Node والمتصفح. القشرة (Electron + React) تستهلك ports فقط. كل كتابة تمر عبر `Command → Patch → Ledger → Verify`.

**التقنيات المثبتة عمليًا:** Node.js 22.22، TypeScript 5.9.3 (type stripping أصلي بلا خطوة build للنواة)، `parse5@8.0.1`، `tailwindcss@4.3.3` + `@tailwindcss/node@4.3.3`، Electron 38.8.6، Vite 7.3.7، React 19.3.1، Playwright 1.64.1، `node:test` بدل إطار اختبار خارجي.

---

## القيود العامة (Global Constraints)

تسري على كل مهمة في كل مرحلة، وأي تسليم يخالفها مرفوض:

1. **الملكية:** الملفات على القرص هي مصدر الحقيقة. لا قاعدة بيانات تحتوي DOM. `.tep/` قابلة للحذف دون فقدان محتوى.
2. **الحفظ البايتي:** لا `parse + serialize` للحفظ. أي تعديل لا يمسّ إلا النطاق المستهدف، مع اختبار round-trip بايتي إلزامي.
3. **لا كتابة مباشرة:** الواجهة لا تكتب ملفًا. كل تعديل يمر بـ `Command → validate → patch → apply → ledger → verify`.
4. **Tailwind الرسمي:** لا نعيد كتابة محرك Tailwind. نستخدم `@tailwindcss/node` مع adapter وfallback إلى CLI.
5. **الإصدارات مثبتة:** كل تبعية برقم دقيق بلا `^` أو `~` في `package.json`. `package-lock.json` مصدر الحقيقة.
6. **النواة بلا `any`:** `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `@typescript-eslint/no-explicit-any: error`.
7. **قابلية النقل:** `erasableSyntaxOnly: true` و`allowImportingTsExtensions: true`. لا `enum` ولا `namespace` ولا decorators في النواة.
8. **الأمان:** `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`. لا تنفيذ سكربتات المشروع في عملية المحرر. تحقق من كل مسار قبل القراءة/الكتابة.
9. **التصدير النظيف:** لا `data-tep-id` ولا metadata في أي ملف مُصدَّر. اختبار تصدير يفشل عند وجودها.
10. **الميزانية:** تعديل class < 100ms، تحديث CSS < 150ms، تحديد عنصر < 50ms، فتح 100 صفحة < 3s. تجاوز 20% يوقف إضافة الميزات.
11. **اللغة:** الكود والتعليقات التقنية بالإنجليزية. الوثائق والواجهة بالعربية مع المصطلحات التقنية بالإنجليزية.
12. **الالتزام:** كل مهمة تنتهي بـ commit مستقل. لا commit بلا اختبار ناجح و`typecheck` و`lint`.
13. **لا حذف:** لا `rm -rf` ولا `git clean -f` ولا حذف ملفات دون تأكيد صريح.
14. **العلامة:** لا يُستخدم اسم "Tailwind" كعلامة تجارية. الاسم الحالي عامل فقط، ويُغلق قراره قبل المرحلة 3.

---

## 1. كيف تُقرأ هذه الخطة

```text
مرحلة (Phase) → مهمة (Task) → خطوة (Step)
```

- **المرحلة** لها هدف، بوابة دخول، وبوابة خروج قابلة للقياس.
- **المهمة** أصغر وحدة تُراجع مستقلة، ولها ملفات وواجهات وخطوات TDD.
- **الخطوة** إجراء واحد بين 2 و5 دقائق، تنتهي باختبار أو commit.

**قاعدة التفصيل:** المراحل 0 إلى 3 مفصلة بكود مأخوذ من نماذج أولية جُرّبت فعليًا في هذه البيئة (13 اختبارًا ناجحًا، typecheck وESLint أخضران). المراحل 4 إلى 10 مواصفات تنفيذية كاملة (ملفات، واجهات TypeScript، اختبارات قبول، أوامر)، وتُوسَّع إلى خطة تفصيلية بكود عند دخول كل مرحلة باستخدام `writing-plans`. هذا فصل ضروري لأن تفاصيل الواجهة تعتمد على نتائج المرحلة السابقة.

**قاعدة عدم البدء:** لا تبدأ مرحلة قبل توقيع بوابة خروج المرحلة السابقة في `docs/adr/`. الاستثناء الوحيد هو العمل المتوازي المسموح في القسم 3.

---

## 2. خريطة المراحل

| المرحلة | المدة | الهدف | بوابة الخروج | تعتمد على |
|---|---|---|---|---|
| P0 التأسيس والحوكمة | أسبوع 1-2 | مستودع نظيف، قرارات مغلقة، CI أخضر | `verify` + `bench` تعمل في CI | — |
| P1 نواة المستند | أسبوع 3-5 | تعديل HTML بايتيًا مع Ledger وUndo وفهرس دائم | 50 ملفًا، 0 انحراف، 1000 undo سليمة | P0 |
| P2 محرك Tailwind | أسبوع 6-7 | compile برمجي + candidates صريحة + theme | build بارد < 300ms، parity 20 حالة | P1 |
| P3 قشرة سطح المكتب والمعاينة | أسبوع 8-10 | فتح مشروع، تعديل، معاينة، حفظ | E2E فتح→تعديل→حفظ→تراجع | P1, P2 |
| P4 التحرير البصري وClass IR | أسبوع 11-13 | Inspector + Class Tree + تعارضات | 200 تعديل بلا "no effect" | P3 |
| P5 Tokens والاستجابة | أسبوع 14-16 | تعديل token واحد وأثره، breakpoints | 4 مقاسات + theme switch | P4 |
| P6 المكونات والصفحات | أسبوع 17-20 | components، layouts، صفحات، أصول | موقع 10 صفحات + تحديث مكون | P5 |
| P7 الجودة وRTL والاستيراد | أسبوع 21-24 | quality gate، RTL، fidelity contract | 90% مشكلات لها إصلاح، استيراد 99% | P6 |
| P8 الذكاء الاصطناعي المقيد | أسبوع 25-27 | Patch protocol + BYOK + تحقق | 95% patches صالحة | P7 |
| P9 النشر والمراجعة | أسبوع 28-31 | export نظيف + publish + comments | نشر بضغطة، 0 metadata | P7 |
| P10 Beta والإصدار | أسبوع 32-36 | onboarding، licensing، تحديثات | 50 مستخدمًا، crash-free ≥ 99% | P8, P9 |

**مضاعف الفريق:** الجدول لفريق 4-6 مهندسين. إذا كان التنفيذ فرديًا، اضرب المدة في 2.5، وأجّل P8 وP9 إلى ما بعد أول 20 مستخدمًا.

**التوازي المسموح:**

```text
P0 ──► P1 ──► P2 ──► P3 ──► P4 ──► P5 ──► P6 ──► P7 ──► P8
                    │                     │
                    └──► E2E/Harness      └──► P9 (export يمكن أن يبدأ بعد P2)
```

---

## 3. قرارات يجب إغلاقها قبل سطر كود

| ID | القرار | التوصية | يجب إغلاقه قبل |
|---|---|---|---|
| D-01 | Desktop أم Web | Desktop-first بـ Electron، core قابل للنقل | P3 |
| D-02 | نطاق v1 | Static HTML + Tailwind v4 فقط | P1 |
| D-03 | محرك Tailwind | adapter داخلي + CLI fallback | P2 |
| D-04 | نموذج المكونات | ملفات HTML + schema، توسيع وقت البناء | P6 |
| D-05 | مصدر الثيم | `@theme` | P5 |
| D-06 | الترخيص | hybrid | P10 |
| D-07 | AI | BYOK افتراضيًا + محلي اختياري | P8 |
| D-08 | التصدير | ملفات مباشرة + build | P9 |
| D-09 | التعاون | سحابة اختيارية بعد v1 | P9 |
| D-10 | RTL | تلقائي في v1 | P7 |
| D-11 | الاسم والعلامة | اسم مستقل، "for Tailwind CSS" وصفًا | P0 |
| D-12 | Plugins | بعد v1 | P10 |

**قاعدة:** كل قرار يُكتب في `docs/adr/NNNN-title.md` بالقالب: Context / Decision / Alternatives / Consequences. لا قرار شفهي.

---

## 4. مبدأ العمل اليومي

1. مهمة واحدة في وقت واحد. لا نبدأ مهمة قبل إغلاق سابقتها بـ commit.
2. TDD إلزامي: اختبار فاشل → تنفيذ أقل → اختبار ناجح → refactor.
3. Demo أسبوعي على مشروع حقيقي، لا على fixture مثالي.
4. سؤال الثقة كل أسبوع: "هل يمكن لمستخدم أن يفقد عمله الآن؟" إذا نعم، نوقف ونصلح.
5. أي ميزة تتجاوز 20% من ميزانية الأداء تُجمَّد حتى تُحل.

---

# المرحلة 0 — التأسيس والحوكمة (أسبوع 1-2)

**الهدف:** مستودع يمكن لأي مهندس جديد تشغيله في 5 دقائق، وبوابة جودة تمنع الانحدار قبل أول سطر ميزة.

**بوابة الدخول:** اعتماد D-02 وD-11 مبدئيًا.

**بوابة الخروج:** `npm run verify` و`npm run bench` تنجح محليًا وفي CI، وREADME يشرح التشغيل، وADRs الثلاثة الأولى موجودة.

---

### Task 0.1: توثيق القرارات المصيرية

**Files:**
- Create: `docs/adr/0001-product-form-desktop-first.md`
- Create: `docs/adr/0002-scope-static-html-tailwind4.md`
- Create: `docs/adr/0003-name-and-trademark.md`
- Modify: `docs/research/10-open-questions-and-validation.md:7-20`

**Interfaces:**
- Consumes: توصيات `docs/research/10-open-questions-and-validation.md`
- Produces: قرارات مُلزمة تُشار إليها المراحل اللاحقة بالمعرّف `D-01`..`D-11`

- [ ] **Step 1: أنشئ قالب ADR**

```markdown
# ADR-0001: شكل المنتج الأول

## Context
لماذا هذا القرار مطلوب الآن، وما البدائل المتاحة.

## Decision
Desktop-first بـ Electron، مع فصل النواة في packages مستقلة قابلة للنقل إلى Web.

## Alternatives
1. Web-first: وصول فوري لكن قيود ملفات وبناء محلي.
2. Tauri: حجم أصغر لكن WebView غير موحد.

## Consequences
- إيجابي: وصول كامل للملفات، Git، بناء محلي، ثبات Chromium.
- سلبي: حجم أكبر، تحديثات أصعب.
- المخاطر: تعقيد التعاون السحابي لاحقًا.
```

- [ ] **Step 2: اكتب القرارات الثلاثة وحدّث جدول الحالة**

في `docs/research/10-open-questions-and-validation.md` غيّر عمود الحالة من "توصية" إلى "مُعتمد" مع التاريخ واسم المُعتمد للقرارات D-01 وD-02 وD-11.

- [ ] **Step 3: Commit**

```bash
git add docs/adr docs/research/10-open-questions-and-validation.md
git commit -m "docs(adr): close D-01, D-02 and D-11 before implementation"
```

---

### Task 0.2: تنظيف المستودع وREADME حقيقي

**Files:**
- Modify: `README.md` (استبدال كامل)
- Create: `LICENSE`
- Create: `.editorconfig`
- Create: `.nvmrc`
- Create: `.gitignore`

**Interfaces:**
- Consumes: لا شيء
- Produces: تعليمات تشغيل موحدة يستخدمها CI وكل المهام

- [ ] **Step 1: اكتب README**

```markdown
# TalwindEditorPro

Visual editor for static HTML + Tailwind CSS v4 that preserves source bytes.

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

## Structure

- `docs/research/` — product and architecture research
- `docs/adr/` — binding decisions
- `docs/superpowers/plans/` — execution plans
- `packages/` — core, framework-free modules
- `apps/` — desktop shell and UI (from Phase 3)
- `spikes/` — historical experiments, not production code
```

- [ ] **Step 2: أضف `.nvmrc` و`.editorconfig` و`.gitignore`**

`.nvmrc`:

```text
22.22.0
```

`.editorconfig`:

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2
trim_trailing_whitespace = true
```

`.gitignore`:

```gitignore
node_modules/
dist/
out/
coverage/
*.log
.DS_Store
.tep/
bench/results.json
test-results/
playwright-report/
```

- [ ] **Step 3: أضف LICENSE**

إن لم يُحسم D-06 بعد، اكتب ملفًا صريحًا مؤقتًا:

```text
Copyright (c) 2026. All rights reserved.

License terms pending decision D-06. This file must be replaced
before any public distribution.
```

- [ ] **Step 4: Commit**

```bash
git add README.md LICENSE .editorconfig .nvmrc .gitignore
git commit -m "chore(repo): add real readme, editor config and root ignore rules"
```

---

### Task 0.3: Monorepo + TypeScript + Node test runner

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `packages/.gitkeep`
- Create: `apps/.gitkeep`
- Create: `scripts/verify.mjs`

**Interfaces:**
- Consumes: Node 22 type stripping (مثبت عمليًا في هذه البيئة)
- Produces: `npm test`, `npm run typecheck`, `npm run lint`, `npm run verify`

- [ ] **Step 1: اكتب `package.json` الجذري**

```json
{
  "name": "tep",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=22.22.0"
  },
  "workspaces": [
    "packages/*",
    "apps/*"
  ],
  "scripts": {
    "test": "node --test \"packages/**/test/**/*.test.ts\"",
    "typecheck": "tsc --noEmit -p tsconfig.json",
    "lint": "eslint .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "bench": "node scripts/bench.mjs",
    "verify": "npm run typecheck && npm run lint && npm test"
  },
  "devDependencies": {
    "@eslint/js": "9.39.5",
    "@types/node": "22.19.1",
    "eslint": "9.39.5",
    "globals": "17.13.0",
    "prettier": "3.9.10",
    "typescript": "5.9.3",
    "typescript-eslint": "8.72.1"
  }
}
```

- [ ] **Step 2: اكتب `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "erasableSyntaxOnly": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": [
    "packages/*/src/**/*.ts",
    "packages/*/test/**/*.ts"
  ]
}
```

ملاحظة: `tsconfig` في المرحلة 0 يغطي النواة فقط. ملفات React في `apps/` لها `tsconfig` منفصل يُضاف في P3.

- [ ] **Step 3: اكتب `scripts/verify.mjs`**

```js
import { spawnSync } from 'node:child_process';

const steps = [
  ['typecheck', 'npm', ['run', 'typecheck']],
  ['lint', 'npm', ['run', 'lint']],
  ['test', 'npm', ['test']],
];

let failed = false;
for (const [name, command, args] of steps) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    console.error(`verify: ${name} failed`);
    failed = true;
  }
}

process.exit(failed ? 1 : 0);
```

- [ ] **Step 4: ثبّت وتحقّق**

```bash
npm install
npm run typecheck
npm test
```

Expected: `typecheck` بلا أخطاء، و`test` ينجح بصفر ملفات (`# tests 0`).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json tsconfig.json scripts/verify.mjs packages/.gitkeep apps/.gitkeep
git commit -m "chore(build): bootstrap npm workspace with native TypeScript test runner"
```

---

### Task 0.4: ESLint وPrettier وCI

**Files:**
- Create: `eslint.config.js`
- Create: `.prettierrc.json`
- Create: `.prettierignore`
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `package.json` من Task 0.3
- Produces: `npm run lint` و`npm run format:check`، وحالة CI إلزامية للدمج

- [ ] **Step 1: اكتب `eslint.config.js`**

```js
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/dist/**', '**/out/**', 'spikes/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node } },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['error', { allow: ['error', 'warn'] }],
      'no-debugger': 'error',
    },
  },
);
```

- [ ] **Step 2: اكتب إعداد Prettier**

`.prettierrc.json`:

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "semi": true
}
```

`.prettierignore`:

```text
node_modules
dist
out
coverage
spikes
docs/research
bench/results.json
*.md
```

- [ ] **Step 3: اكتب CI**

```yaml
name: ci

on:
  push:
    branches: [main]
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22.22.0
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run format:check
      - run: npm test
      - run: npm run bench
      - run: node scripts/check-budget.mjs
```

`scripts/check-budget.mjs` يُنشأ في Task 0.7. إن أضفت CI قبلها، أضف السطر بعده.

- [ ] **Step 4: تحقق محليًا**

```bash
npm run lint
npm run format:check
```

Expected: كلاهما ينجح. إذا فشل التنسيق: `npm run format` ثم أعد الفحص.

- [ ] **Step 5: Commit**

```bash
git add eslint.config.js .prettierrc.json .prettierignore .github/workflows/ci.yml
git commit -m "chore(ci): enforce lint, format and tests on every push"
```

---

### Task 0.5: ترقية Spike إلى حزمة نواة إنتاجية

**Files:**
- Create: `packages/parser/package.json`
- Create: `packages/parser/src/index.ts`
- Create: `packages/parser/src/locate.ts`
- Create: `packages/parser/src/class-attr.ts`
- Create: `packages/parser/src/commands.ts`
- Create: `packages/parser/src/buffer.ts`
- Create: `packages/parser/src/ids.ts`
- Create: `packages/parser/test/commands.test.ts`
- Create: `packages/parser/test/ids.test.ts`
- Modify: `spikes/README.md` (إضافة سطر: تاريخي فقط، غير مستورد في الإنتاج)

**Interfaces:**
- Consumes: `parse5@8.0.1`، منطق `spikes/src/html-surgery.mjs`
- Produces:
  - `findElementById(html: string, editorId: string): Element | null`
  - `classTokens(html: string, editorId: string): string[]`
  - `addClass(html: string, editorId: string, token: string): string`
  - `removeClass(html: string, editorId: string, token: string): string`
  - `setClasses(html: string, editorId: string, next: readonly string[]): string`
  - `injectEditorIds(html: string, prefix?: string): { html: string; ids: EditorId[] }`
  - `stripEditorIds(html: string): string`
  - `class DocumentBuffer` مع `apply`, `undo`, `redo`, `text`, `entries`, `cursor`

**ملاحظة تحقق:** كل الكود والاختبارات في هذه المهمة شُغّلت فعليًا في بيئة Node 22.22 مع TS 5.9.3 و`parse5@8.0.1`، والنتيجة 13/13 اختبار ناجح، `tsc --noEmit` نظيف، وESLint نظيف.

- [ ] **Step 1: اكتب `packages/parser/package.json`**

```json
{
  "name": "@tep/parser",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "types": "./src/index.ts",
  "dependencies": {
    "parse5": "8.0.1"
  }
}
```

- [ ] **Step 2: اكتب `locate.ts`**

```ts
import { parse } from 'parse5';
import type { DefaultTreeAdapterTypes } from 'parse5';

export type Node = DefaultTreeAdapterTypes.Node;
export type Element = DefaultTreeAdapterTypes.Element;

function walk(node: Node, visit: (node: Node) => void): void {
  visit(node);
  const withChildren = node as { childNodes?: Node[]; content?: Node };
  for (const child of withChildren.childNodes ?? []) walk(child, visit);
  if (withChildren.content) walk(withChildren.content, visit);
}

export function isElement(node: Node): node is Element {
  const named = node as { tagName?: unknown };
  return typeof named.tagName === 'string';
}

export function findElementById(html: string, editorId: string): Element | null {
  const document = parse(html, { sourceCodeLocationInfo: true });
  let found: Element | null = null;
  walk(document as unknown as Node, (node) => {
    if (found || !isElement(node)) return;
    const attr = node.attrs.find((a) => a.name === 'data-tep-id');
    if (attr?.value === editorId) found = node;
  });
  return found;
}

export function attributeValue(element: Element, name: string): string | null {
  const attr = element.attrs.find((a) => a.name === name);
  return attr ? attr.value : null;
}
```

- [ ] **Step 3: اكتب `class-attr.ts`**

```ts
import type { Element } from './locate.ts';

export type ClassSpan = {
  attrStart: number;
  attrEnd: number;
  valueStart: number;
  valueEnd: number;
  quote: '"' | "'" | '';
  value: string;
};

export function readClassSpan(html: string, element: Element): ClassSpan | null {
  const loc = element.sourceCodeLocation?.attrs?.class;
  if (!loc) return null;
  const raw = html.slice(loc.startOffset, loc.endOffset);
  const eq = raw.indexOf('=');
  if (eq === -1) {
    return {
      attrStart: loc.startOffset,
      attrEnd: loc.endOffset,
      valueStart: loc.endOffset,
      valueEnd: loc.endOffset,
      quote: '',
      value: '',
    };
  }
  const after = raw.slice(eq + 1);
  const lead = after.match(/^\s*/)?.[0].length ?? 0;
  const rest = after.slice(lead);
  const first = rest[0];
  const quote: '"' | "'" | '' = first === '"' || first === "'" ? first : '';
  const valueStart = loc.startOffset + eq + 1 + lead + (quote ? 1 : 0);
  const valueEnd = quote ? loc.endOffset - 1 : loc.endOffset;
  return {
    attrStart: loc.startOffset,
    attrEnd: loc.endOffset,
    valueStart,
    valueEnd,
    quote,
    value: html.slice(valueStart, valueEnd),
  };
}

export function escapeForQuote(value: string, quote: '"' | "'" | ''): string {
  if (quote === '"') return value.replaceAll('"', '&quot;');
  if (quote === "'") return value.replaceAll("'", '&#39;');
  return value;
}

export function insertPointForAttribute(html: string, element: Element): number {
  const end = element.sourceCodeLocation?.startTag?.endOffset;
  if (!end) throw new Error('element has no start tag location');
  let i = end - 2;
  while (i > 0 && /\s/.test(html[i] ?? '')) i -= 1;
  return html[i] === '/' ? i : end - 1;
}
```

- [ ] **Step 4: اكتب `commands.ts`**

```ts
import type { DocumentBuffer } from './buffer.ts';
import { readClassSpan, escapeForQuote, insertPointForAttribute } from './class-attr.ts';
import { findElementById } from './locate.ts';

function splitTokens(value: string): string[] {
  return value.split(/\s+/).filter(Boolean);
}

function replace(text: string, start: number, end: number, next: string): string {
  return text.slice(0, start) + next + text.slice(end);
}

function removeAttribute(html: string, start: number, end: number): string {
  const from = /\s/.test(html[start - 1] ?? '') ? start - 1 : start;
  return replace(html, from, end, '');
}

export function classTokens(html: string, editorId: string): string[] {
  const element = findElementById(html, editorId);
  if (!element) throw new Error(`element not found: ${editorId}`);
  const span = readClassSpan(html, element);
  return span ? splitTokens(span.value) : [];
}

export function addClass(html: string, editorId: string, token: string): string {
  if (token.length === 0) return html;
  const element = findElementById(html, editorId);
  if (!element) throw new Error(`element not found: ${editorId}`);
  const span = readClassSpan(html, element);
  if (!span) {
    const at = insertPointForAttribute(html, element);
    return replace(html, at, at, ` class="${escapeForQuote(token, '"')}"`);
  }
  const current = splitTokens(span.value);
  if (current.includes(token)) return html;
  if (span.quote === '') {
    const next = [...current, token].join(' ');
    return replace(html, span.attrStart, span.attrEnd, `class="${escapeForQuote(next, '"')}"`);
  }
  const separator = span.value.length > 0 && !/\s$/.test(span.value) ? ' ' : '';
  return replace(html, span.valueEnd, span.valueEnd, `${separator}${token}`);
}

export function removeClass(html: string, editorId: string, token: string): string {
  const element = findElementById(html, editorId);
  if (!element) throw new Error(`element not found: ${editorId}`);
  const span = readClassSpan(html, element);
  if (!span) return html;
  if (span.quote === '') {
    const current = splitTokens(span.value);
    if (!current.includes(token)) return html;
    const next = current.filter((t) => t !== token);
    if (next.length === 0) return removeAttribute(html, span.attrStart, span.attrEnd);
    return replace(html, span.attrStart, span.attrEnd, `class="${escapeForQuote(next.join(' '), '"')}"`);
  }
  const value = span.value;
  const pattern = new RegExp(`(^|\\s+)${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s+|$)`);
  const match = pattern.exec(value);
  if (!match) return html;
  const tokenStart = match.index + (match[1] ?? '').length;
  const tokenEnd = tokenStart + token.length;
  let from: number;
  let to: number;
  if (match[2] && match[2].length > 0) {
    from = span.valueStart + tokenStart;
    to = span.valueStart + tokenEnd + match[2].length;
  } else {
    from = span.valueStart + match.index;
    to = span.valueStart + tokenEnd;
  }
  const removed = value.slice(0, from - span.valueStart) + value.slice(to - span.valueStart);
  if (removed.trim() === '') return removeAttribute(html, span.attrStart, span.attrEnd);
  return replace(html, from, to, '');
}

export function setClasses(html: string, editorId: string, next: readonly string[]): string {
  const element = findElementById(html, editorId);
  if (!element) throw new Error(`element not found: ${editorId}`);
  const value = next.filter(Boolean).join(' ');
  const span = readClassSpan(html, element);
  if (!span) {
    if (!value) return html;
    const at = insertPointForAttribute(html, element);
    return replace(html, at, at, ` class="${escapeForQuote(value, '"')}"`);
  }
  if (!value) return removeAttribute(html, span.attrStart, span.attrEnd);
  const quote = span.quote || '"';
  return replace(
    html,
    span.attrStart,
    span.attrEnd,
    `class=${quote}${escapeForQuote(value, quote)}${quote}`,
  );
}

export function applyEdit(buffer: DocumentBuffer, editorId: string, next: readonly string[]): boolean {
  return buffer.apply('class.change', (text) => setClasses(text, editorId, next));
}
```

- [ ] **Step 5: اكتب `buffer.ts`**

```ts
export type LedgerEntry = {
  label: string;
  before: string;
  after: string;
};

export type DocumentBufferOptions = {
  historyLimit?: number;
};

export class DocumentBuffer {
  #text: string;
  readonly id: string;
  readonly historyLimit: number;
  #entries: LedgerEntry[] = [];
  #cursor = 0;

  constructor(text: string, id = 'document', options: DocumentBufferOptions = {}) {
    this.#text = text;
    this.id = id;
    this.historyLimit = options.historyLimit ?? 500;
  }

  get text(): string {
    return this.#text;
  }

  get entries(): readonly LedgerEntry[] {
    return this.#entries;
  }

  get cursor(): number {
    return this.#cursor;
  }

  get dirty(): boolean {
    return this.#cursor !== 0;
  }

  apply(label: string, mutate: (text: string) => string): boolean {
    const before = this.#text;
    const after = mutate(before);
    if (after === before) return false;
    this.#entries = this.#entries.slice(0, this.#cursor);
    this.#entries.push({ label, before, after });
    if (this.#entries.length > this.historyLimit) this.#entries.shift();
    this.#cursor = this.#entries.length;
    this.#text = after;
    return true;
  }

  undo(): boolean {
    if (this.#cursor === 0) return false;
    this.#cursor -= 1;
    const entry = this.#entries[this.#cursor];
    if (!entry) return false;
    this.#text = entry.before;
    return true;
  }

  redo(): boolean {
    if (this.#cursor >= this.#entries.length) return false;
    const entry = this.#entries[this.#cursor];
    if (!entry) return false;
    this.#text = entry.after;
    this.#cursor += 1;
    return true;
  }
}
```

- [ ] **Step 6: اكتب `ids.ts`**

```ts
import { parse } from 'parse5';
import { isElement, type Element, type Node } from './locate.ts';

const SKIP_TAGS = new Set(['html', 'head', 'body', 'script', 'style', 'template']);

function walk(node: Node, visit: (node: Node) => void): void {
  visit(node);
  const withChildren = node as { childNodes?: Node[]; content?: Node };
  for (const child of withChildren.childNodes ?? []) walk(child, visit);
  if (withChildren.content) walk(withChildren.content, visit);
}

function startTagInsertOffset(html: string, element: Element): number | null {
  const end = element.sourceCodeLocation?.startTag?.endOffset;
  if (!end) return null;
  let i = end - 2;
  while (i > 0 && /\s/.test(html[i] ?? '')) i -= 1;
  return html[i] === '/' ? i : end - 1;
}

function applyInserts(html: string, inserts: { at: number; text: string }[]): string {
  const sorted = [...inserts].sort((a, b) => a.at - b.at);
  let out = '';
  let last = 0;
  for (const edit of sorted) {
    out += html.slice(last, edit.at) + edit.text;
    last = edit.at;
  }
  return out + html.slice(last);
}

function applyRemovals(html: string, removals: { start: number; end: number }[]): string {
  const sorted = [...removals].sort((a, b) => a.start - b.start);
  let out = '';
  let last = 0;
  for (const edit of sorted) {
    if (edit.start > last) out += html.slice(last, edit.start);
    last = Math.max(last, edit.end);
  }
  return out + html.slice(last);
}

export type EditorId = { id: string; tag: string };

export function injectEditorIds(html: string, prefix = 'e'): { html: string; ids: EditorId[] } {
  const document = parse(html, { sourceCodeLocationInfo: true });
  const inserts: { at: number; text: string }[] = [];
  const ids: EditorId[] = [];
  let counter = 0;
  walk(document as unknown as Node, (node) => {
    if (!isElement(node)) return;
    const tag = node.tagName.toLowerCase();
    if (SKIP_TAGS.has(tag)) return;
    if (!node.sourceCodeLocation?.startTag) return;
    const existing = node.attrs.find((a) => a.name === 'data-tep-id')?.value;
    let id = existing;
    if (!id) {
      counter += 1;
      id = `${prefix}${counter}`;
      const at = startTagInsertOffset(html, node);
      if (at === null) return;
      inserts.push({ at, text: ` data-tep-id="${id}"` });
    }
    ids.push({ id, tag });
  });
  return { html: applyInserts(html, inserts), ids };
}

export function stripEditorIds(html: string): string {
  const document = parse(html, { sourceCodeLocationInfo: true });
  const removals: { start: number; end: number }[] = [];
  walk(document as unknown as Node, (node) => {
    if (!isElement(node)) return;
    const loc = node.sourceCodeLocation?.attrs?.['data-tep-id'];
    if (!loc) return;
    const start = /\s/.test(html[loc.startOffset - 1] ?? '') ? loc.startOffset - 1 : loc.startOffset;
    removals.push({ start, end: loc.endOffset });
  });
  return applyRemovals(html, removals);
}
```

- [ ] **Step 7: اكتب `index.ts`**

```ts
export * from './locate.ts';
export * from './class-attr.ts';
export * from './buffer.ts';
export * from './commands.ts';
export * from './ids.ts';
```

- [ ] **Step 8: اكتب `packages/parser/test/commands.test.ts`**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { DocumentBuffer, addClass, classTokens, removeClass, setClasses } from '@tep/parser';

test('add and remove keep byte-exact text for quoted attributes', () => {
  const cases = [
    `<div class='a  b' data-tep-id="e1">x</div>`,
    `<div class="hero  mx-auto" data-tep-id="e1">x</div>`,
    `<div data-tep-id="e1">x</div>`,
  ];
  for (const source of cases) {
    const added = addClass(source, 'e1', 'py-24');
    assert.ok(added.includes('py-24'), source);
    assert.equal(removeClass(added, 'e1', 'py-24'), source, source);
  }
});

test('unquoted attributes keep their existing tokens when edited', () => {
  const source = `<div class=bold data-tep-id="e1">x</div>`;
  assert.equal(addClass(source, 'e1', 'py-24'), `<div class="bold py-24" data-tep-id="e1">x</div>`);
  assert.equal(removeClass(source, 'e1', 'bold'), `<div data-tep-id="e1">x</div>`);
  const bare = `<div class data-tep-id="e1">x</div>`;
  assert.equal(addClass(bare, 'e1', 'p-4'), `<div class="p-4" data-tep-id="e1">x</div>`);
});

test('removing a middle token collapses only its own whitespace run', () => {
  const source = `<div class="a b c" data-tep-id="e1">x</div>`;
  assert.equal(removeClass(source, 'e1', 'b'), `<div class="a c" data-tep-id="e1">x</div>`);
});

test('removing the last token preserves interior spacing', () => {
  const source = `<div class="hero  mx-auto py-24" data-tep-id="e1">x</div>`;
  assert.equal(
    removeClass(source, 'e1', 'py-24'),
    `<div class="hero  mx-auto" data-tep-id="e1">x</div>`,
  );
});

test('setClasses rewrites the value and keeps the original quote style', () => {
  const source = `<div class='p-4' data-tep-id="e1">x</div>`;
  assert.equal(
    setClasses(source, 'e1', ['p-6', 'flex']),
    `<div class='p-6 flex' data-tep-id="e1">x</div>`,
  );
  assert.equal(setClasses(source, 'e1', []), `<div data-tep-id="e1">x</div>`);
});

test('classTokens returns an empty list when the attribute is absent', () => {
  assert.deepEqual(classTokens(`<div data-tep-id="e1">x</div>`, 'e1'), []);
});

test('ledger undo returns to the original document after 999 edits', () => {
  const source = `<div class="p-4" data-tep-id="e1">x</div>`;
  const buffer = new DocumentBuffer(source, 'doc', { historyLimit: 1000 });
  for (let i = 0; i < 999; i += 1) {
    buffer.apply('toggle', (text) => {
      const current = classTokens(text, 'e1');
      const next = current.includes('flex')
        ? current.filter((t) => t !== 'flex')
        : [...current, 'flex'];
      return setClasses(text, 'e1', next);
    });
  }
  assert.ok(buffer.text.includes('flex'));
  while (buffer.undo());
  assert.equal(buffer.text, source);
});
```

- [ ] **Step 9: اكتب `packages/parser/test/ids.test.ts`**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { injectEditorIds, stripEditorIds } from '@tep/parser';

const samples = [
  `<!doctype html>\n<html><body><div class="a">x</div><img src="a.png"><br></body></html>`,
  `<div>\r\n  <span class=p-4>x</span>\r\n</div>`,
  `<div><script>const t = "<div class='p-4'>";</script><svg viewBox="0 0 1 1"><path d="M0 0"/></svg></div>`,
  `<div><span class="p-4">x</div>`,
];

for (const source of samples) {
  test(`inject then strip restores bytes: ${JSON.stringify(source.slice(0, 24))}`, () => {
    const injected = injectEditorIds(source);
    assert.ok(injected.ids.length > 0);
    assert.equal(stripEditorIds(injected.html), source);
  });
}

test('injection is idempotent and ids are stable', () => {
  const source = `<div><span>a</span><span>b</span></div>`;
  const first = injectEditorIds(source);
  const second = injectEditorIds(first.html);
  assert.deepEqual(second.ids, first.ids);
  assert.equal(second.html, first.html);
});

test('keeps an existing data-tep-id and removes it on strip', () => {
  const source = `<div data-tep-id="keep"><script>var x=1;</script></div>`;
  const result = injectEditorIds(source);
  assert.ok(result.ids.some((entry) => entry.id === 'keep'));
  assert.ok(result.html.includes('data-tep-id="keep"'));
  assert.equal(stripEditorIds(result.html), `<div><script>var x=1;</script></div>`);
});
```

- [ ] **Step 10: ثبّت وتحقّق**

```bash
npm install
npm run typecheck
npm test
```

Expected: 13 اختبارًا ناجحًا (7 في `commands.test.ts`، 6 في `ids.test.ts`). هذه النتيجة محققة مسبقًا في النموذج الأولي.

- [ ] **Step 11: Commit**

```bash
git add packages/parser package-lock.json spikes/README.md
git commit -m "feat(parser): promote byte-exact class editing and ledger from spikes"
```

---

### Task 0.6: Golden corpus وproperty tests

**Files:**
- Create: `scripts/generate-fixtures.mjs`
- Create: `packages/parser/test/fixtures/.gitkeep`
- Create: `packages/parser/test/golden.test.ts`
- Create: `packages/parser/test/fixtures/SOURCES.md`

**Interfaces:**
- Consumes: `@tep/parser` من Task 0.5
- Produces: مجموعة fixtures موحدة واختبار golden يمنع الانحدار البايتي

- [ ] **Step 1: اكتب مولّد الحالات الحدية**

```js
import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve('packages/parser/test/fixtures');
fs.mkdirSync(dir, { recursive: true });

const cases = {
  'doctype-case.html': `<!DOCTYPE html>\n<html><body><p class="a">x</p></body></html>\n`,
  'crlf.html': `<div class="a">\r\n  <span class="b">y</span>\r\n</div>\r\n`,
  'double-space.html': `<div class="hero  mx-auto">x</div>`,
  'single-quotes.html': `<div class='a b'>x</div>`,
  'unquoted.html': `<div class=a><span class=b>y</span></div>`,
  'bare-attribute.html': `<div class><span class>y</span></div>`,
  'empty-value.html': `<div class="">x</div>`,
  'comments.html': `<!-- top --><div class="a"><!-- inner -->x</div><!-- end -->`,
  'inline-script.html': `<div class="a"><script>const t = "<div class='b'>";</script></div>`,
  'inline-style.html': `<style>.a{color:red}</style><div class="a">x</div>`,
  'pre-block.html': `<pre class="a">  keep   this\n    spacing</pre>`,
  'svg.html': `<svg viewBox="0 0 10 10"><path class="a" d="M0 0 L10 10"/></svg>`,
  'void-elements.html': `<div><img src="a.png"><br><hr /><input type="text"></div>`,
  'malformed.html': `<div><span class="a">x</div>`,
  'attributes.html': `<div id="x" class="a" data-x="1" aria-label="z">x</div>`,
  'nested-same-class.html': `<div class="a"><div class="a"><div class="a">x</div></div></div>`,
  'entities.html': `<div class="a" title="a &amp; b">x &lt; y</div>`,
  'rtl.html': `<div dir="rtl" class="text-right">مرحبا</div>`,
};

for (const [name, content] of Object.entries(cases)) {
  fs.writeFileSync(path.join(dir, name), content);
}
console.error(`wrote ${Object.keys(cases).length} fixtures to ${dir}`);
```

- [ ] **Step 2: اكتب اختبار golden**

```ts
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { addClass, injectEditorIds, removeClass, stripEditorIds } from '@tep/parser';

const dir = path.resolve('packages/parser/test/fixtures');
const files = fs.readdirSync(dir).filter((name) => name.endsWith('.html'));

test('corpus has at least 18 fixtures', () => {
  assert.ok(files.length >= 18, `found ${files.length}`);
});

for (const file of files) {
  test(`golden round-trip: ${file}`, () => {
    const source = fs.readFileSync(path.join(dir, file), 'utf8');
    const injected = injectEditorIds(source);
    assert.equal(stripEditorIds(injected.html), source);

    const target = injected.ids.find((entry) => entry.tag !== 'html' && entry.tag !== 'body');
    if (!target) return;
    const added = addClass(injected.html, target.id, 'py-24');
    assert.ok(added.includes('py-24'));
    assert.equal(removeClass(added, target.id, 'py-24'), injected.html);
  });
}
```

- [ ] **Step 3: ولّد وشغّل**

```bash
node scripts/generate-fixtures.mjs
npm run typecheck
npm test
```

Expected: 18 ملف fixture على الأقل، وكل اختبارات golden ناجحة. إذا فشل fixture، أصلح الكود في `packages/parser/src` ولا تُعدّل الاختبار.

- [ ] **Step 4: أضف 32 ملفًا حقيقيًا**

اجمع 32 ملف HTML من مشاريع Tailwind حقيقية (قوالب مفتوحة المصدر أو مشاريعك). شروط القبول:
- 8 ملفات تحتوي `<script>` أو `<svg>`.
- 8 ملفات بترميز CRLF أو مسافات غير منتظمة.
- 8 ملفات كبيرة (> 50KB).
- 8 ملفات فيها classes ديناميكية أو قوالب.

سجّل مصدر كل ملف في `packages/parser/test/fixtures/SOURCES.md` (سطر لكل ملف: الاسم، المصدر، الترخيص، التاريخ).

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-fixtures.mjs packages/parser/test/golden.test.ts packages/parser/test/fixtures
git commit -m "test(parser): add golden corpus and byte-exact round-trip gate"
```

---

### Task 0.7: مقياس أداء أساسي وبوابة ميزانية

**Files:**
- Create: `scripts/bench.mjs`
- Create: `scripts/check-budget.mjs`
- Create: `bench/.gitignore`

**Interfaces:**
- Consumes: `@tep/parser`
- Produces: `npm run bench` يكتب `bench/results.json`، و`check-budget.mjs` يفشل عند تجاوز الميزانية

- [ ] **Step 1: اكتب `scripts/bench.mjs`**

```js
import fs from 'node:fs';
import { injectEditorIds, stripEditorIds, setClasses } from '../packages/parser/src/index.ts';

function makeHtml(cards = 1000) {
  const items = Array.from(
    { length: cards },
    (_, i) => `    <article class="card p-4 md:p-6" data-index="${i}">
      <h2 class="text-lg font-semibold">Card ${i}</h2>
      <p class="mt-2 text-sm text-gray-600">Body ${i}</p>
      <a class="mt-4 inline-flex rounded bg-blue-600 px-4 py-2 text-white" href="/card/${i}">Open</a>
    </article>`,
  ).join('\n');
  return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>Bench</title></head>\n<body><main class="mx-auto max-w-6xl p-6">\n${items}\n</main></body></html>`;
}

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)];
}

function stats(samples) {
  const total = samples.reduce((a, b) => a + b, 0);
  return {
    count: samples.length,
    totalMs: Number(total.toFixed(2)),
    avgMs: Number((total / samples.length).toFixed(3)),
    p50Ms: Number(percentile(samples, 50).toFixed(3)),
    p95Ms: Number(percentile(samples, 95).toFixed(3)),
    maxMs: Number(Math.max(...samples).toFixed(3)),
  };
}

const html = makeHtml(1000);
const injectStart = performance.now();
const injected = injectEditorIds(html);
const injectMs = performance.now() - injectStart;

const stripStart = performance.now();
const restored = stripEditorIds(injected.html);
const stripMs = performance.now() - stripStart;

const ids = injected.ids.slice(0, 200).map((entry) => entry.id);
const samples = [];
let current = injected.html;
for (const id of ids) {
  const start = performance.now();
  current = setClasses(current, id, ['p-4', 'flex', 'md:p-6']);
  samples.push(performance.now() - start);
}

const results = {
  runtime: {
    node: process.version,
    platform: `${process.platform}/${process.arch}`,
    date: new Date().toISOString(),
  },
  html: {
    sourceBytes: Buffer.byteLength(html),
    elements: injected.ids.length,
    injectMs: Number(injectMs.toFixed(2)),
    stripMs: Number(stripMs.toFixed(2)),
    restoredExactly: restored === html,
    setClasses: stats(samples),
  },
};

fs.mkdirSync('bench', { recursive: true });
fs.writeFileSync('bench/results.json', `${JSON.stringify(results, null, 2)}\n`);
console.error(JSON.stringify(results, null, 2));
```

- [ ] **Step 2: اكتب `scripts/check-budget.mjs`**

```js
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
```

- [ ] **Step 3: شغّل**

```bash
npm run bench
node scripts/check-budget.mjs
```

Expected: `restoredExactly: true`. `setClasses.p95Ms` في النموذج الأولي (JS) كان 110ms على 4003 عناصر؛ في TS مع 1000 بطاقة يجب أن يكون أقل. إذا تجاوز 200ms، سجّل الرقم في ADR جديد ولا تخفض الميزانية بصمت.

- [ ] **Step 4: Commit**

```bash
git add scripts/bench.mjs scripts/check-budget.mjs bench/.gitignore
git commit -m "perf(parser): add benchmark and enforce edit budget in ci"
```

---

### بوابة الخروج من P0

- [ ] `npm run verify` ينجح.
- [ ] `npm run bench` و`node scripts/check-budget.mjs` ينجحان.
- [ ] CI أخضر على `main`.
- [ ] `docs/adr/0001`..`0003` معتمدة.
- [ ] README يشرح التشغيل في أقل من 40 سطرًا.
- [ ] `git status` نظيف بلا `bench/results.json` متعقّب.

**لا تنتقل إلى P1 قبل اكتمال كل ما سبق.**

---

# المرحلة 1 — نواة المستند (أسبوع 3-5)

**الهدف:** تعديل أي عنصر في أي HTML دون فقدان بايت واحد، مع Ledger وUndo/Redo وسجل سببي وفهرس مستند لا يعيد التحليل في كل تعديل.

**بوابة الدخول:** خروج P0.

**بوابة الخروج:** 50 ملفًا في golden corpus، 0 انحراف بايتي، 999 عملية undo تُعيد النص الأصلي، وفهرس مستند دائم يقلل زمن التعديل على ملف 321KB تحت 30ms.

---

### Task 1.1: فهرس المستند الدائم

**Files:**
- Create: `packages/parser/src/index-map.ts`
- Create: `packages/parser/test/index-map.test.ts`
- Modify: `packages/parser/src/index.ts`

**Interfaces:**
- Consumes: `parse5` + `sourceCodeLocationInfo`
- Produces:
  - `type IndexedElement = { path: string; editorId: string | null; tag: string; start: number; end: number; classValue: string | null }`
  - `type DocumentIndex = { elements: IndexedElement[]; byPath: Map<string, IndexedElement>; byId: Map<string, IndexedElement> }`
  - `indexDocument(html: string): DocumentIndex`

**قرار التصميم:** المسار بنيوي (`0/1/0`) لا يعتمد على `data-tep-id`، لأن المعرفات تُحقن وتُزال. المسار يبقى صالحًا عند إدخال عناصر *بعد* الهدف، وهو ما نحتاجه في التحرير المتسلسل.

- [ ] **Step 1: اكتب الاختبار الفاشل**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { indexDocument } from '@tep/parser';

test('index exposes stable structural paths', () => {
  const html = `<html><body><div class="a"><p>x</p><p>y</p></div><img src="x"></body></html>`;
  const index = indexDocument(html);
  assert.ok(index.elements.length >= 5);
  assert.equal(index.byPath.get('0/1/0')?.tag, 'div');
  assert.equal(index.byPath.get('0/1/0/1')?.tag, 'p');
  assert.equal(index.byPath.get('0/1/0')?.classValue, 'a');
});

test('index survives insertion after the target', () => {
  const before = indexDocument(`<html><body><div id="a">x</div><section></section></body></html>`);
  const after = indexDocument(
    `<html><body><div id="a">x</div><section><div>new</div></section></body></html>`,
  );
  assert.equal(before.byPath.get('0/1/0')?.tag, after.byPath.get('0/1/0')?.tag);
  assert.equal(before.byPath.get('0/1/2')?.tag, after.byPath.get('0/1/2')?.tag);
});
```

- [ ] **Step 2: شغّل وتأكد من الفشل**

```bash
npm test
```

Expected: FAIL مع `indexDocument is not a function` أو خطأ استيراد.

- [ ] **Step 3: اكتب التنفيذ**

```ts
import { parse } from 'parse5';
import { isElement, type Element, type Node } from './locate.ts';

export type IndexedElement = {
  path: string;
  editorId: string | null;
  tag: string;
  start: number;
  end: number;
  classValue: string | null;
};

export type DocumentIndex = {
  elements: IndexedElement[];
  byPath: Map<string, IndexedElement>;
  byId: Map<string, IndexedElement>;
};

function walkElements(
  node: Node,
  visit: (element: Element, path: string) => void,
  base: string,
): void {
  const children = (node as { childNodes?: Node[] }).childNodes ?? [];
  let elementIndex = -1;
  for (const child of children) {
    if (!isElement(child)) continue;
    elementIndex += 1;
    const path = base === '' ? String(elementIndex) : `${base}/${elementIndex}`;
    visit(child, path);
    walkElements(child, visit, path);
    const templateContent = (child as { content?: Node }).content;
    if (templateContent) walkElements(templateContent, visit, `${path}#`);
  }
}

export function indexDocument(html: string): DocumentIndex {
  const document = parse(html, { sourceCodeLocationInfo: true });
  const elements: IndexedElement[] = [];
  const byPath = new Map<string, IndexedElement>();
  const byId = new Map<string, IndexedElement>();
  walkElements(
    document as unknown as Node,
    (element, path) => {
      const editorId = element.attrs.find((a) => a.name === 'data-tep-id')?.value ?? null;
      const classValue = element.attrs.find((a) => a.name === 'class')?.value ?? null;
      const entry: IndexedElement = {
        path,
        editorId,
        tag: element.tagName.toLowerCase(),
        start: element.sourceCodeLocation?.startTag?.startOffset ?? -1,
        end: element.sourceCodeLocation?.startTag?.endOffset ?? -1,
        classValue,
      };
      elements.push(entry);
      byPath.set(path, entry);
      if (editorId) byId.set(editorId, entry);
    },
    '',
  );
  return { elements, byPath, byId };
}
```

- [ ] **Step 4: أضف التصدير**

في `packages/parser/src/index.ts`:

```ts
export * from './index-map.ts';
```

- [ ] **Step 5: شغّل ومرّر**

```bash
npm run typecheck
npm test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/parser/src/index-map.ts packages/parser/src/index.ts packages/parser/test/index-map.test.ts
git commit -m "feat(parser): add stable structural document index"
```

---

### Task 1.2: إزاحة الفهرس بدل إعادة التحليل

**Files:**
- Modify: `packages/parser/src/index-map.ts`
- Modify: `packages/parser/src/commands.ts`
- Create: `packages/parser/test/incremental.test.ts`

**Interfaces:**
- Consumes: `DocumentIndex`
- Produces:
  - `type TextEdit = { start: number; end: number; text: string }`
  - `shiftIndex(index: DocumentIndex, edit: TextEdit): DocumentIndex`
  - `type EditResult = { html: string; edit: TextEdit }`
  - `addClassWithEdit(html, editorId, token): EditResult` و`setClassesWithEdit(html, editorId, next): EditResult`

**قاعدة الدقة:** `shiftIndex` صحيح فقط عندما يكون التعديل داخل نطاق عنصر واحد ولا يضيف/يحذف عناصر. أي تعديل بنيوي يعيد `indexDocument`. لا تحاول أن تكون ذكيًا أكثر من ذلك.

- [ ] **Step 1: اكتب الاختبار الفاشل**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { addClassWithEdit, indexDocument, shiftIndex } from '@tep/parser';

test('shiftIndex keeps later offsets valid after an insertion', () => {
  const html = `<div data-tep-id="e1">x</div><p data-tep-id="e2">y</p>`;
  const index = indexDocument(html);
  const result = addClassWithEdit(html, 'e1', 'p-4');
  const shifted = shiftIndex(index, result.edit);
  const p = shifted.byId.get('e2');
  assert.ok(p);
  assert.equal(result.html.slice(p.start, p.end).startsWith('<p'), true);
});

test('shiftIndex is identity for no-op edits', () => {
  const html = `<div class="p-4" data-tep-id="e1">x</div>`;
  const index = indexDocument(html);
  const result = addClassWithEdit(html, 'e1', 'p-4');
  assert.equal(result.html, html);
  assert.deepEqual(shiftIndex(index, result.edit).elements, index.elements);
});
```

- [ ] **Step 2: شغّل وتأكد من الفشل**

```bash
npm test
```

Expected: FAIL لأن `shiftIndex` و`addClassWithEdit` غير موجودتين.

- [ ] **Step 3: أضف `shiftIndex` إلى `index-map.ts`**

```ts
export type TextEdit = { start: number; end: number; text: string };

export function shiftIndex(index: DocumentIndex, edit: TextEdit): DocumentIndex {
  const delta = edit.text.length - (edit.end - edit.start);
  if (delta === 0) return index;
  const elements = index.elements.map((entry) => {
    if (entry.start >= edit.end) {
      return { ...entry, start: entry.start + delta, end: entry.end + delta };
    }
    return entry;
  });
  const byPath = new Map(elements.map((entry) => [entry.path, entry]));
  const byId = new Map(
    elements
      .filter((entry): entry is IndexedElement & { editorId: string } => Boolean(entry.editorId))
      .map((entry) => [entry.editorId, entry]),
  );
  return { elements, byPath, byId };
}
```

- [ ] **Step 4: أضف دوال `*WithEdit` إلى `commands.ts`**

```ts
export type EditResult = { html: string; edit: { start: number; end: number; text: string } };

function noopEdit(html: string): EditResult {
  return { html, edit: { start: 0, end: 0, text: '' } };
}

export function addClassWithEdit(html: string, editorId: string, token: string): EditResult {
  const element = findElementById(html, editorId);
  if (!element) throw new Error(`element not found: ${editorId}`);
  const span = readClassSpan(html, element);
  if (!span) {
    const at = insertPointForAttribute(html, element);
    const text = ` class="${escapeForQuote(token, '"')}"`;
    return { html: replace(html, at, at, text), edit: { start: at, end: at, text } };
  }
  const current = splitTokens(span.value);
  if (current.includes(token)) return noopEdit(html);
  if (span.quote === '') {
    const next = `class="${escapeForQuote([...current, token].join(' '), '"')}"`;
    return {
      html: replace(html, span.attrStart, span.attrEnd, next),
      edit: { start: span.attrStart, end: span.attrEnd, text: next },
    };
  }
  const separator = span.value.length > 0 && !/\s$/.test(span.value) ? ' ' : '';
  const text = `${separator}${token}`;
  return {
    html: replace(html, span.valueEnd, span.valueEnd, text),
    edit: { start: span.valueEnd, end: span.valueEnd, text },
  };
}

export function setClassesWithEdit(html: string, editorId: string, next: readonly string[]): EditResult {
  const element = findElementById(html, editorId);
  if (!element) throw new Error(`element not found: ${editorId}`);
  const value = next.filter(Boolean).join(' ');
  const span = readClassSpan(html, element);
  if (!span) {
    if (!value) return noopEdit(html);
    const at = insertPointForAttribute(html, element);
    const text = ` class="${escapeForQuote(value, '"')}"`;
    return { html: replace(html, at, at, text), edit: { start: at, end: at, text } };
  }
  if (!value) {
    const from = /\s/.test(html[span.attrStart - 1] ?? '') ? span.attrStart - 1 : span.attrStart;
    return {
      html: replace(html, from, span.attrEnd, ''),
      edit: { start: from, end: span.attrEnd, text: '' },
    };
  }
  const quote = span.quote || '"';
  const text = `class=${quote}${escapeForQuote(value, quote)}${quote}`;
  return {
    html: replace(html, span.attrStart, span.attrEnd, text),
    edit: { start: span.attrStart, end: span.attrEnd, text },
  };
}
```

- [ ] **Step 5: شغّل ومرّر**

```bash
npm run typecheck
npm test
```

- [ ] **Step 6: Commit**

```bash
git add packages/parser/src/index-map.ts packages/parser/src/commands.ts packages/parser/test/incremental.test.ts
git commit -m "feat(parser): shift document index instead of reparsing after edits"
```

---

### Task 1.3: سجل سببي (Causal Ledger)

**Files:**
- Create: `packages/parser/src/ledger.ts`
- Create: `packages/parser/test/ledger.test.ts`
- Modify: `packages/parser/src/buffer.ts`
- Modify: `packages/parser/src/index.ts`

**Interfaces:**
- Consumes: `DocumentBuffer`
- Produces:
  - `type EditSource = 'control' | 'class-tree' | 'code' | 'ai' | 'import'`
  - `type CausalMeta = { id: string; source: EditSource; elementId: string | null; at: string }`
  - `buffer.applyCausal({ source, label, elementId?, mutate })` (method عبر subclass وليس monkey-patch)
  - `explain(buffer, elementId): CausalEntry[]`

**قرار التصميم:** لا نستخدم `declare module` ولا monkey-patching، لأن `erasableSyntaxOnly` وقاعدة "لا `any`" يدفعان إلى وراثة صريحة. الوراثة أبسط وأسهل في الاختبار.

- [ ] **Step 1: وسّع `LedgerEntry` في `buffer.ts`**

```ts
export type CausalMeta = {
  id: string;
  source: string;
  elementId: string | null;
  at: string;
};

export type LedgerEntry = {
  label: string;
  before: string;
  after: string;
  meta?: CausalMeta;
};
```

- [ ] **Step 2: اكتب الاختبار الفاشل**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { CausalBuffer, addClass, explain } from '@tep/parser';

test('ledger records source and can explain an element', () => {
  const buffer = new CausalBuffer(`<div data-tep-id="e1">x</div>`);
  const applied = buffer.applyCausal({
    source: 'control',
    label: 'Add padding',
    elementId: 'e1',
    mutate: (text) => addClass(text, 'e1', 'p-4'),
  });
  assert.equal(applied, true);
  const history = explain(buffer, 'e1');
  assert.equal(history.length, 1);
  assert.equal(history[0]?.source, 'control');
  assert.equal(history[0]?.label, 'Add padding');
  assert.equal(history[0]?.elementId, 'e1');
  assert.equal(history[0]?.reversible, true);
});

test('undo preserves the causal log and redo restores it', () => {
  const source = `<div data-tep-id="e1">x</div>`;
  const buffer = new CausalBuffer(source);
  buffer.applyCausal({ source: 'ai', label: 'Add flex', elementId: 'e1', mutate: (t) => addClass(t, 'e1', 'flex') });
  assert.equal(buffer.undo(), true);
  assert.equal(buffer.text, source);
  assert.equal(explain(buffer, 'e1').length, 1);
  assert.equal(buffer.redo(), true);
  assert.ok(buffer.text.includes('flex'));
});
```

- [ ] **Step 3: نفّذ `ledger.ts`**

```ts
import { DocumentBuffer, type CausalMeta, type LedgerEntry } from './buffer.ts';

export type EditSource = 'control' | 'class-tree' | 'code' | 'ai' | 'import';

export type CausalEntry = LedgerEntry & CausalMeta & { reversible: boolean };

let sequence = 0;

export class CausalBuffer extends DocumentBuffer {
  applyCausal(input: {
    source: EditSource;
    label: string;
    elementId?: string;
    mutate: (text: string) => string;
  }): boolean {
    const applied = this.apply(input.label, input.mutate);
    if (!applied) return false;
    const entry = this.entries.at(-1);
    if (!entry) return false;
    sequence += 1;
    const meta: CausalMeta = {
      id: `c${sequence}`,
      source: input.source,
      elementId: input.elementId ?? null,
      at: new Date().toISOString(),
    };
    Object.assign(entry, { meta });
    return true;
  }
}

export function explain(buffer: DocumentBuffer, elementId: string): CausalEntry[] {
  return buffer.entries
    .filter((entry): entry is LedgerEntry & { meta: CausalMeta } => Boolean(entry.meta))
    .filter((entry) => entry.meta.elementId === elementId)
    .map((entry) => ({ ...entry, ...entry.meta, reversible: true }));
}
```

ملاحظة: `Object.assign(entry, ...)` يعمل لأن `entries` يعيد مراجع الكائنات الفعلية. إن أردت عدم الاعتماد على ذلك، أضف `annotate(index, meta)` إلى `DocumentBuffer` واستخدمها. الاختبار يحدد السلوك المطلوب، والتنفيذ قابل للتبديل.

- [ ] **Step 4: أضف التصدير**

```ts
export * from './ledger.ts';
```

- [ ] **Step 5: شغّل ومرّر**

```bash
npm run typecheck
npm test
```

- [ ] **Step 6: Commit**

```bash
git add packages/parser/src/ledger.ts packages/parser/src/buffer.ts packages/parser/src/index.ts packages/parser/test/ledger.test.ts
git commit -m "feat(parser): add causal edit ledger with explain support"
```

---

### Task 1.4: Fuzz harness

**Files:**
- Create: `scripts/fuzz.mjs`
- Create: `packages/parser/test/fuzz.test.ts`

**Interfaces:**
- Consumes: `@tep/parser`
- Produces: `randomHtml(seed: number): string` واختبار يمنع أي crash أو انحراف بايتي على 200 مستند عشوائي

- [ ] **Step 1: اكتب المولّد**

```js
const TAGS = ['div', 'span', 'p', 'section', 'article', 'a', 'img', 'br', 'svg', 'pre'];
const ATTRS = ['class="a b"', "class='c  d'", 'class=e', 'class', '', 'id="x"', 'data-x="1"'];

export function randomHtml(seed) {
  let state = seed >>> 0;
  const next = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const depth = 2 + Math.floor(next() * 4);
  function node(level) {
    if (level > depth) return 'text';
    const tag = TAGS[Math.floor(next() * TAGS.length)];
    const attr = ATTRS[Math.floor(next() * ATTRS.length)];
    const open = `<${tag}${attr ? ` ${attr}` : ''}>`;
    if (tag === 'img' || tag === 'br') return open;
    const count = Math.floor(next() * 3);
    const children = Array.from({ length: count }, () => node(level + 1)).join('');
    return `${open}${children}</${tag}>`;
  }
  return `<!doctype html><html><body>${node(0)}</body></html>`;
}
```

- [ ] **Step 2: اكتب الاختبار**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { addClass, injectEditorIds, removeClass, stripEditorIds } from '@tep/parser';
import { randomHtml } from '../../../scripts/fuzz.mjs';

test('fuzz: inject, edit and strip never corrupt bytes', () => {
  for (let seed = 1; seed <= 200; seed += 1) {
    const source = randomHtml(seed);
    const injected = injectEditorIds(source);
    assert.equal(stripEditorIds(injected.html), source, `seed ${seed} strip`);
    const target = injected.ids.find((entry) => entry.tag !== 'html' && entry.tag !== 'body');
    if (!target) continue;
    const added = addClass(injected.html, target.id, 'p-4');
    assert.equal(removeClass(added, target.id, 'p-4'), injected.html, `seed ${seed} round-trip`);
  }
});
```

- [ ] **Step 3: شغّل**

```bash
npm run typecheck
npm test
```

Expected: PASS لـ 200 seed. إذا فشل seed، أصلح `commands.ts` أو `ids.ts` ولا تُعدّل الاختبار.

- [ ] **Step 4: Commit**

```bash
git add scripts/fuzz.mjs packages/parser/test/fuzz.test.ts
git commit -m "test(parser): fuzz byte-exact editing across 200 generated documents"
```

---

### Task 1.5: قياس أثر الفهرس

**Files:**
- Modify: `scripts/bench.mjs`
- Modify: `scripts/check-budget.mjs`

**Interfaces:**
- Consumes: `indexDocument`, `shiftIndex`, `addClassWithEdit`
- Produces: رقم `indexedEdit.p95Ms` في `bench/results.json` وميزانية 30ms

- [ ] **Step 1: أضف قياس الفهرس إلى `scripts/bench.mjs`**

```js
import { indexDocument, shiftIndex, addClassWithEdit } from '../packages/parser/src/index.ts';

const indexedSamples = [];
let index = indexDocument(injected.html);
let indexedText = injected.html;
for (let i = 0; i < ids.length; i += 1) {
  const id = ids[i];
  const start = performance.now();
  const result = addClassWithEdit(indexedText, id, `gap-${(i % 8) + 1}`);
  indexedText = result.html;
  index = shiftIndex(index, result.edit);
  indexedSamples.push(performance.now() - start);
}

results.html.indexedEdit = stats(indexedSamples);
```

- [ ] **Step 2: أضف الميزانية إلى `scripts/check-budget.mjs`**

```js
const indexedP95 = results.html.indexedEdit?.p95Ms ?? Number.POSITIVE_INFINITY;
const indexedBudget = Number(process.env.TEP_INDEXED_BUDGET_MS ?? 30);
if (indexedP95 > indexedBudget) {
  console.error(`bench: indexed edit p95 ${indexedP95}ms exceeds ${indexedBudget}ms`);
  process.exit(1);
}
console.error(`bench: indexed p95 ${indexedP95}ms`);
```

- [ ] **Step 3: شغّل**

```bash
npm run bench
node scripts/check-budget.mjs
```

Expected: `indexedEdit.p95Ms` أقل بكثير من `setClasses.p95Ms`. إن لم يكن أقل من 30ms، فالسبب أن `addClassWithEdit` ما زال يستدعي `findElementById` (parse كامل). عندها استبدل البحث بـ `byId` من الفهرس داخل حلقة القياس، وحدّث الاختبار ليقيس ذلك المسار.

- [ ] **Step 4: Commit**

```bash
git add scripts/bench.mjs scripts/check-budget.mjs
git commit -m "perf(parser): measure indexed edits and cap them at 30ms"
```

---

### بوابة الخروج من P1

- [ ] 50 ملفًا في corpus (18 مولّد + 32 حقيقي).
- [ ] `npm test` ينجح مع fuzz 200 seed.
- [ ] `npm run bench` و`check-budget` ينجحان.
- [ ] `explain()` يعيد سلسلة سببية بعد undo/redo.
- [ ] `npm run verify` أخضر.

---

# المرحلة 2 — محرك Tailwind (أسبوع 6-7)

**الهدف:** compile برمجي سريع، candidate set صريحة، theme parser، وجدولة build.

**بوابة الدخول:** خروج P1، واعتماد D-03.

**بوابة الخروج:** build بارد < 300ms، كل class مستخدم له rule، `@theme` يعمل، و5 تحديثات متتابعة تندمج في build واحد.

---

### Task 2.1: غلاف المترجم

**Files:**
- Create: `packages/tailwind/package.json`
- Create: `packages/tailwind/src/compiler.ts`
- Create: `packages/tailwind/src/index.ts`
- Create: `packages/tailwind/test/compiler.test.ts`

**Interfaces:**
- Consumes: `@tailwindcss/node@4.3.3`
- Produces:
  - `createCompiler(entryCss: string, base: string): Promise<Compiler>`
  - `Compiler.build(candidates: Iterable<string>): CompileResult`
  - `type CompileResult = { css: string; rules: number; durationMs: number }`

**تحقق مسبق:** شُغّل `createCompiler + build(['p-4'])` في هذه البيئة وأعاد CSS يحتوي `.p-4`، وزمن بارد ~53ms.

- [ ] **Step 1: `package.json`**

```json
{
  "name": "@tep/tailwind",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "types": "./src/index.ts",
  "dependencies": {
    "@tailwindcss/node": "4.3.3",
    "tailwindcss": "4.3.3"
  }
}
```

- [ ] **Step 2: اختبار فاشل**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { createCompiler } from '@tep/tailwind';

test('compiles explicit candidates including dynamic ones', async () => {
  const compiler = await createCompiler('@import "tailwindcss";', process.cwd());
  const result = compiler.build(['flex', 'bg-red-500']);
  assert.ok(result.css.includes('.flex'));
  assert.ok(result.css.includes('bg-red-500'));
  assert.ok(result.rules > 0);
  assert.ok(result.durationMs >= 0);
});

test('cold compile stays under 300ms on this machine', async () => {
  const started = performance.now();
  const compiler = await createCompiler('@import "tailwindcss";', process.cwd());
  compiler.build(['p-4']);
  const elapsed = performance.now() - started;
  assert.ok(elapsed < 300, `cold compile took ${elapsed.toFixed(0)}ms`);
});
```

- [ ] **Step 3: نفّذ**

```ts
import { compile } from '@tailwindcss/node';

export type CompileResult = {
  css: string;
  rules: number;
  durationMs: number;
};

export type Compiler = {
  build(candidates: Iterable<string>): CompileResult;
  dispose(): void;
};

export async function createCompiler(entryCss: string, base: string): Promise<Compiler> {
  const internal = await compile(entryCss, { base, onDependency() {} });
  return {
    build(candidates) {
      const started = performance.now();
      const list = [...new Set(candidates)];
      const css = internal.build(list);
      return {
        css,
        rules: (css.match(/\{/g) ?? []).length,
        durationMs: performance.now() - started,
      };
    },
    dispose() {
      internal.build([]);
    },
  };
}
```

- [ ] **Step 4: `index.ts`**

```ts
export * from './compiler.ts';
```

- [ ] **Step 5: شغّل**

```bash
npm install
npm run typecheck
npm test
```

- [ ] **Step 6: Commit**

```bash
git add packages/tailwind package-lock.json
git commit -m "feat(tailwind): add programmatic compiler adapter"
```

---

### Task 2.2: جامع المرشحات

**Files:**
- Create: `packages/tailwind/src/candidates.ts`
- Create: `packages/tailwind/test/candidates.test.ts`

**Interfaces:**
- Consumes: `@tep/parser` (`indexDocument`)
- Produces:
  - `collectFromHtml(html: string): Set<string>`
  - `mergeCandidates(...sets: Iterable<string>[]): Set<string>`

- [ ] **Step 1: اختبار فاشل**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { collectFromHtml, mergeCandidates } from '@tep/tailwind';

test('collects classes from class attributes only once', () => {
  const found = collectFromHtml(
    `<div class="p-4  flex p-4"><span class="md:hover:bg-red-500">x</span></div>`,
  );
  assert.deepEqual([...found].sort(), ['flex', 'md:hover:bg-red-500', 'p-4']);
});

test('mergeCandidates deduplicates across sources', () => {
  const merged = mergeCandidates(['a', 'b'], ['b', 'c']);
  assert.deepEqual([...merged].sort(), ['a', 'b', 'c']);
});
```

- [ ] **Step 2: نفّذ**

```ts
import { indexDocument } from '@tep/parser';

export function collectFromHtml(html: string): Set<string> {
  const candidates = new Set<string>();
  for (const element of indexDocument(html).elements) {
    if (!element.classValue) continue;
    for (const token of element.classValue.split(/\s+/)) {
      if (token) candidates.add(token);
    }
  }
  return candidates;
}

export function mergeCandidates(...sets: Iterable<string>[]): Set<string> {
  const merged = new Set<string>();
  for (const set of sets) for (const value of set) merged.add(value);
  return merged;
}
```

- [ ] **Step 3: صدّر**

```ts
export * from './candidates.ts';
```

- [ ] **Step 4: شغّل**

```bash
npm run typecheck
npm test
```

- [ ] **Step 5: Commit**

```bash
git add packages/tailwind/src/candidates.ts packages/tailwind/src/index.ts packages/tailwind/test/candidates.test.ts
git commit -m "feat(tailwind): collect explicit candidates from document index"
```

---

### Task 2.3: Parser للثيم `@theme`

**Files:**
- Create: `packages/tailwind/src/theme.ts`
- Create: `packages/tailwind/test/theme.test.ts`

**Interfaces:**
- Produces:
  - `type ThemeToken = { namespace: string; name: string; value: string }`
  - `parseTheme(css: string): ThemeToken[]`

**حد معلن:** الـ regex لا يفهم `@theme inline` ولا المتغيرات المتداخلة. Phase 5 يستبدله بمحلل CSS حقيقي (`postcss@8.5.32`). هنا نحتاج استخراج القيم فقط.

- [ ] **Step 1: اختبار فاشل**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { parseTheme } from '@tep/tailwind';

test('parses @theme custom properties', () => {
  const tokens = parseTheme(`@theme {
    --color-brand-500: oklch(0.62 0.19 259);
    --radius-card: 1rem;
  }`);
  assert.deepEqual(tokens, [
    { namespace: 'color', name: 'brand-500', value: 'oklch(0.62 0.19 259)' },
    { namespace: 'radius', name: 'card', value: '1rem' },
  ]);
});

test('returns an empty list when there is no @theme block', () => {
  assert.deepEqual(parseTheme('@import "tailwindcss";'), []);
});
```

- [ ] **Step 2: نفّذ**

```ts
export type ThemeToken = { namespace: string; name: string; value: string };

export function parseTheme(css: string): ThemeToken[] {
  const tokens: ThemeToken[] = [];
  const block = /@theme\s*\{([^}]*)\}/.exec(css);
  if (!block) return tokens;
  const body = block[1] ?? '';
  for (const match of body.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    const raw = match[1] ?? '';
    const value = (match[2] ?? '').trim();
    const dash = raw.indexOf('-');
    if (dash === -1) continue;
    tokens.push({ namespace: raw.slice(0, dash), name: raw.slice(dash + 1), value });
  }
  return tokens;
}
```

- [ ] **Step 3: شغّل**

```bash
npm run typecheck
npm test
```

- [ ] **Step 4: Commit**

```bash
git add packages/tailwind/src/theme.ts packages/tailwind/src/index.ts packages/tailwind/test/theme.test.ts
git commit -m "feat(tailwind): parse @theme tokens"
```

---

### Task 2.4: الجدولة واكتشاف وضع البناء

**Files:**
- Create: `packages/tailwind/src/scheduler.ts`
- Create: `packages/tailwind/src/detect.ts`
- Create: `packages/tailwind/test/scheduler.test.ts`
- Create: `packages/tailwind/test/detect.test.ts`

**Interfaces:**
- Produces:
  - `createScheduler(compiler, { debounceMs?: number }, timer?): Scheduler`
  - `Scheduler.update(candidates, onResult)`, `flush()`, `cancel()`
  - `detectMode(projectRoot: string): Promise<'builtin' | 'external' | 'unknown'>`

- [ ] **Step 1: اختبار الجدولة**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { createScheduler } from '@tep/tailwind';

test('scheduler debounces bursts into one build', async () => {
  let builds = 0;
  const scheduler = createScheduler(
    {
      build: (candidates) => ({ css: [...candidates].join(' '), rules: 1, durationMs: 0 }),
      dispose() {},
    },
    { debounceMs: 10 },
  );
  let last = '';
  for (let i = 0; i < 5; i += 1) {
    scheduler.update([`p-${i}`], (result) => {
      builds += 1;
      last = result.css;
    });
  }
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(builds, 1);
  assert.equal(last, 'p-4');
});

test('flush runs the pending build immediately', () => {
  let builds = 0;
  const scheduler = createScheduler(
    { build: () => ({ css: '', rules: 0, durationMs: 0 }), dispose() {} },
    { debounceMs: 1000 },
  );
  scheduler.update(['p-1'], () => {
    builds += 1;
  });
  scheduler.flush();
  assert.equal(builds, 1);
});
```

- [ ] **Step 2: نفّذ `scheduler.ts`**

```ts
import type { CompileResult, Compiler } from './compiler.ts';

export type Scheduler = {
  update(candidates: Iterable<string>, onResult: (result: CompileResult) => void): void;
  flush(): void;
  cancel(): void;
};

export function createScheduler(
  compiler: Compiler,
  options: { debounceMs?: number } = {},
): Scheduler {
  const debounceMs = options.debounceMs ?? 30;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: Iterable<string> = [];
  let callback: ((result: CompileResult) => void) | null = null;

  const run = (): void => {
    timer = null;
    if (!callback) return;
    const result = compiler.build(pending);
    callback(result);
  };

  return {
    update(candidates, onResult) {
      pending = candidates;
      callback = onResult;
      if (timer) clearTimeout(timer);
      timer = setTimeout(run, debounceMs);
    },
    flush() {
      if (timer) clearTimeout(timer);
      run();
    },
    cancel() {
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}
```

- [ ] **Step 3: نفّذ `detect.ts`**

```ts
import fs from 'node:fs/promises';
import path from 'node:path';

export type BuildMode = 'builtin' | 'external' | 'unknown';

type Manifest = {
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

export async function detectMode(projectRoot: string): Promise<BuildMode> {
  try {
    const raw = await fs.readFile(path.join(projectRoot, 'package.json'), 'utf8');
    const manifest = JSON.parse(raw) as Manifest;
    const hasTailwind =
      Boolean(manifest.dependencies?.tailwindcss) ||
      Boolean(manifest.devDependencies?.tailwindcss);
    if (!hasTailwind) return 'unknown';
    const scripts = Object.values(manifest.scripts ?? {});
    return scripts.some((script) => /tailwindcss|postcss/.test(script)) ? 'external' : 'builtin';
  } catch {
    return 'unknown';
  }
}
```

- [ ] **Step 4: اختبار `detect.ts`**

```ts
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { detectMode } from '@tep/tailwind';

test('reports unknown when there is no manifest', async () => {
  assert.equal(await detectMode('/tmp/definitely-missing-project'), 'unknown');
});

test('detects builtin vs external build from scripts', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'tep-detect-'));
  await fs.writeFile(
    path.join(root, 'package.json'),
    JSON.stringify({ dependencies: { tailwindcss: '4.3.3' }, scripts: { dev: 'vite' } }),
  );
  assert.equal(await detectMode(root), 'builtin');

  await fs.writeFile(
    path.join(root, 'package.json'),
    JSON.stringify({
      dependencies: { tailwindcss: '4.3.3' },
      scripts: { css: 'tailwindcss -i in.css -o out.css' },
    }),
  );
  assert.equal(await detectMode(root), 'external');
});
```

- [ ] **Step 5: صدّر وشغّل**

```ts
export * from './scheduler.ts';
export * from './detect.ts';
```

```bash
npm run typecheck
npm test
```

- [ ] **Step 6: Commit**

```bash
git add packages/tailwind/src packages/tailwind/test
git commit -m "feat(tailwind): debounce builds and detect external build mode"
```

---

### Task 2.5: اختبار التطابق

**Files:**
- Create: `packages/tailwind/test/parity.test.ts`
- Create: `packages/tailwind/test/fixtures/parity.html`

**Interfaces:**
- Consumes: `Compiler`, `collectFromHtml`
- Produces: ضمان أن كل utility مستخدمة تولّد rule، مع استثناء صريح للقوالب الديناميكية

**تحذير تحقق:** في هذه البيئة، `bg-brand-500` لم يولّد rule لأن الثيم الافتراضي لا يحتوي `brand`. هذا سلوك صحيح ومقصود. لهذا يفصل الاختبار بين "class موجود في الثيم" و"class غير موجود" بدل افتراض النجاح.

- [ ] **Step 1: fixture**

```html
<!doctype html>
<html>
  <body>
    <div class="flex p-4 md:p-6 hover:bg-red-500 bg-[#123456] text-sm font-semibold rounded-xl shadow-lg">
      <span class="sr-only">a</span>
      <button class="focus:ring-2 focus:ring-blue-500 disabled:opacity-50">b</button>
    </div>
  </body>
</html>
```

- [ ] **Step 2: اختبار**

```ts
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { collectFromHtml, createCompiler } from '@tep/tailwind';

test('every used core utility gets a rule', async () => {
  const html = fs.readFileSync(path.resolve('packages/tailwind/test/fixtures/parity.html'), 'utf8');
  const candidates = collectFromHtml(html);
  const compiler = await createCompiler('@import "tailwindcss";', process.cwd());
  const { css } = compiler.build(candidates);
  for (const candidate of candidates) {
    if (candidate.includes('${') || candidate.includes('{{')) continue;
    assert.ok(css.includes(candidate), `missing rule for ${candidate}`);
  }
});

test('custom theme token compiles when declared', async () => {
  const themeCss = `@import "tailwindcss";\n@theme {\n  --color-brand-500: oklch(0.62 0.19 259);\n}`;
  const compiler = await createCompiler(themeCss, process.cwd());
  const { css } = compiler.build(['bg-brand-500']);
  assert.ok(css.includes('--color-brand-500'));
  assert.ok(css.includes('bg-brand-500'));
});

test('unknown theme token does not silently compile', async () => {
  const compiler = await createCompiler('@import "tailwindcss";', process.cwd());
  const { css } = compiler.build(['bg-brand-500']);
  assert.equal(css.includes('bg-brand-500'), false);
});
```

- [ ] **Step 3: شغّل**

```bash
npm test
```

Expected: 3 اختبارات ناجحة. إذا فشل الأول، فالصنف إما مخصص أو مكتوب خطأً؛ أضفه إلى الثيم في fixture أو احذفه. لا تُضعف الشرط.

- [ ] **Step 4: Commit**

```bash
git add packages/tailwind/test/parity.test.ts packages/tailwind/test/fixtures/parity.html
git commit -m "test(tailwind): enforce that every used class compiles"
```

---

### بوابة الخروج من P2

- [ ] build بارد < 300ms على مشروع صغير.
- [ ] scheduler يدمج 5 تحديثات في build واحد.
- [ ] `@theme` يعمل، والصنف غير الموجود لا يُولَّد بصمت.
- [ ] parity أخضر.
- [ ] `npm run verify` أخضر.

---

# المرحلة 3 — قشرة سطح المكتب والمعاينة (أسبوع 8-10)

**الهدف:** تطبيق Electron يفتح مشروعًا، يعرضه في iframe معزول، يحدد عنصرًا، يعدّل class، يحفظ، ويتراجع.

**بوابة الدخول:** خروج P1 وP2، واعتماد D-01.

**بوابة الخروج:** E2E ينجح على المسار الكامل، فتح 100 صفحة < 3s، حفظ 100 تعديل لا يغيّر بايتًا خارج `class`، و0 crash في 8 ساعات.

---

### Task 3.1: هيكل Electron آمن

**Files:**
- Create: `apps/desktop/package.json`
- Create: `apps/desktop/tsconfig.json`
- Create: `apps/desktop/src/main/main.ts`
- Create: `apps/desktop/src/preload/preload.ts`
- Create: `apps/desktop/src/renderer/index.html`
- Create: `apps/desktop/electron.vite.config.ts`
- Create: `apps/desktop/test/security.test.ts`

**Interfaces:**
- Consumes: `electron@38.8.6`, `electron-vite@6.0.0`, `vite@7.3.7`
- Produces: نافذة واحدة بـ `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`

- [ ] **Step 1: `apps/desktop/package.json`**

```json
{
  "name": "@tep/desktop",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./out/main/main.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "start": "electron-vite preview"
  },
  "dependencies": {
    "electron": "38.8.6"
  },
  "devDependencies": {
    "electron-vite": "6.0.0",
    "vite": "7.3.7"
  }
}
```

- [ ] **Step 2: اختبار الأمان**

```ts
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

test('main window uses secure webPreferences', () => {
  const source = fs.readFileSync(path.resolve('apps/desktop/src/main/main.ts'), 'utf8');
  assert.ok(source.includes('contextIsolation: true'));
  assert.ok(source.includes('sandbox: true'));
  assert.ok(source.includes('nodeIntegration: false'));
  assert.equal(source.includes('nodeIntegration: true'), false);
});
```

- [ ] **Step 3: `main.ts`**

```ts
import { app, BrowserWindow } from 'electron';
import path from 'node:path';

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    webPreferences: {
      preload: path.join(import.meta.dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void window.loadFile(path.join(import.meta.dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
```

- [ ] **Step 4: `preload.ts`**

```ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('tep', {
  ping: (): Promise<string> => ipcRenderer.invoke('tep:ping'),
});
```

- [ ] **Step 5: باقي الملفات**

`apps/desktop/electron.vite.config.ts`:

```ts
import { defineConfig } from 'electron-vite';

export default defineConfig({
  main: { build: { outDir: 'out/main' } },
  preload: { build: { outDir: 'out/preload' } },
  renderer: { build: { outDir: 'out/renderer' } },
});
```

`apps/desktop/src/renderer/index.html`:

```html
<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <title>TalwindEditorPro</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```

`apps/desktop/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "types": ["node"]
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "test/**/*.ts"]
}
```

- [ ] **Step 6: شغّل**

```bash
npm install
npm run typecheck
npm test
```

Expected: security test PASS. لا تشغّل Electron في CI بلا display.

- [ ] **Step 7: Commit**

```bash
git add apps/desktop package-lock.json
git commit -m "feat(desktop): bootstrap secure electron shell"
```

---

### Task 3.2: عقود IPC مع Zod

**Files:**
- Create: `packages/contracts/package.json`
- Create: `packages/contracts/src/index.ts`
- Create: `packages/contracts/test/contracts.test.ts`

**Interfaces:**
- Consumes: `zod@4.6.7`
- Produces:
  - `safeRelativePath` (schema)
  - `writeFileInput`, `readFileInput`, `openProjectInput`, `applyClassInput`
  - `validate<T>(schema, input): T` يرمي خطأ برسالة عربية

- [ ] **Step 1: `package.json`**

```json
{
  "name": "@tep/contracts",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "types": "./src/index.ts",
  "dependencies": {
    "zod": "4.6.7"
  }
}
```

- [ ] **Step 2: اختبار فاشل**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { applyClassInput, validate, writeFileInput } from '@tep/contracts';

test('rejects path traversal', () => {
  assert.throws(() => validate(writeFileInput, { path: '../etc/passwd', content: 'x' }));
  assert.throws(() => validate(writeFileInput, { path: '/etc/passwd', content: 'x' }));
  assert.throws(() => validate(writeFileInput, { path: 'a\0b', content: 'x' }));
});

test('accepts relative project paths', () => {
  const result = validate(writeFileInput, { path: 'index.html', content: 'x' });
  assert.equal(result.path, 'index.html');
});

test('applyClassInput defaults empty arrays', () => {
  const result = validate(applyClassInput, { path: 'index.html', elementId: 'e1' });
  assert.deepEqual(result.add, []);
  assert.deepEqual(result.remove, []);
});
```

- [ ] **Step 3: نفّذ**

```ts
import { z } from 'zod';

export const safeRelativePath = z
  .string()
  .min(1)
  .refine((value) => !value.startsWith('/') && !value.includes('..') && !value.includes('\0'), {
    message: 'مسار غير آمن',
  });

export const writeFileInput = z.object({
  path: safeRelativePath,
  content: z.string(),
});

export const readFileInput = z.object({ path: safeRelativePath });

export const openProjectInput = z.object({ root: z.string().min(1) });

export const applyClassInput = z.object({
  path: safeRelativePath,
  elementId: z.string().min(1),
  add: z.array(z.string()).default([]),
  remove: z.array(z.string()).default([]),
});

export function validate<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new Error(result.error.issues.map((issue) => issue.message).join('; '));
  }
  return result.data;
}
```

- [ ] **Step 4: شغّل**

```bash
npm install
npm run typecheck
npm test
```

- [ ] **Step 5: Commit**

```bash
git add packages/contracts package-lock.json
git commit -m "feat(contracts): validate IPC inputs and block path traversal"
```

---

### Task 3.3: FileSystem port

**Files:**
- Create: `packages/fs/package.json`
- Create: `packages/fs/src/port.ts`
- Create: `packages/fs/src/node-fs.ts`
- Create: `packages/fs/src/memory-fs.ts`
- Create: `packages/fs/test/node-fs.test.ts`
- Create: `packages/fs/test/memory-fs.test.ts`

**Interfaces:**
- Consumes: `node:fs/promises`
- Produces:
  - `type FileEvent = { type: 'change' | 'add' | 'remove'; path: string }`
  - `type FileSystemPort = { read, write, list, watch, stat }`
  - `createNodeFs(root): FileSystemPort` و`createMemoryFs(files): FileSystemPort`

- [ ] **Step 1: `port.ts`**

```ts
export type FileEvent = { type: 'change' | 'add' | 'remove'; path: string };

export type FileSystemPort = {
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<void>;
  list(root: string, glob: string): Promise<string[]>;
  watch(root: string, onChange: (event: FileEvent) => void): Promise<() => void>;
  stat(path: string): Promise<{ mtimeMs: number; size: number }>;
};
```

- [ ] **Step 2: اختبار `node-fs`**

```ts
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createNodeFs } from '@tep/fs';

test('reads and writes inside the project root only', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'tep-fs-'));
  const port = createNodeFs(root);
  await port.write('index.html', '<div>x</div>');
  assert.equal(await port.read('index.html'), '<div>x</div>');
  await assert.rejects(() => port.read('../outside.html'));
});

test('lists html files matching a glob', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'tep-fs-'));
  const port = createNodeFs(root);
  await port.write('a.html', 'a');
  await port.write('b.css', 'b');
  const files = await port.list(root, '**/*.html');
  assert.deepEqual(files.sort(), ['a.html']);
});
```

- [ ] **Step 3: نفّذ `node-fs.ts`**

```ts
import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import type { FileEvent, FileSystemPort } from './port.ts';

function resolveInside(root: string, relative: string): string {
  const resolved = path.resolve(root, relative);
  const normalizedRoot = path.resolve(root);
  if (resolved !== normalizedRoot && !resolved.startsWith(`${normalizedRoot}${path.sep}`)) {
    throw new Error(`path escapes project root: ${relative}`);
  }
  return resolved;
}

function matchesGlob(name: string, glob: string): boolean {
  const pattern = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '.');
  return new RegExp(`^${pattern}$`).test(name);
}

const IGNORED = new Set(['node_modules', '.git', '.tep', 'dist', 'out']);

async function walk(root: string, current: string, glob: string, found: string[]): Promise<void> {
  const entries = await fs.readdir(current, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (IGNORED.has(entry.name)) continue;
      await walk(root, path.join(current, entry.name), glob, found);
      continue;
    }
    const relative = path.relative(root, path.join(current, entry.name)).split(path.sep).join('/');
    if (matchesGlob(relative, glob)) found.push(relative);
  }
}

export function createNodeFs(root: string): FileSystemPort {
  return {
    async read(relative) {
      return fs.readFile(resolveInside(root, relative), 'utf8');
    },
    async write(relative, content) {
      const target = resolveInside(root, relative);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, content, 'utf8');
    },
    async list(listRoot, glob) {
      const found: string[] = [];
      await walk(resolveInside(root, listRoot), resolveInside(root, listRoot), glob, found);
      return found;
    },
    async watch(watchRoot, onChange) {
      const target = resolveInside(root, watchRoot);
      const watcher = fssync.watch(target, { recursive: true }, (eventType, filename) => {
        if (!filename) return;
        const relative = String(filename).split(path.sep).join('/');
        const event: FileEvent = { type: eventType === 'rename' ? 'add' : 'change', path: relative };
        onChange(event);
      });
      return () => watcher.close();
    },
    async stat(relative) {
      const stats = await fs.stat(resolveInside(root, relative));
      return { mtimeMs: stats.mtimeMs, size: stats.size };
    },
  };
}
```

- [ ] **Step 4: نفّذ `memory-fs.ts`**

```ts
import path from 'node:path';
import type { FileEvent, FileSystemPort } from './port.ts';

export function createMemoryFs(initial: Record<string, string> = {}): FileSystemPort {
  const files = new Map<string, string>(Object.entries(initial));
  const watchers = new Set<(event: FileEvent) => void>();
  const normalize = (value: string): string => {
    if (value.startsWith('/') || value.includes('..')) throw new Error(`unsafe path: ${value}`);
    return value.split(path.sep).join('/');
  };
  return {
    async read(relative) {
      const value = files.get(normalize(relative));
      if (value === undefined) throw new Error(`missing file: ${relative}`);
      return value;
    },
    async write(relative, content) {
      files.set(normalize(relative), content);
      for (const watcher of watchers) watcher({ type: 'change', path: normalize(relative) });
    },
    async list(_root, glob) {
      const prefix = glob.replace(/\*.*$/, '');
      return [...files.keys()].filter((key) => key.startsWith(prefix));
    },
    async watch(_root, onChange) {
      watchers.add(onChange);
      return () => watchers.delete(onChange);
    },
    async stat(relative) {
      const value = files.get(normalize(relative));
      if (value === undefined) throw new Error(`missing file: ${relative}`);
      return { mtimeMs: 0, size: value.length };
    },
  };
}
```

- [ ] **Step 5: `index.ts` واختبار memory**

```ts
export * from './port.ts';
export * from './node-fs.ts';
export * from './memory-fs.ts';
```

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { createMemoryFs } from '@tep/fs';

test('memory fs reads, writes and notifies watchers', async () => {
  const port = createMemoryFs({ 'index.html': 'a' });
  const events: string[] = [];
  await port.watch('', (event) => events.push(event.path));
  await port.write('index.html', 'b');
  assert.equal(await port.read('index.html'), 'b');
  assert.deepEqual(events, ['index.html']);
  await assert.rejects(() => port.read('../x'));
});
```

- [ ] **Step 6: شغّل**

```bash
npm run typecheck
npm test
```

- [ ] **Step 7: Commit**

```bash
git add packages/fs package-lock.json
git commit -m "feat(fs): add filesystem port with node and memory implementations"
```

---

### Task 3.4: خادم المعاينة

**Files:**
- Create: `packages/preview/package.json`
- Create: `packages/preview/src/server.ts`
- Create: `packages/preview/src/bridge.ts`
- Create: `packages/preview/src/index.ts`
- Create: `packages/preview/test/server.test.ts`

**Interfaces:**
- Consumes: `node:http`
- Produces:
  - `createPreviewServer(root: string, port?: number): Promise<{ url: string; close: () => Promise<void> }>`
  - `type BridgeMessage` مع `select`, `cssApplied`, `ready`, `picked`

**حد أمني مهم:** الخادم يستمع على `127.0.0.1` فقط، لا `0.0.0.0`، ويحجب أي مسار خارج `root`. هذا يمنع تحويل بيئة التطوير إلى خدمة عامة.

- [ ] **Step 1: `package.json`**

```json
{
  "name": "@tep/preview",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "types": "./src/index.ts"
}
```

- [ ] **Step 2: اختبار فاشل**

```ts
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createPreviewServer } from '@tep/preview';

test('serves html and blocks traversal', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'tep-preview-'));
  await fs.writeFile(path.join(root, 'index.html'), '<h1>ok</h1>');
  const server = await createPreviewServer(root);
  const ok = await fetch(`${server.url}/index.html`);
  assert.equal(await ok.text(), '<h1>ok</h1>');
  const blocked = await fetch(`${server.url}/..%2Fetc%2Fpasswd`);
  assert.notEqual(blocked.status, 200);
  await server.close();
});

test('binds to loopback only', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'tep-preview-'));
  const server = await createPreviewServer(root);
  assert.ok(server.url.startsWith('http://127.0.0.1:'));
  await server.close();
});
```

- [ ] **Step 3: نفّذ `server.ts`**

```ts
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
};

export type PreviewServer = { url: string; close: () => Promise<void> };

export async function createPreviewServer(root: string, port = 0): Promise<PreviewServer> {
  const normalizedRoot = path.resolve(root);
  const server = http.createServer((request, response) => {
    void (async () => {
      const url = new URL(request.url ?? '/', 'http://localhost');
      const relative = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
      const file = path.resolve(normalizedRoot, `.${relative}`);
      if (file !== normalizedRoot && !file.startsWith(`${normalizedRoot}${path.sep}`)) {
        response.writeHead(403).end('forbidden');
        return;
      }
      try {
        const content = await fs.readFile(file);
        response.writeHead(200, {
          'content-type': MIME[path.extname(file)] ?? 'application/octet-stream',
          'cache-control': 'no-store',
        });
        response.end(content);
      } catch {
        response.writeHead(404).end('not found');
      }
    })();
  });

  await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('preview server failed to bind');

  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}
```

- [ ] **Step 4: نفّذ `bridge.ts`**

```ts
export type BridgeMessage =
  | { type: 'ready' }
  | { type: 'select'; id: string }
  | { type: 'picked'; id: string }
  | { type: 'cssApplied'; bytes: number };

export function parseBridgeMessage(raw: unknown): BridgeMessage | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const candidate = raw as { type?: unknown; id?: unknown; bytes?: unknown };
  if (candidate.type === 'ready') return { type: 'ready' };
  if (candidate.type === 'select' && typeof candidate.id === 'string') {
    return { type: 'select', id: candidate.id };
  }
  if (candidate.type === 'picked' && typeof candidate.id === 'string') {
    return { type: 'picked', id: candidate.id };
  }
  if (candidate.type === 'cssApplied' && typeof candidate.bytes === 'number') {
    return { type: 'cssApplied', bytes: candidate.bytes };
  }
  return null;
}
```

- [ ] **Step 5: `index.ts`**

```ts
export * from './server.ts';
export * from './bridge.ts';
```

- [ ] **Step 6: شغّل**

```bash
npm run typecheck
npm test
```

- [ ] **Step 7: Commit**

```bash
git add packages/preview package-lock.json
git commit -m "feat(preview): serve project over loopback-only preview"
```

---

### Task 3.5: IPC الحقيقي والمسار الكامل

**Files:**
- Create: `packages/editor/package.json`
- Create: `packages/editor/src/session.ts`
- Create: `packages/editor/test/session.test.ts`
- Modify: `apps/desktop/src/main/main.ts`

**Interfaces:**
- Consumes: `@tep/fs`, `@tep/parser`, `@tep/contracts`
- Produces:
  - `createSession(port: FileSystemPort, path: string): Promise<Session>`
  - `Session.addClass(elementId, token)`, `removeClass`, `undo`, `redo`, `save()`, `text`

**قاعدة:** `Session` هي الحد الوحيد الذي يلامس الملفات. الواجهة تتحدث إليها عبر IPC، ولا تعرف `fs`.

- [ ] **Step 1: `package.json`**

```json
{
  "name": "@tep/editor",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "types": "./src/index.ts",
  "dependencies": {
    "@tep/fs": "0.0.0",
    "@tep/parser": "0.0.0"
  }
}
```

- [ ] **Step 2: اختبار فاشل**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { createMemoryFs } from '@tep/fs';
import { createSession } from '@tep/editor';

const SOURCE = `<div class="p-4" data-tep-id="e1">x</div>`;

test('session edits in memory until save', async () => {
  const port = createMemoryFs({ 'index.html': SOURCE });
  const session = await createSession(port, 'index.html');
  session.addClass('e1', 'flex');
  assert.ok(session.text.includes('flex'));
  assert.equal(await port.read('index.html'), SOURCE);
  await session.save();
  assert.equal(await port.read('index.html'), `<div class="p-4 flex" data-tep-id="e1">x</div>`);
});

test('session undo restores exact bytes and redo reapplies', async () => {
  const port = createMemoryFs({ 'index.html': SOURCE });
  const session = await createSession(port, 'index.html');
  session.addClass('e1', 'flex');
  session.undo();
  assert.equal(session.text, SOURCE);
  session.redo();
  assert.ok(session.text.includes('flex'));
});

test('save strips editor ids only when exporting', async () => {
  const port = createMemoryFs({ 'index.html': SOURCE });
  const session = await createSession(port, 'index.html');
  session.addClass('e1', 'flex');
  await session.save();
  assert.equal(await port.read('index.html'), `<div class="p-4 flex" data-tep-id="e1">x</div>`);
  const exported = session.exportHtml();
  assert.equal(exported.includes('data-tep-id'), false);
});
```

- [ ] **Step 3: نفّذ `session.ts`**

```ts
import type { FileSystemPort } from '@tep/fs';
import { CausalBuffer, addClass as addClassCommand, removeClass as removeClassCommand, stripEditorIds } from '@tep/parser';

export type Session = {
  readonly path: string;
  readonly text: string;
  readonly dirty: boolean;
  addClass(elementId: string, token: string): boolean;
  removeClass(elementId: string, token: string): boolean;
  undo(): boolean;
  redo(): boolean;
  save(): Promise<void>;
  exportHtml(): string;
};

export async function createSession(port: FileSystemPort, path: string): Promise<Session> {
  const original = await port.read(path);
  const buffer = new CausalBuffer(original, path);
  return {
    path,
    get text() {
      return buffer.text;
    },
    get dirty() {
      return buffer.dirty;
    },
    addClass(elementId, token) {
      return buffer.applyCausal({
        source: 'control',
        label: `Add ${token}`,
        elementId,
        mutate: (text) => addClassCommand(text, elementId, token),
      });
    },
    removeClass(elementId, token) {
      return buffer.applyCausal({
        source: 'control',
        label: `Remove ${token}`,
        elementId,
        mutate: (text) => removeClassCommand(text, elementId, token),
      });
    },
    undo() {
      return buffer.undo();
    },
    redo() {
      return buffer.redo();
    },
    async save() {
      await port.write(path, buffer.text);
    },
    exportHtml() {
      return stripEditorIds(buffer.text);
    },
  };
}
```

- [ ] **Step 4: اربط IPC في `main.ts`**

```ts
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { createNodeFs } from '@tep/fs';
import { createSession } from '@tep/editor';
import { applyClassInput, validate } from '@tep/contracts';

let session: Awaited<ReturnType<typeof createSession>> | null = null;

ipcMain.handle('tep:open', async (_event, raw: unknown) => {
  const input = validate(applyClassInput.pick({ path: true }), raw);
  const port = createNodeFs(process.cwd());
  session = await createSession(port, input.path);
  return { text: session.text };
});

ipcMain.handle('tep:applyClass', async (_event, raw: unknown) => {
  const input = validate(applyClassInput, raw);
  if (!session) throw new Error('لا يوجد ملف مفتوح');
  for (const token of input.add) session.addClass(input.elementId, token);
  for (const token of input.remove) session.removeClass(input.elementId, token);
  return { text: session.text };
});

ipcMain.handle('tep:save', async () => {
  if (!session) throw new Error('لا يوجد ملف مفتوح');
  await session.save();
  return { ok: true };
});

ipcMain.handle('tep:undo', async () => {
  if (!session) throw new Error('لا يوجد ملف مفتوح');
  session.undo();
  return { text: session.text };
});
```

- [ ] **Step 5: شغّل**

```bash
npm install
npm run typecheck
npm test
```

- [ ] **Step 6: Commit**

```bash
git add packages/editor apps/desktop package-lock.json
git commit -m "feat(editor): add document session that commits through the ledger"
```

---

### Task 3.6: E2E الأساسي

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/open-edit-save.spec.ts`
- Create: `apps/desktop/src/renderer/app.tsx`
- Create: `apps/desktop/src/renderer/main.tsx`
- Modify: `package.json` (script `test:e2e`)

**Interfaces:**
- Consumes: `@playwright/test@1.64.1`, `react@19.3.1`, `react-dom@19.3.1`
- Produces: سيناريو واحد يثبت المسار: فتح → تحديد → تعديل → حفظ → تراجع

- [ ] **Step 1: إضافة تبعيات الواجهة**

في `apps/desktop/package.json`:

```json
"dependencies": {
  "electron": "38.8.6",
  "react": "19.3.1",
  "react-dom": "19.3.1"
},
"devDependencies": {
  "@playwright/test": "1.64.1",
  "@types/react": "19.2.2",
  "@types/react-dom": "19.2.2",
  "@vitejs/plugin-react": "6.1.2",
  "electron-vite": "6.0.0",
  "vite": "7.3.7"
}
```

- [ ] **Step 2: `playwright.config.ts`**

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: 0,
  use: { trace: 'on-first-retry', baseURL: 'http://127.0.0.1:5174' },
  webServer: {
    command: 'npm run dev --workspace @tep/desktop -- --rendererOnly',
    url: 'http://127.0.0.1:5174',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

- [ ] **Step 3: اختبار E2E**

```ts
import { expect, test } from '@playwright/test';

test('open, edit, save and undo a class', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('open-project').click();
  await expect(page.getByTestId('file-tree')).toContainText('index.html');
  await page.getByTestId('canvas-frame').click();
  await page.getByTestId('class-input').fill('p-8');
  await page.getByTestId('apply-class').click();
  await expect(page.getByTestId('status')).toContainText('تم');
  await page.getByTestId('save').click();
  await expect(page.getByTestId('status')).toContainText('حُفظ');
  await page.keyboard.press('Control+z');
  await expect(page.getByTestId('status')).toContainText('تراجع');
});
```

- [ ] **Step 4: واجهة دنيا**

`app.tsx` يعرض `data-testid` التالية فقط: `open-project`, `file-tree`, `canvas-frame`, `class-input`, `apply-class`, `save`, `status`. لا تصميم بعد؛ الهدف إثبات العقد، والتصميم يأتي في P4.

```tsx
export function App(): JSX.Element {
  return (
    <main>
      <button data-testid="open-project">فتح مشروع</button>
      <nav data-testid="file-tree" />
      <iframe data-testid="canvas-frame" title="معاينة" />
      <input data-testid="class-input" />
      <button data-testid="apply-class">تطبيق</button>
      <button data-testid="save">حفظ</button>
      <output data-testid="status" />
    </main>
  );
}
```

- [ ] **Step 5: شغّل**

```bash
npx playwright install chromium
npm run test:e2e
```

Expected: PASS. إن فشل لأن Electron لا يعمل headless، شغّل الواجهة في وضع المتصفح فقط (`--rendererOnly`) وأبقِ IPC مموّهًا في `e2e` عبر `page.addInitScript`.

- [ ] **Step 6: Commit**

```bash
git add e2e playwright.config.ts apps/desktop package.json package-lock.json
git commit -m "test(e2e): cover open, edit, save and undo journey"
```

---

### Task 3.7: قياس الأداء الحقيقي

**Files:**
- Create: `e2e/perf.spec.ts`
- Create: `scripts/make-project.mjs`

**Interfaces:**
- Consumes: Playwright
- Produces: قياس فتح 100 صفحة وسرعة التحديث البصري، مكتوب في `bench/browser.json`

- [ ] **Step 1: مولّد مشروع**

```js
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? 'tmp/large-project');
fs.mkdirSync(path.join(root, 'pages'), { recursive: true });
for (let i = 0; i < 100; i += 1) {
  const body = Array.from(
    { length: 40 },
    (_, j) => `<article class="card p-4 md:p-6"><h2 class="text-lg font-semibold">Card ${j}</h2><p class="mt-2 text-sm text-gray-600">Body ${j}</p></article>`,
  ).join('\n');
  fs.writeFileSync(
    path.join(root, 'pages', `page-${i}.html`),
    `<!doctype html>\n<html><head><meta charset="utf-8"><title>Page ${i}</title></head><body><main class="p-6">${body}</main></body></html>`,
  );
}
console.error(`wrote 100 pages to ${root}`);
```

- [ ] **Step 2: قياس**

```ts
import fs from 'node:fs';
import { expect, test } from '@playwright/test';

test('opens a 100 page project under 3s', async ({ page }) => {
  const started = Date.now();
  await page.goto('/');
  await page.getByTestId('open-project').click();
  await expect(page.getByTestId('file-tree')).toContainText('page-0.html');
  const elapsed = Date.now() - started;
  fs.mkdirSync('bench', { recursive: true });
  fs.writeFileSync('bench/browser.json', JSON.stringify({ openProjectMs: elapsed }, null, 2));
  expect(elapsed).toBeLessThan(3000);
});
```

- [ ] **Step 3: شغّل**

```bash
node scripts/make-project.mjs
npm run test:e2e -- perf.spec.ts
```

- [ ] **Step 4: Commit**

```bash
git add e2e/perf.spec.ts scripts/make-project.mjs
git commit -m "perf(e2e): measure real browser project open time"
```

---

### بوابة الخروج من P3

- [ ] فتح 100 صفحة < 3s (رقم Playwright مكتوب).
- [ ] تعديل 100 عنصر وحفظ: `git diff --numstat` لا يظهر تغييرات خارج `class`.
- [ ] E2E أخضر في CI (أو مبرر موثق لعدم تشغيله في CI).
- [ ] `contextIsolation`, `sandbox`, `nodeIntegration` مؤكدة باختبار.
- [ ] تحذير `preload`/`sandbox` لا يظهر في سجلات Electron.

**ملاحظة:** بعد هذه المرحلة، كل مرحلة لاحقة تُوسَّع إلى خطة تفصيلية مستقلة قبل تنفيذها. الأقسام التالية مواصفات ملزمة، لا اقتراحات.

---

# المرحلة 4 — التحرير البصري وClass IR (أسبوع 11-13)

**الهدف:** بناء صفحة بصريًا مع فهم دلالي للأصناف، كشف التعارض، وشرح سبب كل أثر.

**بوابة الدخول:** خروج P3.

**بوابة الخروج:** 200 تعديل آلي بلا "no effect"، 0 تعارض غير مفسر، وبناء landing page في < 20 دقيقة في اختبار استخدام مع 4/5 مشاركين.

**قبل التنفيذ:** وسّع هذه المرحلة إلى خطة تفصيلية بكود عبر `writing-plans`.

### Task 4.1: Tokenizer

**Files:**
- Create: `packages/class-ir/package.json`
- Create: `packages/class-ir/src/tokenize.ts`
- Create: `packages/class-ir/test/tokenize.test.ts`

**Interfaces:**

```ts
export type Variant = { name: string; arbitrary: boolean; raw: string };

export type UtilityIR = {
  raw: string;
  prefix: string | null;
  variants: Variant[];
  important: boolean;
  negative: boolean;
  property: string;
  value: string;
  modifier: string | null;
  arbitrary: boolean;
  unknown: boolean;
};

export function tokenize(className: string): UtilityIR;
export function serialize(ir: UtilityIR): string;
```

**اختبارات القبول:**
- `tokenize('md:hover:!bg-red-500/50')` يعيد varianten `md` و`hover`، `important: true`, `modifier: '50'`، `unknown: false`.
- `tokenize('content-["a b"]')` لا ينكسر عند المسافة داخل الأقواس.
- `serialize(tokenize(x)) === x` لكل class في corpus 500 class من مشاريع حقيقية.
- `tokenize('foo-bar-baz')` يعيد `unknown: true` ولا يرمي.

### Task 4.2: Resolver ضد الثيم

**Files:**
- Create: `packages/class-ir/src/resolve.ts`
- Create: `packages/class-ir/test/resolve.test.ts`

**Interfaces:**

```ts
export type ResolvedUtility = { property: string; value: string; unknown: boolean };
export function resolveUtility(compiler: Compiler, className: string): ResolvedUtility | null;
```

**اختبارات القبول:**
- `bg-brand-500` يُحلَّل فقط إذا كان `--color-brand-500` في `@theme`.
- `p-4` يعيد `padding` بقيمة مشتقة من `--spacing`.
- صنف غير موجود يعيد `unknown: true` ولا `null` صامت.

### Task 4.3: كاشف التعارض

**Files:**
- Create: `packages/class-ir/src/conflicts.ts`
- Create: `packages/class-ir/test/conflicts.test.ts`

**Interfaces:**

```ts
export type Conflict = { property: string; winner: string; losers: string[]; reason: string };
export function findConflicts(tokens: string[]): Conflict[];
```

**اختبارات القبول:**
- `['p-4','p-8']` → تعارض واحد، `winner: 'p-8'`، `reason` يشرح ترتيب القواعد.
- `['p-4','px-2']` ليس تعارضًا كاملًا، بل تداخلًا يُصنَّف `partial` في `reason`.
- `['md:p-4','p-8']` ليس تعارضًا لأن الـ variant يغيّر الأولوية.

### Task 4.4: Inspector وClass Tree وExplain

**Files:**
- Create: `apps/desktop/src/renderer/panels/Inspector.tsx`
- Create: `apps/desktop/src/renderer/panels/ClassTree.tsx`
- Create: `apps/desktop/src/renderer/panels/ExplainPanel.tsx`
- Create: `apps/desktop/src/renderer/hooks/useClassEdit.ts`
- Create: `e2e/inspector.spec.ts`

**اختبارات القبول (Playwright):**
- إضافة `p-8` من Inspector تظهر في Class Tree وتُطبَّق في المعاينة.
- إزالة class من Class Tree تُعيد النص الأصلي بايتيًا.
- Explain يعرض آخر 5 تعديلات على العنصر مع المصدر (`control`/`code`).
- class مجهول يظهر بعلامة تحذير، لا يُخفى.

### Task 4.5: Unknown class surfacing

**Files:**
- Modify: `packages/class-ir/src/resolve.ts`
- Create: `packages/class-ir/test/unknown.test.ts`
- Modify: `apps/desktop/src/renderer/panels/ClassTree.tsx`

**اختبارات القبول:**
- أي class لا يولّد CSS يُوسم `unknown`، ويظهر في قائمة منفصلة.
- النقر على unknown يقترح أقرب class صحيح (Levenshtein ≤ 2) دون تطبيق تلقائي.
- لا يوجد أي مسار يخفي unknown بصمت.

### Task 4.6: إثبات "no effect"

**Files:**
- Create: `e2e/no-effect.spec.ts`

**اختبارات القبول:**
- 200 تعديل متتالٍ على 20 عنصرًا: كل تعديل يغيّر `getComputedStyle` واحدًا على الأقل أو يُرفض برسالة.
- 0 حالة يظهر فيها الصنف في الكود بلا أثر بصري بلا تحذير.

---

# المرحلة 5 — Tokens والاستجابة (أسبوع 14-16)

**الهدف:** تعديل الهوية البصرية من مصدر واحد، وتحرير responsive مفهوم مع حالات.

**بوابة الدخول:** خروج P4، واعتماد D-05.

**بوابة الخروج:** تغيير token واحد يحدّث 100% من الاستخدامات مع تقرير أثر، و4 breakpoints × 10 صفحات بلا overflow غير مقصود.

**قبل التنفيذ:** وسّع إلى خطة تفصيلية.

### Task 5.1: Token graph وتحليل الأثر

**Files:**
- Create: `packages/tokens/package.json`
- Create: `packages/tokens/src/graph.ts`
- Create: `packages/tokens/src/impact.ts`
- Create: `packages/tokens/test/graph.test.ts`
- Create: `packages/tokens/test/impact.test.ts`

**Interfaces:**

```ts
export type TokenNode = {
  id: string;
  namespace: string;
  name: string;
  value: string;
  usedBy: { utilities: string[]; elements: string[] };
};

export type TokenGraph = { tokens: Map<string, TokenNode>; aliases: Map<string, string> };

export function buildTokenGraph(themeCss: string, documents: Map<string, string>): TokenGraph;
export function impactOfChange(
  graph: TokenGraph,
  tokenId: string,
): { elements: number; files: string[]; utilities: string[] };
```

**اختبارات القبول:**
- حذف `--color-brand-500` يعرض كل utility وملف متأثر قبل التطبيق.
- token بلا استخدام يظهر `usedBy` فارغًا، لا خطأ.
- alias مثل `--color-primary: var(--color-brand-500)` يُتبع في الأثر.

**قرار تقني:** استبدل regex `parseTheme` بمحلل `postcss@8.5.32` في هذه المهمة، لأن `@theme inline` والـ aliases لا تُحلَّل بالـ regex.

### Task 5.2: Token Panel

**Files:**
- Create: `apps/desktop/src/renderer/panels/Tokens.tsx`
- Create: `e2e/token-change.spec.ts`

**اختبارات القبول:**
- تغيير لون token يعرض عدد العناصر المتأثرة قبل التطبيق.
- التطبيق يمر عبر Ledger، ويمكن التراجع.
- تعديل token لا يُعيد كتابة أي ملف غير `theme.css`.

### Task 5.3: Breakpoints وResponsive Ribbon

**Files:**
- Create: `packages/editor/src/breakpoints.ts`
- Create: `packages/editor/test/breakpoints.test.ts`
- Create: `apps/desktop/src/renderer/panels/Responsive.tsx`
- Create: `e2e/responsive.spec.ts`

**Interfaces:**

```ts
export type BreakpointMap = Map<string, string[]>;
export function groupByBreakpoint(tokens: readonly string[]): BreakpointMap;
export function resolveAtBreakpoint(tokens: readonly string[], breakpoint: string): string[];
```

**اختبارات القبول:**
- تعديل `md:` لا يغيّر `base`.
- المعاينة تعرض 4 مقاسات (base, sm, md, lg) وتُحذّر عند overflow.
- `groupByBreakpoint` يحافظ على ترتيب Tailwind المتعارف.

### Task 5.4: States

**Files:**
- Modify: `packages/editor/src/breakpoints.ts`
- Create: `apps/desktop/src/renderer/panels/States.tsx`
- Create: `e2e/states.spec.ts`

**اختبارات القبول:**
- المعاينة تفرض `hover`/`focus`/`active`/`dark` وتُظهر الأثر.
- إضافة state class تنتج `hover:` فقط عند التأكيد.
- لا يُكتب class مكرر عند تفعيل نفس الحالة مرتين.

---

# المرحلة 6 — المكونات والصفحات (أسبوع 17-20)

**الهدف:** موقع متعدد الصفحات بمكونات قابلة للتحديث وتصدير نظيف.

**بوابة الدخول:** خروج P5، واعتماد D-04.

**بوابة الخروج:** موقع 10 صفحات، تحديث مكون يحدّث 100% من الاستخدامات، واستخراج مكون آمن بايتيًا.

**قبل التنفيذ:** وسّع إلى خطة تفصيلية.

### Task 6.1: نموذج المكونات والتوسيع

**Files:**
- Create: `packages/components/package.json`
- Create: `packages/components/src/schema.ts`
- Create: `packages/components/src/expand.ts`
- Create: `packages/components/test/expand.test.ts`

**Interfaces:**

```ts
export type PropSpec = { type: 'string' | 'number' | 'boolean'; required: boolean; default?: string };
export type ComponentDefinition = {
  name: string;
  html: string;
  props: Record<string, PropSpec>;
  slots: string[];
};
export function expandComponent(definition: ComponentDefinition, attributes: Record<string, string>): string;
export function parseComponentSource(source: string): ComponentDefinition;
```

**اختبارات القبول:**
- `<tep-card title="Welcome">` يُوسَّع إلى HTML نهائي بلا custom element.
- prop مفقود و`required: true` يرمي خطأً عربيًا واضحًا.
- slot غير معرّف يبقى كما هو ويُسجَّل تحذير.

### Task 6.2: Extract Component

**Files:**
- Create: `packages/components/src/extract.ts`
- Create: `packages/components/test/extract.test.ts`
- Create: `apps/desktop/src/renderer/commands/extract.tsx`
- Create: `e2e/extract.spec.ts`

**اختبارات القبول:**
- تحديد 3 عناصر متشابهة يقترح تعريفًا مع أسماء props.
- الاستخراج لا يغيّر بايتًا واحدًا خارج النطاق المحدد.
- إلغاء الاستخراج يعيد الوثيقة الأصلية بايتيًا.

### Task 6.3: Layouts وPages manager

**Files:**
- Create: `packages/project/package.json`
- Create: `packages/project/src/pages.ts`
- Create: `packages/project/src/layout.ts`
- Create: `packages/project/test/pages.test.ts`
- Create: `apps/desktop/src/renderer/panels/Pages.tsx`

**اختبارات القبول:**
- إضافة صفحة تنسخ layout وسجلاتها في `project.json`.
- تغيير layout يحدّث كل الصفحات المرتبطة مع تقرير أثر قبل التطبيق.
- حذف صفحة لا يحذف الملف تلقائيًا؛ يُطلب تأكيد صريح.

### Task 6.4: Assets manager

**Files:**
- Create: `packages/project/src/assets.ts`
- Create: `packages/project/test/assets.test.ts`

**اختبارات القبول:**
- إضافة صورة تنسخ الملف إلى `assets/` وتحدّث المسار النسبي.
- التصدير لا يحتوي مسارات مطلقة.
- اسم ملف مكرر يُعيد تسمية بدل الكتابة فوق الأصل.

### Task 6.5: تصدير نظيف (اختبار مبكر)

**Files:**
- Create: `packages/export/src/static.ts`
- Create: `packages/export/test/static.test.ts`

**اختبارات القبول:**
- تصدير 10 صفحات: البحث عن `data-tep-id` و`tep-` يفشل.
- البناء الناتج يعمل بـ `npx @tailwindcss/cli@4.3.3 -i theme.css -o out.css`.
- التصدير لا يحذف ملفات المشروع الأصلية؛ يكتب إلى مجلد هدف.

---

# المرحلة 7 — الجودة وRTL والاستيراد (أسبوع 21-24)

**الهدف:** جودة مدمجة، RTL حقيقي، واستيراد موقع قائم بعقد أمانة.

**بوابة الدخول:** خروج P6.

**بوابة الخروج:** 90% من issues لها إصلاح، RTL readiness ≥ 95%، واستيراد 99% مع تقرير أمانة قبل أي كتابة.

**قبل التنفيذ:** وسّع إلى خطة تفصيلية.

### Task 7.1: قواعد HTML وa11y

**Files:**
- Create: `packages/quality/package.json`
- Create: `packages/quality/src/rules/html.ts`
- Create: `packages/quality/src/rules/a11y.ts`
- Create: `packages/quality/src/run.ts`
- Create: `packages/quality/test/rules.test.ts`

**Interfaces:**

```ts
export type Severity = 'error' | 'warning' | 'info';
export type Fix = { label: string; edit: TextEdit };
export type Issue = { id: string; severity: Severity; elementPath: string; message: string; fix?: Fix };
export function runRules(html: string): Issue[];
```

**مجموعة القواعد الدنيا:**
- `img` بلا `alt`.
- رابط بلا `href` أو بعنوان فارغ.
- تباين أقل من 4.5:1 للنص العادي.
- `h1` مفقود أو مكرر.
- `label` غير مرتبط بـ input.
- `id` مكرر.

**اختبارات القبول:**
- كل قاعدة لها اختبار إيجابي وسلبي.
- كل `Fix` يمر عبر Ledger ويمكن تراجعه.
- axe-core يُشغَّل في Playwright كطبقة تحقق ثانية، لا كمصدر الحقيقة الوحيد.

### Task 7.2: Quality Gate UI

**Files:**
- Create: `apps/desktop/src/renderer/panels/Quality.tsx`
- Create: `e2e/quality.spec.ts`

**اختبارات القبول:**
- صفحة بها 3 مشكلات: تطبيق إصلاح واحد يخفض العدد إلى 2.
- كل إصلاح يعرض preview قبل التطبيق.
- لا يمكن تصدير صفحة بها `error` بلا تأكيد موثق.

### Task 7.3: RTL transform

**Files:**
- Create: `packages/i18n/package.json`
- Create: `packages/i18n/src/logical.ts`
- Create: `packages/i18n/data/utilities.json`
- Create: `packages/i18n/test/logical.test.ts`

**Interfaces:**

```ts
export function toLogical(className: string): string | null;
export function toPhysical(className: string): string | null;
export function rtlReadiness(html: string): { score: number; offenders: string[] };
```

**اختبارات القبول:**
- `ml-4` ⇄ `ms-4`، `mr-4` ⇄ `me-4`، `text-left` ⇄ `text-start`، `left-0` ⇄ `start-0`.
- خريطة 100 utility على الأقل، و95% صحة على corpus مرجعي.
- `rtlReadiness` يعيد درجة وليس boolean.

### Task 7.4: Import Fidelity Contract

**Files:**
- Create: `packages/import/package.json`
- Create: `packages/import/src/inspect.ts`
- Create: `packages/import/src/plan.ts`
- Create: `packages/import/test/inspect.test.ts`
- Create: `apps/desktop/src/renderer/flows/import.tsx`
- Create: `e2e/import.spec.ts`

**Interfaces:**

```ts
export type ImportRisk = { kind: 'dynamic-class' | 'unknown-config' | 'external-build' | 'malformed-html'; path: string; detail: string };
export type ImportReport = { files: number; tailwindVersion: '3' | '4' | 'unknown'; fidelity: number; risks: ImportRisk[] };
export function inspectProject(port: FileSystemPort, root: string): Promise<ImportReport>;
export function applyImportPlan(port: FileSystemPort, plan: ImportPlan): Promise<ImportReport>;
```

**اختبارات القبول:**
- استيراد موقع 20 صفحة يعرض تقريرًا قبل أي كتابة.
- الكتابة لا تغيّر بايتًا خارج خطة موثقة.
- مشروع Tailwind v3 يُرفض بوضوح بدل محاولة صامتة.

### Task 7.5: Build Bridge وDrift Detector

**Files:**
- Create: `packages/build-bridge/package.json`
- Create: `packages/build-bridge/src/drift.ts`
- Create: `packages/build-bridge/src/bridge.ts`
- Create: `packages/build-bridge/test/drift.test.ts`

**اختبارات القبول:**
- تعديل `tailwind.config.js` خارجيًا أثناء التحرير يظهر حالة "بناء خارجي تغيّر".
- الجسر لا يكتب فوق ملف أنتجه بناء خارجي.
- إعادة التوليد تحدث بعد تأكيد المستخدم فقط.

---

# المرحلة 8 — الذكاء الاصطناعي المقيد (أسبوع 25-27)

**الهدف:** AI يقترح patches صالحة، لا نصوصًا حرة.

**بوابة الدخول:** خروج P7، واعتماد D-07.

**بوابة الخروج:** 95% patches صالحة على 50 طلبًا، كل patch قابل للتراجع، ولا patch يضيف class غير موجود.

**قبل التنفيذ:** وسّع إلى خطة تفصيلية.

### Task 8.1: Patch Protocol

**Files:**
- Create: `packages/ai/package.json`
- Create: `packages/ai/src/patch.ts`
- Create: `packages/ai/src/validate.ts`
- Create: `packages/ai/test/patch.test.ts`

**Interfaces:**

```ts
export type PatchEdit = { elementId: string; add: string[]; remove: string[] };
export type Patch = { id: string; intent: string; edits: PatchEdit[]; explanation: string };
export type PatchContext = { html: string; knownClasses: ReadonlySet<string>; themeTokens: ReadonlySet<string> };
export function validatePatch(patch: Patch, context: PatchContext): { ok: boolean; errors: string[] };
```

**اختبارات القبول:**
- patch يضيف `bg-brand-500` غير الموجود في الثيم يُرفض برسالة عربية.
- patch على `elementId` غير موجود يُرفض.
- patch لا يمسّ أي عنصر خارج `edits`.
- كل patch صالح يتحول إلى `TextEdit[]` قبل التطبيق.

### Task 8.2: Provider BYOK

**Files:**
- Create: `packages/ai/src/providers/http.ts`
- Create: `packages/ai/src/providers/local.ts`
- Create: `packages/ai/src/credentials.ts`
- Create: `apps/desktop/src/renderer/settings/AI.tsx`
- Create: `packages/ai/test/credentials.test.ts`

**قواعد إلزامية:**
- المفتاح يُقرأ من إعداد المستخدم فقط، ولا يُسجَّل في logs أو telemetry.
- يُخزَّن مشفرًا في `.tep/secrets.json` مع `chmod 600`.
- لا قيمة افتراضية في الكود، ولا قراءة من متغيرات بيئة عامة.
- في الاختبارات يُستخدم provider وهمي، لا شبكة.

**اختبارات القبول:**
- لا يظهر المفتاح في أي رسالة خطأ أو log.
- حذف `.tep/` يطلب المفتاح من جديد بدل crash.
- provider المحلي يعمل بلا شبكة على نموذج صغير في اختبار منفصل.

### Task 8.3: Patch Cards

**Files:**
- Create: `apps/desktop/src/renderer/panels/PatchCard.tsx`
- Create: `e2e/ai-patch.spec.ts`

**اختبارات القبول:**
- اقتراح patch يعرض before/after بصريًا.
- التطبيق يمر عبر Ledger، والرفض لا يغيّر شيئًا.
- patch مرفوض بسبب class مجهول يعرض السبب واقتراح تصحيح.

---

# المرحلة 9 — النشر والمراجعة (أسبوع 28-31)

**الهدف:** تصدير نظيف، نشر بضغطة، ومراجعة مرتبطة بالعناصر.

**بوابة الدخول:** خروج P7. P8 غير مانع.

**بوابة الخروج:** نشر موقع كامل، 0 metadata في الإنتاج، وتعليق مرتبط بعنصر يبقى مرتبطًا بعد تعديل class.

**قبل التنفيذ:** وسّع إلى خطة تفصيلية.

### Task 9.1: Static Export النهائي

**Files:**
- Modify: `packages/export/src/static.ts`
- Create: `packages/export/src/verify.ts`
- Create: `packages/export/test/verify.test.ts`

**اختبارات القبول:**
- البحث عن `data-tep-id`, `tep-`, `.tep/` في مجلد التصدير يفشل.
- الحجم النهائي لا يزيد عن الأصل + CSS المولّد + 5%.
- كل رابط داخلي يشير إلى ملف موجود.

### Task 9.2: Publish adapters

**Files:**
- Create: `packages/publish/package.json`
- Create: `packages/publish/src/github.ts`
- Create: `packages/publish/src/netlify.ts`
- Create: `packages/publish/src/sftp.ts`
- Create: `packages/publish/test/adapters.test.ts`

**قواعد إلزامية:**
- لا تنفيذ أمر shell عشوائي من إعداد المشروع.
- القائمة المسموحة صريحة: `git`, `npx @tailwindcss/cli`.
- كل adapter له fake server في الاختبار.

**اختبارات القبول:**
- كل adapter ينجح مقابل fake server ويفشل بأمان عند 401.
- الأسرار لا تُكتب في `project.json`.
- النشر لا يحذف أي ملف عن بُعد بلا تأكيد صريح.

### Task 9.3: Preview deployment وReview

**Files:**
- Create: `packages/publish/src/deploy.ts`
- Create: `packages/review/package.json`
- Create: `packages/review/src/anchors.ts`
- Create: `packages/review/test/anchors.test.ts`
- Create: `apps/desktop/src/renderer/panels/Review.tsx`
- Create: `e2e/review.spec.ts`

**اختبارات القبول:**
- تعليق مرتبط بعنصر يبقى مرتبطًا بعد تعديل class وإعادة الفتح.
- تعليق على عنصر محذوف يظهر كـ "عنصر مفقود" لا يُحذف بصمت.
- التصدير لا يحتوي بيانات تعليقات.

---

# المرحلة 10 — Beta والإصدار (أسبوع 32-36)

**الهدف:** منتج قابل للتوزيع مع onboarding وترخيص وتحديثات.

**بوابة الدخول:** خروج P8 وP9، واعتماد D-06 وD-12.

**بوابة الخروج:** 50 مستخدمًا في تجربة، NPS ≥ 30، crash-free sessions ≥ 99%، accessibility issues < 3 لكل صفحة.

**قبل التنفيذ:** وسّع إلى خطة تفصيلية.

### Task 10.1: Onboarding وTemplates

**Files:**
- Create: `apps/desktop/src/renderer/flows/onboarding.tsx`
- Create: `templates/landing/`, `templates/blog/`, `templates/dashboard/`
- Create: `e2e/onboarding.spec.ts`

**اختبارات القبول:**
- مستخدم جديد يبني صفحة كاملة في < 20 دقيقة باتباع 3 خطوات.
- كل template يفتح بلا أخطاء console.
- تخطي onboarding متاح ولا يعود يظهر.

### Task 10.2: Licensing وUpdates

**Files:**
- Create: `packages/licensing/package.json`
- Create: `packages/licensing/src/verify.ts`
- Create: `packages/licensing/test/verify.test.ts`
- Create: `apps/desktop/src/main/updates.ts`

**اختبارات القبول:**
- ترخيص غير صالح لا يُعطّل التحرير أو التصدير؛ يعرض تنبيهًا فقط.
- التحديث يتحقق من التوقيع ولا يثبّت حزمة غير موقعة.
- لا بيانات استخدام ترسل بلا opt-in صريح.

### Task 10.3: Telemetry اختياري وCrash reporting

**Files:**
- Create: `packages/telemetry/package.json`
- Create: `packages/telemetry/src/client.ts`
- Create: `packages/telemetry/test/client.test.ts`

**اختبارات القبول:**
- الافتراضي معطّل تمامًا.
- لا يُرسل مسار ملف أو محتوى مستند أبدًا.
- يمكن تعطيله في أي وقت ويوقف الإرسال فورًا.

### Task 10.4: Diagnostics

**Files:**
- Create: `apps/desktop/src/main/diagnostics.ts`
- Create: `e2e/diagnostics.spec.ts`

**اختبارات القبول:**
- ملف تشخيص يحتوي إصدارات، حالة build، وسجلات آخر 10 دقائق، بلا أسرار.
- المستخدم يستطيع تنزيله من داخل التطبيق.
- لا يُرفع تلقائيًا.

---

# الملحق أ — مصفوفة المخاطر المحدثة

| ID | الخطر | الاحتمال | الأثر | التخفيف في هذه الخطة |
|---|---|---|---|---|
| R-01 | فقدان التنسيق | مرتفع | مرتفع | P0 golden + fuzz، لا serialize |
| R-02 | عدم استقرار Tailwind API | متوسط | مرتفع | إصدارات مثبتة + adapter + parity |
| R-03 | بطء المشاريع الكبيرة | متوسط | مرتفع | فهرس P1.1 + ميزانية CI |
| R-04 | تعقيد UX | مرتفع | مرتفع | P4 acceptance + اختبار استخدام |
| R-05 | سوق أصغر من المتوقع | متوسط | مرتفع | مقابلات Phase 0 قبل P3 |
| R-06 | منافس يضيف Tailwind | متوسط | متوسط | التركيز على ledger + quality + clean export |
| R-07 | AI غير موثوق | مرتفع | متوسط | Patch validation الصارم في P8 |
| R-08 | مشكلة علامة تجارية | متوسط | مرتفع | ADR-0003 قبل P3 |
| R-09 | عبء دعم | متوسط | متوسط | Diagnostics في P10 |
| R-10 | تسرب بيانات | منخفض | مرتفع | sandbox + loopback + no telemetry افتراضيًا |
| R-11 | تضخم النطاق | مرتفع | مرتفع | بوابات خروج + Non-goals |
| R-12 | اعتماد على شخص واحد | متوسط | مرتفع | ADRs + خطط تفصيلية لكل مرحلة |
| R-13 | بطء اختبارات E2E | متوسط | متوسط | اختبارات حرجة فقط في CI، والباقي ليليًا |
| R-14 | عدم تطابق المعاينة والإنتاج | متوسط | مرتفع | parity test + verify export في P9.1 |

---

# الملحق ب — تعريف "منجز"

المهمة منجزة فقط إذا تحققت كل بنود هذا القائمة:

1. تعمل على مشروع حقيقي، لا fixture فقط.
2. لها اختبار آلي يفشل قبل التنفيذ وينجح بعده.
3. `npm run verify` أخضر.
4. `npm run bench` و`check-budget` أخضران، أو المهمة لا تمسّ المسار الساخن.
5. قابلة للتراجع عبر Ledger.
6. لا تكسر التصدير النظيف.
7. موثقة في UI عند الحاجة (تلميح/شرح).
8. قيست (زمن/أخطاء) إن كانت على المسار الساخن.
9. عرضت في demo أسبوعي.
10. لها commit مستقل برسالة `type(scope): ...`.

---

# الملحق ج — بوابات الجودة بين المراحل

| البوابة | بعد | معيار الاجتياز |
|---|---|---|
| Gate 1 | P1 | 0 انحراف بايتي على 50 ملفًا + indexed p95 < 30ms |
| Gate 2 | P2 | build بارد < 300ms + parity كامل |
| Gate 3 | P3 | E2E كامل + فتح 100 صفحة < 3s |
| Gate 4 | P4 | 200 تعديل بلا no-effect + 0 تعارض غير مفسر |
| Gate 5 | P5 | 100% تحديث tokens + 4 breakpoints |
| Gate 6 | P6 | 10 صفحات + تصدير 0 metadata |
| Gate 7 | P7 | 90% issues لها fix + استيراد 99% |
| Gate 8 | P8 | 95% patches صالحة |
| Gate 9 | P9 | نشر بضغطة + 0 metadata + تعليقات ثابتة |
| Gate 10 | P10 | 50 مستخدمًا + NPS ≥ 30 + crash-free ≥ 99% |

---

# الملحق د — قائمة ADRs المتوقعة

```text
0001 product-form-desktop-first        (P0)
0002 scope-static-html-tailwind4       (P0)
0003 name-and-trademark                (P0)
0004 surgical-editing-over-serialize    (P1)
0005 structural-paths-for-locator       (P1)
0006 tailwind-adapter-not-reimplementation (P2)
0007 loopback-preview-server            (P3)
0008 class-ir-as-source-of-truth        (P4)
0009 theme-parser-postcss               (P5)
0010 component-expansion-at-build       (P6)
0011 quality-rules-and-axe              (P7)
0012 ai-patch-protocol                  (P8)
0013 export-without-metadata            (P9)
0014 licensing-and-telemetry-defaults   (P10)
```

---

# الملحق هـ — مخاطر التنفيذ الفردي

إذا كان التنفيذ فرديًا:

1. اضرب كل مدة في 2.5.
2. ابدأ بـ P0 → P1 → P2 → P3 بلا توازي.
3. أجّل P8 (AI) وP9 (النشر) إلى ما بعد أول 20 مستخدمًا.
4. لا تبدأ P6 (المكونات) قبل التأكد من Gate 3، لأن المكونات تعتمد على استقرار Ledger.
5. أبقِ golden corpus صغيرًا (20 ملفًا) إن كان وقت المراجعة محدودًا، لكن لا تحذف fuzz.

---

# الملحق و — ما لا نبنيه في هذه الخطة

1. محرر CSS من الصفر.
2. Runtime إنتاج أو مكتبة components تُشحن مع الموقع.
3. Collaboration حي (CRDT) قبل v1.
4. دعم React/Vue/Astro في v1.
5. WordPress وCMS قبل v1.5.
6. Marketplace وPlugins قبل v1.
7. سحابة إلزامية أو telemetry افتراضية.
8. AI يولّد HTML حرًا بلا patch validation.

---

# الملحق ز — الخطوة التالية فورًا

1. اعتمد بوابة P0: نفّذ المهام 0.1 إلى 0.7 بالترتيب.
2. بعد كل مهمة: `npm run verify` + commit.
3. عند اكتمال P0: افتح `docs/adr/0004-surgical-editing-over-serialize.md` وابدأ P1.
4. لا تنتقل إلى P1 قبل أن يكون `bench/results.json` يحقق `restoredExactly: true` و`p95 < 200ms`.

---

# الملحق ح — مراجع المصدر

كل قرار في هذه الخطة يستند إلى دراسة في `docs/research/`:

| المستند | ما استُخدم منه |
|---|---|
| `01-pinegrow-analysis.md` | نموذج التحرير على HTML قائم، حدود Pinegrow |
| `02-tailwind-analysis.md` | سلوك v4، `@theme`، candidates، حدود يتجنبها المحرر |
| `03-pain-points.md` | أوجاع المستخدم التي تبرر Ledger والشرح |
| `04-competitive-landscape.md` | الفجوة التنافسية (Tailwind-native + أمانة بايتية) |
| `05-product-strategy.md` | الشريحة والتموضع وNon-goals |
| `06-architecture.md` | Electron Desktop-first، DocumentBuffer، ports |
| `07-algorithms.md` | إزاحة الفهرس، الإصلاح الجراحي، كشف التعارض |
| `08-data-model-and-ux.md` | Inspector، Class Tree، Responsive Ribbon |
| `09-roadmap-and-risks.md` | R-01..R-14 ومضاعف الفريق |
| `10-open-questions-and-validation.md` | D-01..D-12 وبواباتها |
| `11-sources.md` | المصادر الخارجية |
| `12-user-reality-and-blockers.md` | اختبارات الاستخدام ومعايير القبول |
| `13-signature-solutions.md` | التصدير النظيف وRTL وImport Fidelity |
| `14-relationship-map.md` | ترابط الميزات وأولوية البناء |
| `15-how-we-build.md` | هيكل monorepo و`verify` وميزانيات CI |
| `appendices/feature-matrix.csv` | تتبع الميزة → المرحلة → الاختبار |
| `appendices/evidence-log.csv` | دليل كل ادعاء تقني |

**نهاية الخطة.**
