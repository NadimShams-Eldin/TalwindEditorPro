# 06 - المعمارية المقترحة

> هذه معمارية مرشحة، وليست قرارًا نهائيًا. الهدف هو توضيح الحدود التقنية والمخاطر قبل التنفيذ.

## 1. المتطلبات المعمارية

| المتطلب | التفسير |
|---|---|
| ملكية الكود | المشروع يبقى ملفات HTML/CSS/JS عادية |
| تحرير ثنائي الاتجاه | Visual وCode يعملان على نفس المستند |
| دقة الكود | لا نعيد تنسيق الملف كاملًا عند كل تعديل |
| Tailwind-native | فهم theme/utilities/variants/conflicts |
| أداء | مشاريع كبيرة، incremental build |
| أمان | منع الوصول غير المصرح به للملفات والشبكة |
| قابلية التوسع | plugins ومكونات وثيمات |
| عمل محلي | لا اعتماد على سحابة |
| تصدير نظيف | إزالة metadata الخاصة بالمحرر |

## 2. الخيارات المعمارية

### 2.1 Desktop-only (Electron)

**المزايا:**
- وصول كامل للملفات وGit.
- Chromium موحد على كل الأنظمة.
- DevTools ونظام عمليات ناضج.
- سهولة تشغيل build/CLI.
- تجربة قريبة من Pinegrow.

**العيوب:**
- حجم التطبيق.
- استهلاك ذاكرة.
- تحديثات.
- تعاون سحابي يحتاج طبقة إضافية.

### 2.2 Tauri

**المزايا:**
- حجم أصغر.
- أمان أفضل نظريًا.
- Rust للأداء.

**العيوب:**
- WebView مختلف بين الأنظمة (WebKitGTK على Linux).
- اختلافات CSS/DOM قد تكسر المعاينة.
- نظام plugin أقل نضجًا.
- فريق يحتاج Rust.

### 2.3 Web-first

**المزايا:**
- نشر وتحديث سهل.
- تعاون سحابي أسهل.
- لا تثبيت.

**العيوب:**
- الوصول للملفات محدود (File System Access API).
- Git/CLI/build محلي صعب.
- أداء المشاريع الكبيرة.
- خصوصية أقل.

### 2.4 التوصية

**Desktop-first بـ Electron، مع فصل النواة في حزم مستقلة تسمح بنسخة Web لاحقًا.**

السبب: دقة المعاينة، الوصول للملفات، Git، build، وplugins. يمكن لاحقًا تشغيل نفس الـ core في المتصفح مع محول تخزين مختلف.

## 3. نظرة عامة

```text
┌───────────────────────────────────────────────────────────────┐
│                        Electron Shell                         │
│                                                               │
│  ┌─────────────────┐   IPC    ┌─────────────────────────────┐  │
│  │ Renderer (UI)   │◄────────►│ Main Process                │  │
│  │ React + TS      │          │ File System / Git / Build   │  │
│  │ Zustand/XState  │          │ Publish / Secrets / Updates │  │
│  └────────┬────────┘          └──────────┬──────────────────┘  │
│           │                              │                     │
│           │ postMessage                  │ worker              │
│           ▼                              ▼                     │
│  ┌─────────────────┐          ┌─────────────────────────────┐  │
│  │ Preview Iframe  │          │ Workers                     │  │
│  │ served project  │          │ Tailwind / Index / AI       │  │
│  └─────────────────┘          └─────────────────────────────┘  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Core Packages (TypeScript, no Electron dependency)      │  │
│  │ document / html-ast / css-ast / class-ir / tokens /     │  │
│  │ components / quality / revisions / export               │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

### مبادئ

1. **Core مستقل عن Electron.** يمكن اختباره وتشغيله في Node أو المتصفح.
2. **Main process لا يثق بالـ renderer.** كل IPC يمرر عبر schema validation.
3. **Preview في أصل منفصل.** لا يشارك DOM مع الواجهة.
4. **Workers للمهام الثقيلة.** لا تجميد للواجهة.

## 4. نموذج المستند

### 4.1 مصدر الحقيقة

```text
Files on disk
  ├─ HTML
  ├─ CSS
  ├─ JS/TS
  ├─ assets
  └─ .tep/ (metadata, لا يُصدَّر)
       ├─ project.json
       ├─ components/
       ├─ revisions/
       ├─ cache/
       └─ index.db
```

الملفات هي مصدر الحقيقة. `.tep/` تحتوي الحالة الإضافية، ويمكن حذفها مع فقدان بعض الميزات، لا المحتوى.

### 4.2 طبقات المستند

```text
DocumentBuffer
  ├─ rawText
  ├─ syntaxTree (parse5 / PostCSS / acorn)
  ├─ sourceLocations
  ├─ semanticModel (elements, classes, components)
  └─ dirtyRanges
```

### 4.3 التحرير الجراحي

المشكلة: المتصفح يعيد تسلسل DOM بشكل يفقد التنسيق.

الحل:

1. parse5 مع `sourceCodeLocationInfo`.
2. لكل عقدة: `startOffset`, `endOffset`, `startTag`, `endTag`.
3. الأمر لا يستبدل الوثيقة كلها، بل ينتج `TextEdit[]`.
4. إعادة تحليل النطاق المتأثر فقط.
5. الحفاظ على whitespace والتعليقات.
6. التنسيق الكامل (Prettier) عملية صريحة، وليست ضمنية.

```text
Command → Patch → TextEdit[] → Apply → Reparse affected range → Update model
```

### 4.4 التعامل مع التغييرات الخارجية

- File watcher على المشروع.
- Hash لكل ملف.
- إذا تغير ملف لم يعدله المحرر: تحديث تلقائي.
- إذا تغير ملف مع تعديلات غير محفوظة: نافذة تعارض (احتفظ بنسختي / أعد التحميل / دمج).
- منع الكتابة العمياء.

### 4.5 المحتوى الديناميكي

- HTML ثابت: تحرير كامل.
- محتوى يُنشأ بـ JS: snapshot mode فقط، أو تحرير القالب وليس الناتج.
- يجب توضيح القيد في الواجهة، لا إخفاؤه.

## 5. المعاينة

### 5.1 النموذج

```text
Project files ──► Preview Server (localhost, random port)
                        │
                        ├─ inject editor bridge
                        ├─ rewrite asset paths if needed
                        └─ serve HTML/CSS/JS
                        │
                        ▼
                  Sandboxed iframe
```

### 5.2 لماذا سيرفر محلي؟

- يحافظ على relative URLs.
- يسمح بـ modules وfetch.
- يعزل الأصل عن واجهة Electron.
- يسهل إعادة التحميل.

### 5.3 الجسر

```text
Editor → Preview:
  - select(elementId)
  - hover(elementId)
  - applyCss(css)
  - setViewport(width, height)
  - setState(pseudo)
  - reload

Preview → Editor:
  - elementPicked(id)
  - console(message)
  - runtimeError(error)
  - scroll(position)
  - layoutMetrics(rect)
```

### 5.4 مزامنة DOM

- المحرر يبني HTML من AST.
- عند العرض، يضيف `data-tep-id` في نسخة المعاينة فقط.
- mapping: `data-tep-id -> AST node path`.
- لا يُكتب `data-tep-id` في الملفات.
- عند التحديد من المعاينة، نرسل id ونحدد العقدة.

### 5.5 CSS hot swap

- Tailwind compile ينتج CSS جديدًا.
- استبدال `<link>` أو محتوى `<style>` دون إعادة تحميل الصفحة.
- للـ JS: إعادة تحميل كاملة.
- الحفاظ على scroll والـ selection إن أمكن.

## 6. محرك Tailwind

### 6.1 المبدأ

لا نكتب محرك Tailwind. نستخدم المحرك الرسمي عبر adapter:

```text
TailwindAdapter
  ├─ detectVersion(project)
  ├─ discoverConfig(project)
  ├─ collectCandidates(documentModel)
  ├─ compile(candidates, theme, entryCss, options)
  ├─ watchExternalBuild(project)
  └─ dispose()
```

### 6.2 الأوضاع

| الوضع | الاستخدام |
|---|---|
| Built-in compile | الوضع الافتراضي، سرعة وتكامل |
| External build | plugins/config قديم/إصدار مخصص |
| Hybrid | built-in للـ preview، external للـ production |

`[موثق]` Pinegrow يفرق بين built-in وexternal، وبعض الميزات لا تعمل مع external. نحن يجب أن نتجنب هذا التعارض بتوحيد الـ adapter.

### 6.3 جمع المرشحات

المصادر:

1. AST classes في HTML.
2. Classes في ملفات JS/TS/Vue/JSX (نص).
3. `@source` directives.
4. `@apply` في CSS.
5. safelist/`@source inline`.
6. classes مضافة من الـ AI (بعد التحقق).

المشكلة: Tailwind scanner النصي قد لا يرى classes المضافة في DOM.

الحل:

- بناء candidate set موحد من الـ core.
- تمريره إلى Tailwind عبر `@source inline()` أو API داخلي.
- إعادة التوليد عند كل تغيير.
- التحقق أن كل class مستخدم له CSS.

### 6.4 Incremental compile

```text
onClassChange(file, class):
  candidates = updateCandidateSet(file)
  if candidates.hash == lastHash: return
  scheduleCompile(debounce=30ms)
  css = compile(candidates)
  if css.hash != lastCssHash:
      swapCssAtomically(css)
```

### 6.5 كشف الإصدار

- `package.json` dependencies.
- `node_modules/tailwindcss/package.json`.
- `@import "tailwindcss"` vs `@tailwind`.
- config file.
- إذا لم يوجد، اقترح v4.

## 7. طبقة الأصناف (Class IR)

### 7.1 البنية

```ts
type UtilityIR = {
  raw: string;
  variants: Variant[];
  important: boolean;
  negative: boolean;
  property: string;
  value: string;
  modifier?: string;
  arbitrary: boolean;
  unknown: boolean;
};
```

### 7.2 الوظائف

- parse
- serialize
- resolve against theme
- detect conflicts
- sort canonical
- explain
- suggest fixes

### 7.3 الحدود

- arbitrary values قد تكون معقدة.
- custom utilities.
- plugins.
- variants مخصصة.
- يجب أن يكون الـ parser قابلًا للتوسع، مع fallback إلى "unknown" بدل الفشل.

## 8. المكونات

### 8.1 نموذج الملفات

```text
components/
  card.html
  card.json
  navbar.html
  navbar.json
```

`card.html`:

```html
<article class="rounded-xl bg-white p-6 shadow">
  <h3>{{title}}</h3>
  <div data-slot="body"></div>
</article>
```

`card.json`:

```json
{
  "name": "Card",
  "props": {
    "title": { "type": "string", "required": true }
  },
  "slots": ["body"]
}
```

### 8.2 الاستخدام

```html
<tep-card title="Welcome">
  <p>Body content</p>
</tep-card>
```

### 8.3 العرض والتصدير

- Preview: يُوسَّع المكون في DOM مع الحفاظ على mapping.
- Export: يُستبدل `<tep-card>` بـ HTML النهائي، دون custom element.
- WordPress: mapping إلى partial/block.

### 8.4 التحديث

- تحديث التعريف يحدّث كل الاستخدامات.
- props إلزامية جديدة تسبب تحذيرًا.
- slots المفقودة تسبب تحذيرًا.
- impact analysis قبل التطبيق.
- revisions.

## 9. نظام التصميم

### 9.1 المصدر

`theme.css`:

```css
@import "tailwindcss";

@theme {
  --color-brand-50: oklch(...);
  --color-brand-500: oklch(...);
  --font-sans: "Inter", sans-serif;
  --spacing: 0.25rem;
  --breakpoint-sm: 40rem;
}
```

### 9.2 Token graph

```text
Token
  ├─ id
  ├─ namespace
  ├─ value
  ├─ type
  ├─ aliases
  ├─ usedBy (utilities/elements/components)
  └─ constraints
```

### 9.3 الثيمات

- `default`
- `dark`
- `brand-a`
- `brand-b`

كل ثيم مجموعة قيم فوق نفس الـ namespaces.

### 9.4 Impact analysis

قبل حذف/تغيير token:

1. ابحث في AST عن classes تستخدمه.
2. ابحث في CSS عن `var(--token)`.
3. ابحث في المكونات.
4. اعرض العدد والملفات.
5. اقترح بديلًا.
6. طبّق في transaction.

## 10. الجودة

### 10.1 الفحوص

| الفحص | الأداة/الطريقة |
|---|---|
| HTML structure | parse5 + قواعد مخصصة |
| Unknown classes | Utility resolver |
| Accessibility | axe-core على preview |
| Contrast | حساب ألوان من computed style |
| Broken links | فحص داخلي + HTTP للخارجي |
| Responsive overflow | قياس layout في viewports |
| Performance | Lighthouse اختياري |
| SEO | title/meta/sitemap |

### 10.2 النموذج

```ts
type Issue = {
  id: string;
  severity: "error" | "warning" | "info";
  category: "html" | "a11y" | "tailwind" | "responsive" | "seo" | "perf";
  elementPath?: string;
  file: string;
  range?: [number, number];
  message: string;
  why: string;
  fixes: Fix[];
};
```

### 10.3 أثناء التحرير

- فحص سريع بعد كل transaction (debounced).
- عرض الشارة على العنصر.
- لا تعطيل العمل.
- الفحص الكامل عند الطلب أو قبل النشر.

## 11. الذكاء الاصطناعي

### 11.1 المبدأ

AI لا يعيد كتابة الملف. يخرج patch محدودًا:

```json
{
  "op": "replace",
  "target": { "file": "index.html", "path": "body/main/section[2]" },
  "html": "<section class=\"...\">...</section>",
  "rationale": "..."
}
```

### 11.2 التحقق

1. Schema validation.
2. HTML parse.
3. Classes موجودة أو يمكن إضافتها للثيم.
4. لا حذف عناصر غير مطلوبة.
5. لا attributes خطرة.
6. Preview diff.
7. موافقة المستخدم.
8. Undo.

### 11.3 السياق

- العنصر المحدد.
- الثيم.
- classes المتاحة.
- المكونات.
- نمط الصفحة.
- لا نرسل المشروع كاملًا.

### 11.4 الخصوصية

- BYO key.
- إخفاء القيم الحساسة.
- خيار local model.
- سجل تدقيق محلي.

## 12. التخزين والفهرسة

### 12.1 `.tep/`

```text
.tep/
  project.json
  index.db
  cache/
    tailwind.css
    candidates.json
  revisions/
  components/
  designs/
  logs/
```

### 12.2 SQLite

لماذا:
- بحث سريع في آلاف الصفحات.
- فهرسة العناصر/الأصناف.
- تاريخ.
- لا يفسد المشروع إذا حُذف.

الجداول المقترحة:

```text
files(id, path, hash, mtime, type)
elements(id, file_id, path, tag, classes, text)
tokens(id, namespace, name, value, theme)
components(id, name, file, schema_json)
usages(token_id, element_id)
issues(id, file_id, element_path, category, severity, message)
revisions(id, created_at, label, manifest)
```

### 12.3 Cache

- Tailwind output hash.
- candidate set hash.
- AST cache.
- thumbnails.

## 13. الأمان

### 13.1 Electron

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- preload API ضيقة.
- CSP صارم.
- تعطيل navigation الخارجي.
- التحقق من كل IPC.

### 13.2 الملفات

- منع path traversal.
- confinement إلى مجلد المشروع.
- تأكيد قبل حذف/نقل.
- نسخ احتياطي قبل العمليات الخطرة.

### 13.3Preview

- أصل منفصل.
- sandbox iframe.
- لا وصول مباشر إلى Node.
- اعتراض/تسجيل الأخطاء.
- تحذير عند تشغيل scripts خارجية.

### 13.4 Plugins

- manifest بصلاحيات.
- تشغيل في worker.
- لا وصول للملفات إلا عبر API.
- مراجعة/توقيع اختياري.

### 13.5 AI

- لا تنفيذ كود من الناتج.
- تحقق schema.
- تعقيم HTML إذا كان سيُعرض خارج المعاينة.
- عدم إرسال أسرار.

## 14. الأداء

### الأهداف

| العملية | الهدف |
|---|---|
| فتح مشروع 100 صفحة | < 3s |
| فتح مشروع 1000 صفحة | < 10s |
| تعديل class | < 100ms perceived |
| Tailwind incremental | < 100ms نموذجي |
| بحث | < 50ms |
| حفظ | < 50ms |

### الاستراتيجيات

- Workers.
- Virtualized tree.
- IndexedDB/SQLite index.
- Debounce + cancellation.
- Lazy components.
- CSS hot swap.
- عدم إعادة بناء كل المشروع.
- Memory budget ومراقبة.

## 15. الاختبار

| النوع | الأداة |
|---|---|
| Unit | Vitest |
| Parser fuzzing | fast-check |
| Golden Tailwind output | snapshots |
| Integration | Playwright |
| Visual regression | Playwright screenshots |
| Performance | benchmark suite |
| Security | dependency audit + IPC tests |
| Migration | مشاريع v3/v4 عينة |

## 16. حدود معمارية يجب توثيقها للمستخدم

1. المحتوى الديناميكي بالكامل لا يمكن تحريره بصريًا.
2. بعض custom utilities/plugins قد لا تظهر في controls.
3. المعاينة قد تختلف عن المتصفح المستهدف في حالات CSS المتقدمة.
4. المكونات تُوسَّع وقت البناء، وليست runtime.
5. التصدير النظيف يعني فقدان metadata الخاصة بالمحرر، لكن المشروع الأصلي يحتفظ بها.

## 17. قرارات مفتوحة

- Electron vs Tauri.
- in-process Tailwind vs CLI.
- SQLite vs JSON index.
- مكونات `<tep-*>` vs `data-tep-*`.
- دعم frameworks في v1.
- سحابة/CRDT.
- plugin sandbox النهائي.

هذه القرارات تحتاج نموذجًا أوليًا وقياسًا، وليست قرارات ورقية فقط.
