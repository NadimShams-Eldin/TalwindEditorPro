# 15 - كيف نبني هذا المشروع

> هذا المستند جواب عملي على سؤال "كيف نبنيه؟" من موقع شريك، لا من موقع مالك منتج. الهدف: أول نسخة تثبت وعد الثقة، بأقل بناء ممكن.

## 1. فلسفة البناء

### 1.1 ابنِ العمود الفقري أولًا

لا نبدأ باللوحات الجميلة. نبدأ بالمسار الكامل:

```text
افتح مشروعًا → عدّل عنصرًا → افهم الأثر → احفظ → تراجع → معاينة
```

إذا عمل هذا المسار بثقة، بقية الميزات إضافات. إذا لم يعمل، لا قيمة لأي لوحة.

### 1.2 الثقة قبل الميزات

كل أسبوع نسأل: "هل يمكن لمستخدم أن يفقد عمله الآن؟" إذا الجواب نعم، نوقف ونصلح.

### 1.3 Demo كل أسبوع

لا نقبل "اكتمل 80%" بلا عرض حي. العرض يكون على مشروع حقيقي، لا على fixture مثالي.

### 1.4 لا نبنيه كله

نرفض: محرر CSS من الصفر، runtime إنتاج، collaboration فوري، دعم كل الأطر. نستخدم ما يوجد ونضيف الطبقة التي تصنع الفارق.

## 2. الهيكل التقني

### 2.1 Monorepo

```text
/apps
  /desktop            Electron shell + IPC
  /cli                أدوات تصدير/فحص (لاحقًا)
/packages
  /core               Project, Document, Editor, Commands (بلا Electron/React)
  /fs                 FileSystem port + implementations
  /parser             HTML AST + source mapping
  /tailwind           BuildPort + adapters (CLI/WASM)
  /class-ir           Tokenizer, Resolver, ConflictResolver
  /tokens             Theme graph, impact analysis
  /components         Schema, extraction, expansion
  /quality            HTML/a11y/links/rules
  /ai                 Patch protocol, validation, providers
  /preview            Bridge protocol + runtime
  /ui                 React components (لا تعرف الملفات مباشرة)
/tests
  /fixtures           مشاريع HTML حقيقية
  /golden             نتائج round-trip
  /e2e                Playwright
```

### 2.2 قاعدة الاعتماد

```text
ui → core ← adapters
core لا يعرف Electron ولا React ولا DOM المتصفح.
adapters تنفذ ports: FileSystem, Build, Preview, AI, Storage.
```

هذا يسمح باختبار النواة بسرعة، وبنقلها إلى Web لاحقًا.

### 2.3 الواجهات الأساسية

```ts
export interface FileSystemPort {
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<void>;
  list(root: string, glob: string): Promise<string[]>;
  watch(root: string, cb: (e: FileEvent) => void): Promise<() => void>;
}

export interface BuildPort {
  configure(opts: BuildOptions): Promise<void>;
  build(): Promise<BuildResult>;
  watch(cb: (r: BuildResult) => void): Promise<() => void>;
  status(): BuildStatus;
}

export interface PreviewPort {
  load(html: string, css: string): Promise<void>;
  applyCss(css: string): Promise<void>;
  select(elementId: string): Promise<void>;
  snapshot(): Promise<string>;
}

export interface CompilerPort {
  compile(candidates: string[], theme: Theme): Promise<CompileResult>;
  resolve(className: string): Promise<ResolvedUtility | null>;
}

export interface AIProvider {
  propose(context: AIContext): Promise<PatchCard>;
}
```

### 2.4 نموذج الأوامر

كل إجراء يمر بـ command:

```ts
type Command = {
  id: string;
  kind: "class.add" | "class.remove" | "attr.set" | "text.set" | "component.extract";
  target: ElementRef;
  payload: unknown;
  origin: "ui" | "ai" | "import" | "code";
};
```

`Command → validate → patch → apply → ledger → verify`.

لا كتابة مباشرة من UI إلى ملف.

## 3. أول 90 يومًا

### الأسبوع 1: الهيكل والعمود الفقري

- Monorepo + CI.
- Electron + React + TypeScript.
- فتح مجلد وعرض ملف HTML.
- Parser + round-trip.
- **عرض:** فتح مشروع وحفظه دون تغيير بايت واحد.

### الأسبوع 2: المعاينة والتحديد

- Iframe + bridge.
- `data-tep-id` injection.
- تحديد عنصر من canvas.
- مزامنة tree.
- **عرض:** انقر على عنصر، يظهر في الشجرة.

### الأسبوع 3: التحرير والحفظ

- Class add/remove.
- Save + undo.
- External change handling.
- **عرض:** عدّل 10 عناصر، احفظ، تراجع.

### الأسبوع 4: Tailwind

- BuildAdapter (CLI).
- CSS hot swap.
- كشف build.
- **عرض:** غيّر class، يتحدث CSS في <150ms.

### الأسبوع 5: Class IR

- Tokenizer + Resolver.
- Conflict Resolver.
- Explain panel.
- **عرض:** تعارض بين صنفين، يشرح الفائز ويقترح إصلاحًا.

### الأسبوع 6: Inspector وClass Tree

- الحقول الأساسية.
- Class Tree.
- Unknown class.
- **عرض:** بناء قسم كامل بصريًا.

### الأسبوع 7: Tokens

- `@theme` parser.
- Token panel.
- Impact count.
- **عرض:** غيّر لونًا واعرض أثره.

### الأسبوع 8: Responsive

- Breakpoints.
- Responsive Ribbon.
- States.
- **عرض:** نفس القسم على 4 مقاسات.

### الأسبوع 9: Import Contract

- Index + scan.
- Fidelity report.
- Surgical edit mode.
- **عرض:** استيراد موقع حقيقي وتقرير 99%.

### الأسبوع 10: Build Bridge

- اكتشاف تلقائي.
- Health check.
- Drift detector.
- **عرض:** بناء خارجي متصل بحالة واضحة.

### الأسبوع 11: الأداء والاستقرار

- 1000 صفحة.
- Virtualization.
- Crash recovery.
- **عرض:** فتح مشروع كبير < 10s.

### الأسبوع 12: Alpha داخلية

- 5 مستخدمين.
- 10 مهام.
- قياس.
- **عرض:** بناء صفحة كاملة في 20 دقيقة.

## 4. Spikes

| ID | السؤال | الطريقة | معيار النجاح | المدة |
|---|---|---|---|---|
| SP-01 | round-trip دقيق؟ | 50 ملف HTML حقيقي | 99%+ تطابق | 3 أيام |
| SP-02 | Tailwind برمجيًا؟ | compile عينة | <300ms | 3 أيام |
| SP-03 | hot swap؟ | iframe bridge | <150ms | 2 أيام |
| SP-04 | computed effects؟ | getComputedStyle | <16ms/عنصر | 3 أيام |
| SP-05 | ربط DOM/AST؟ | injection | 99% دقة | 2 أيام |
| SP-06 | عزل العمليات؟ | Electron sandbox | 0 وصول غير مصرح | 2 أيام |
| SP-07 | مشروع كبير؟ | 1000 صفحة | <10s فتح | 3 أيام |
| SP-08 | AI patch صالح؟ | 50 طلبًا | 95% صالح | 2 أيام |
| SP-09 | RTL transform؟ | 100 أداة | 95% صحيح | 2 أيام |
| SP-10 | tokens من Figma؟ | export عينة | 90% مطابقة | 2 أيام |

**قاعدة:** لا تبدأ ميزة معتمدة على spike فاشل. غيّر التصميم أولًا.

## 5. استراتيجية الاختبار

### 5.1 Unit

- Class tokenizer/resolver.
- Conflict rules.
- Theme parser.
- Patch validation.

### 5.2 Golden

- 50 مشروع HTML.
- حفظ → مقارنة بايتية (مع استثناءات موثقة).
- أي انحراف يفشل CI.

### 5.3 Property-based

- Round-trip: parse(serialize(x)) == parse(x).
- Class operations: add/remove idempotent.
- Undo/redo: state machine invariants.

### 5.4 Visual regression

- 20 صفحة × 4 breakpoints.
- Playwright screenshots.
- عتبة ضوضاء صغيرة.

### 5.5 E2E

- فتح مشروع.
- تعديل.
- حفظ.
- تصدير.
- كشف تعارض.
- استيراد.

### 5.6 اختبار الفوضى

- قطع اتصال build.
- ملف معدّل خارجيًا.
- crash أثناء الحفظ.
- ملف ضخم.
- HTML غير صالح.

## 6. تعريف "منجز"

الميزة منجزة فقط إذا:

1. تعمل على مشروع حقيقي، لا fixture فقط.
2. لها اختبار آلي.
3. قابلة للتراجع.
4. لا تكسر export.
5. موثقة في UI (تلميح/شرح).
6. قيست (زمن/أخطاء).
7. عُرضت في demo.

## 7. الأداء

| العملية | الميزانية |
|---|---|
| فتح مشروع 100 صفحة | < 3s |
| فتح 1000 صفحة | < 10s |
| تعديل class | < 100ms |
| تحديث CSS | < 150ms |
| تحديد عنصر | < 50ms |
| بحث | < 100ms |
| حفظ | < 200ms |

نتوقف عن إضافة ميزات إذا تجاوزنا الميزانية بأكثر من 20%.

## 8. الأمان

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
- Preview في iframe مع CSP.
- لا تنفيذ سكربتات المشروع في عملية المحرر.
- Build commands من قائمة مسموحة/موافقة صريحة.
- تحقق من المسارات (path traversal).
- لا رفع ملفات بلا إذن.

## 9. الفريق والعملية

### 9.1 إيقاع

- يومي: 15 دقيقة.
- أسبوعي: demo + قرارات.
- كل أسبوعين: مراجعة مقاييس.
- شهري: مراجعة نطاق ومخاطر.

### 9.2 وثائق القرار

كل قرار معماري في `docs/adr/NNNN-title.md`:

```text
Context
Decision
Alternatives
Consequences
```

### 9.3 قالب المهمة

```text
المانع: B-xx
الحل: S-xx
الميزة:
معيار القبول:
المقياس:
مخاطر:
ما لا نبنيه:
```

### 9.4 مراجعة الكود

- لا merge بلا اختبار.
- لا merge يزيد الحزمة > 50KB بلا مبرر.
- لا `any` في النواة.
- لا منطق ملفات في UI.

## 10. ما نبنيه أولًا وما نؤجله

### نبني أولًا

1. Parse + round-trip.
2. Preview + selection.
3. Save + undo.
4. Tailwind build.
5. Class IR + conflicts.
6. Tokens.
7. Responsive.
8. Import report.

### نؤجل

1. AI.
2. Collaboration.
3. Publish.
4. Marketplace.
5. Plugins.
6. CMS.
7. WordPress.
8. Frameworks.

### قد نلغي

| الميزة | شرط الإلغاء |
|---|---|
| Intent Controls | إذا أظهرت الاختبارات أنها تربك المستخدم |
| AI | إذا لم يتجاوز 90% صلاحية |
| Time Travel | إذا لم يستخدمه 20% في الاختبار |
| Style Guide | إذا لم يطلبه أي مستخدم |
| Recipes | إذا لم تُستخدم في alpha |

## 11. كيف نعرف أننا مخطئون

| إشارة | التفسير | الاستجابة |
|---|---|---|
| مستخدمون يعودون للكود كل 5 دقائق | الثقة ناقصة | وقف الميزات، إصلاح التفسير |
| جلسات قصيرة | لا قيمة أولية | تبسيط onboarding |
| شكاوى "بطيء" | أداء | تحسين قبل أي ميزة |
| لا أحد يستخدم المكونات | النموذج معقد | إعادة تصميم X-Ray/Extract |
| تصدير يحتاج تعديلًا يدويًا | parity مكسور | إصلاح فوري |
| AI يُرفض دائمًا | الاقتراحات ضعيفة | تحسين السياق أو إيقافه |

## 12. مقايضات كشريك

### ما أصرّ عليه

1. **دقة round-trip.** بدونها لا منتج.
2. **Ledger + Preview.** بدونها لا ثقة.
3. **Build parity.** بدونها لا تسليم.
4. **اختبارات golden.** بدونها لا استقرار.
5. **نطاق ضيق.** بدونها لا إنجاز.

### ما أقبله مؤقتًا

1. أداء أقل على المشاريع الضخمة في alpha.
2. RTL أساسي قبل الكامل.
3. AI متأخر.
4. UI غير نهائي.
5. دعم منصة واحدة (macOS أو Linux) أولًا.

### ما أرفضه

1. "سنصلح الدقة لاحقًا".
2. "سنضيف collaboration لأنه ممتع".
3. "سنبني محرر CSS خاصًا".
4. "سندعم كل الأطر في v1".
5. "AI سيحل مشاكل التصميم".

## 13. خطة 12 شهرًا

```text
Q1: العمود الفقري + Tailwind + Class IR
Q2: Tokens + Responsive + Import + Alpha
Q3: Components + Quality + RTL + Beta خاص
Q4: AI + Publish + Review (v1.5) + Beta عام
```

## 14. الخلاصة

البناء ليس ماراثون ميزات. هو **إثبات تدريجي للثقة**:

1. لا نفقد كود المستخدم.
2. نشرح كل تغيير.
3. نجعل الاستجابة مفهومة.
4. نضمن تطابق المعاينة والإنتاج.
5. نجعل التحسين آمنًا.

إذا تحققت هذه الخمسة، يصبح الباقي توسعًا طبيعيًا. وإذا فشل واحد منها، لا ينقذ المنتج أي عدد من اللوحات الجميلة.
