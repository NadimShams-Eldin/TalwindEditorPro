# 08 - نموذج البيانات وتجربة المستخدم

## 1. نموذج البيانات

### 1.1 مبادئ

1. الملفات هي مصدر الحقيقة.
2. `.tep/` metadata قابلة للحذف.
3. كل كائن له `id` ثابت و`version`.
4. لا نحفظDOM كاملًا في قاعدة البيانات.
5. كل مرجع لكائن آخر يستخدم `id`، لا path هشًا.

### 1.2 الكائنات الأساسية

```ts
type Project = {
  id: string;
  name: string;
  root: string;
  tailwindVersion: "3" | "4";
  buildMode: "builtin" | "external";
  themeId: string;
  createdAt: string;
  updatedAt: string;
};

type Page = {
  id: string;
  file: string;
  title: string;
  layoutId?: string;
  route: string;
  status: "draft" | "published";
};

type Document = {
  file: string;
  kind: "html" | "css" | "js" | "json" | "md";
  hash: string;
  mtime: number;
  ast?: unknown;
  dirty: boolean;
};

type ElementNode = {
  id: string;
  path: string;
  tag: string;
  attributes: Record<string, string>;
  classes: string[];
  text?: string;
  children: string[];
  source: SourceRange;
};

type SourceRange = {
  start: number;
  end: number;
  startTag?: [number, number];
  endTag?: [number, number];
};

type ComponentDef = {
  id: string;
  name: string;
  file: string;
  schemaFile: string;
  props: PropDef[];
  slots: SlotDef[];
  variants: VariantDef[];
  dependencies: string[];
  version: number;
};

type PropDef = {
  name: string;
  type: "string" | "number" | "boolean" | "image" | "url" | "enum";
  required: boolean;
  default?: unknown;
  options?: string[];
};

type SlotDef = {
  name: string;
  required: boolean;
  multiple: boolean;
};

type ComponentInstance = {
  id: string;
  componentId: string;
  props: Record<string, unknown>;
  slots: Record<string, string>;
  overrides?: Record<string, string>;
};

type Token = {
  id: string;
  namespace: string;
  name: string;
  value: string;
  type: "color" | "spacing" | "font" | "radius" | "shadow" | "breakpoint" | "other";
  themeId: string;
  aliases: string[];
};

type Theme = {
  id: string;
  name: string;
  selector: string;
  tokens: Token[];
  darkSelector?: string;
};

type StyleRule = {
  id: string;
  file: string;
  selector: string;
  media?: string;
  declarations: Declaration[];
  source: SourceRange;
};

type Declaration = {
  property: string;
  value: string;
  important: boolean;
};

type Asset = {
  id: string;
  path: string;
  type: "image" | "font" | "video" | "audio" | "other";
  width?: number;
  height?: number;
  hash: string;
  usedBy: string[];
};

type Revision = {
  id: string;
  label: string;
  createdAt: string;
  author: string;
  manifest: string;
  parentId?: string;
};

type Issue = {
  id: string;
  severity: "error" | "warning" | "info";
  category: "html" | "a11y" | "tailwind" | "responsive" | "seo" | "perf";
  file: string;
  elementId?: string;
  range?: SourceRange;
  message: string;
  why: string;
  fixes: Fix[];
};

type Fix = {
  id: string;
  label: string;
  kind: "text-edit" | "class-edit" | "token-edit" | "attribute-edit";
  payload: unknown;
};
```

### 1.3 مخطط المشروع

`.tep/project.json`:

```json
{
  "schemaVersion": 1,
  "name": "client-site",
  "tailwindVersion": "4",
  "buildMode": "builtin",
  "themeId": "default",
  "entry": {
    "css": "src/app.css",
    "html": "index.html"
  },
  "features": {
    "components": true,
    "cms": false,
    "ai": true,
    "rtl": true
  }
}
```

### 1.4 مخطط المكون

`components/card.json`:

```json
{
  "schemaVersion": 1,
  "name": "Card",
  "props": [
    {
      "name": "title",
      "type": "string",
      "required": true
    },
    {
      "name": "image",
      "type": "image",
      "required": false
    }
  ],
  "slots": [
    {
      "name": "body",
      "required": true,
      "multiple": false
    }
  ],
  "variants": [
    {
      "name": "compact",
      "class": "p-4"
    }
  ]
}
```

### 1.5 قاعدة البيانات

```sql
CREATE TABLE files (
  id TEXT PRIMARY KEY,
  path TEXT UNIQUE NOT NULL,
  hash TEXT NOT NULL,
  mtime INTEGER NOT NULL,
  kind TEXT NOT NULL
);

CREATE TABLE elements (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  path TEXT NOT NULL,
  tag TEXT NOT NULL,
  classes TEXT NOT NULL,
  text TEXT,
  FOREIGN KEY(file_id) REFERENCES files(id)
);

CREATE TABLE tokens (
  id TEXT PRIMARY KEY,
  theme_id TEXT NOT NULL,
  namespace TEXT NOT NULL,
  name TEXT NOT NULL,
  value TEXT NOT NULL
);

CREATE TABLE usages (
  token_id TEXT NOT NULL,
  element_id TEXT NOT NULL,
  PRIMARY KEY(token_id, element_id)
);

CREATE TABLE issues (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  element_path TEXT,
  category TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  resolved INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE revisions (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  created_at TEXT NOT NULL,
  manifest TEXT NOT NULL,
  parent_id TEXT
);
```

### 1.6 الأحداث

```ts
type EditorEvent =
  | { type: "document:changed"; file: string }
  | { type: "selection:changed"; elementId: string }
  | { type: "class:added"; elementId: string; className: string }
  | { type: "class:removed"; elementId: string; className: string }
  | { type: "token:changed"; tokenId: string }
  | { type: "build:done"; cssHash: string }
  | { type: "build:error"; errors: string[] }
  | { type: "issue:found"; issue: Issue }
  | { type: "preview:ready"; url: string }
  | { type: "ai:patch"; patchId: string };
```

## 2. تجربة المستخدم

### 2.1 التخطيط الأساسي

```text
┌──────────────────────────────────────────────────────────────────┐
│ Topbar: project | mode | breakpoints | preview | undo | publish │
├──────────────┬───────────────────────────────────┬───────────────┤
│ Left         │ Canvas                            │ Right         │
│              │                                   │               │
│ Project      │  ┌─────────┐  ┌─────────┐         │ Inspector     │
│ Pages        │  │ Desktop │  │ Mobile  │         │ - Properties  │
│ Components   │  │         │  │         │         │ - Classes     │
│ Assets       │  └─────────┘  └─────────┘         │ - Tokens      │
│ Layers       │                                   │ - Issues      │
│              │                                   │               │
├──────────────┴───────────────────────────────────┴───────────────┤
│ Bottom: Code | Console | Timeline | Problems                     │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 الأوضاع

| الوضع | الاستخدام |
|---|---|
| Design | تحرير بصري + controls |
| Content | تحرير النصوص/الصور فقط |
| Code | محرر كود كامل |
| Preview | معاينة دون تحرير |
| Review | تعليقات وdiff |
| CMS | واجهة مبسطة للمستخدم النهائي |

### 2.3 اللوحات الأساسية

#### Inspector

- **Properties**: tag, id, attributes, ARIA.
- **Classes**: class tree مع variants.
- **Layout**: display, flex, grid, spacing.
- **Typography**: font, size, line-height, color.
- **Appearance**: background, border, shadow, radius.
- **Responsive**: breakpoint inheritance.
- **States**: hover, focus, active, disabled.
- **Tokens**: ربط القيم بالثيم.

#### Class Tree

```text
Element: <a class="...">
  base
    display: inline-flex
    padding: px-4 py-2
    background: bg-brand-500
    text: text-white
  hover
    background: hover:bg-brand-600
  md
    padding: md:px-6
```

#### Layers

- شجرة DOM مع أيقونات للمكونات.
- Drag & drop.
- إظهار العناصر المخفية.
- بحث.
- Virtualization.

#### Issues

- Filter by severity/category.
- Group by file.
- Click to select.
- Fix all (مع مراجعة).

#### Tokens

- عرض namespace.
- Color swatches.
- استخدام count.
- Impact analysis.
- Theme switcher.

### 2.4 التدفقات الأساسية

#### التدفق 1: إنشاء موقع من الصفر

```text
1. New project
2. Choose template or blank
3. Choose Tailwind v4
4. Name + location
5. Editor opens with index.html
6. Add section from library
7. Edit content + classes
8. Add page from layout
9. Preview responsive
10. Export or publish
```

#### التدفق 2: استيراد موقع موجود

```text
1. Open folder
2. Detect HTML/CSS/JS/Tailwind
3. Index project
4. Show unsupported features
5. Open page
6. Edit
7. Save
```

#### التدفق 3: بناء صفحة

```text
1. New page from layout
2. Drag section
3. Select element
4. Adjust layout
5. Set responsive values
6. Add hover state
7. Check issues
8. Save
```

#### التدفق 4: إنشاء مكون

```text
1. Select element(s)
2. Right click -> Extract component
3. Name
4. Review inferred props/slots
5. Create
6. Replace with instance
7. Reuse in pages
```

#### التدفق 5: تغيير الهوية

```text
1. Open Tokens
2. Select color
3. Change value
4. Impact preview
5. Apply
6. Review all pages
7. Undo if needed
```

#### التدفق 6: تحرير AI

```text
1. Select element
2. Ask AI
3. Review proposed patch
4. See diff
5. Apply
6. Verify preview
7. Undo if needed
```

#### التدفق 7: النشر

```text
1. Publish
2. Choose target
3. Review files
4. Run quality gate
5. Publish
6. Open URL
```

### 2.5 Onboarding

الهدف: أول قيمة في أقل من 10 دقائق.

```text
Welcome
  ├─ Open existing project
  ├─ Start from template
  └─ Learn with 3-minute interactive tour
```

Tour:

1. حدد عنصرًا.
2. غيّر padding.
3. بدّل breakpoint.
4. أضف hover.
5. شاهد الكود.
6. صدّر.

### 2.6 الاختصارات

| الاختصار | الوظيفة |
|---|---|
| `V` | Select |
| `T` | Text |
| `H` | Hand |
| `Cmd/Ctrl + K` | Command palette |
| `Cmd/Ctrl + Z` | Undo |
| `Cmd/Ctrl + Shift + Z` | Redo |
| `Cmd/Ctrl + S` | Save |
| `Cmd/Ctrl + P` | Quick open |
| `Cmd/Ctrl + Shift + P` | Command menu |
| `Cmd/Ctrl + 1..9` | Breakpoint |
| `Alt + Click` | Select parent |
| `Space` | Pan |
| `S` | Class tree |
| `G` | Grid editor |
| `Esc` | Deselect |

### 2.7 حالات الخطأ

| الحالة | السلوك |
|---|---|
| Tailwind build error | شريط خطأ + ملف/سطر + المعاينة تبقى آخر CSS صالح |
| HTML parse error | تحديد الموقع + عدم إتلاف الملف |
| Unknown class | تحذير أصفر + اقتراح |
| Conflict | تحذير + إصلاح |
| Token missing | حظر مع بديل |
| External change | نافذة تعارض |
| Preview crash | إعادة تشغيل + سجل |
| AI invalid patch | رفض + سبب |

### 2.8 إمكانية الوصول في المحرر نفسه

- تنقل كامل بلوحة المفاتيح.
- تباين عالٍ.
- دعم قارئ الشاشة للوحات.
- تقليل الحركة.
- أحجام خط قابلة للتعديل.
- عدم الاعتماد على اللون وحده.

### 2.9 RTL في الواجهة

- `dir=rtl` كامل.
- الأيقونات الاتجاهية تنعكس.
- لوحة المفاتيح لا تنعكس.
- المعاينة LTR/RTL.
- الأرقام تبقى LTR.
- الكود يبقى LTR.
- التقارير تدعم الاتجاهين.

### 2.10 الأداء المحسوس

- Skeleton أثناء التحميل.
- Optimistic UI.
- مؤشر build صغير.
- عدم حجب canvas.
- إلغاء العمليات عند التنقل.
- حفظ تلقائي مع مؤشر.

### 2.11 Empty states

- لا مشروع: خيارات واضحة.
- لا مكونات: اقتراح استخراج.
- لا issues: رسالة إيجابية.
- لا tokens: استيراد أو إنشاء.
- لا صفحات: إنشاء من layout.

### 2.12 مبادئ UX

1. لا تخفِ المعلومة، بل نظمها.
2. كل تحذير له إصلاح.
3. كل إجراء ثقيل له تقدم وإلغاء.
4. كل تغيير له تاريخ.
5. لا modal لکل شيء؛ استخدم panels.
6. الكود متاح دائمًا.
7. الحالة محفوظة عبر الجلسات.

## 3. مواصفات قبول UX

| السيناريو | معيار القبول |
|---|---|
| فتح مشروع | يظهر canvas خلال 3 ثوانٍ لمشروع 100 صفحة |
| تحديد عنصر | النقر في canvas يحدد الطبقة والكود |
| تغيير padding | يظهر الأثر خلال 100ms |
| responsive | تبديل breakpoint دون إعادة تحميل |
| token change | impact preview قبل التطبيق |
| AI patch | diff مرئي + تطبيق/إلغاء |
| export | تقرير نجاح مع الملفات والأحجام |
| error | لا فقدان بيانات |

## 4. قرارات UX مفتوحة

1. هل نبدأ بواجهة داكنة أم فاتحة؟
2. هل نعرض الكود أسفل أم في تاب منفصل؟
3. هل نستخدم panels عائمة أم ثابتة؟
4. هل نعرض تحذيرات Tailwind inline أم في لوحة؟
5. هل onboarding تفاعلي أم فيديو؟
6. هل ندعم تخصيص التخطيط الكامل؟

هذه القرارات تحتاج اختبارًا مع 5-8 مستخدمين.
