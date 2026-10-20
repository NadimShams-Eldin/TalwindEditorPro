# 02 - تحليل Tailwind CSS v4

> المرجع: وثائق Tailwind CSS v4.3 الرسمية، تاريخ الوصول 2026-10-20.

## 1. لماذا Tailwind مناسب لمنتجنا

Tailwind ليس مكتبة مكونات جاهزة. هو **لغة utilities + design tokens + variants + build engine**. هذا يجعله مناسبًا لمنتج يريد:

- تحكمًا دقيقًا في التصميم.
- كودًا قابلًا للتصدير.
- نظام ثيم مركزي.
- استجابة وحالات (states) بشكل موحد.
- تقليل CSS المخصص والمتضخم.

لكنه في الوقت نفسه يجعل المحرر البصري أصعب، لأن التنسيق موزع على classes كثيرة، وليس على rules قليلة.

## 2. كيف يعمل Tailwind v4

### 2.1 خط الأنابيب

```text
Source files (HTML, JSX, Vue, ...)
        │
        ▼
Content scanner (Oxide)
  - يقرأ الملفات كنص عادي
  - يستخرج tokens تشبه class names
        │
        ▼
Candidate set (classes مرشحة)
        │
        ▼
Utility resolver + theme
  - يحوّل كل candidate إلى CSS declarations
  - يستبعد ما لا يطابق utility معروفًا
        │
        ▼
Generated CSS
  - utilities + variants + @theme variables + preflight
        │
        ▼
Lightning CSS
  - nesting, vendor prefixes, imports
        │
        ▼
Output stylesheet
```

`[موثق]` Tailwind يعامل الملفات كنص عادي ولا يحللها ككود. لذلك لا يفهم string concatenation أو interpolation.

### 2.2 محركات البناء الرسمية

| الأداة | الحزمة | الاستخدام |
|---|---|---|
| Vite plugin | `@tailwindcss/vite` | الأفضل لمشاريع Vite |
| PostCSS plugin | `@tailwindcss/postcss` | تكامل عام مع PostCSS |
| CLI | `@tailwindcss/cli` | بناء مستقل |
| Oxide | scanner/engine | المسح والأداء |

`[موثق]` في v4 لم يعد `tailwindcss` نفسه PostCSS plugin؛ انتقل إلى `@tailwindcss/postcss`.

### 2.3 CSS-first configuration

v4 يعتمد على CSS بدل `tailwind.config.js`:

```css
@import "tailwindcss";

@theme {
  --color-brand-500: oklch(0.62 0.19 250);
  --font-display: "Satoshi", sans-serif;
  --breakpoint-3xl: 120rem;
}
```

`[موثق]` theme variables ليست مجرد CSS variables؛ هي تُعلن لـ Tailwind أي utilities وvariants يجب أن توجد. namespace مثل `--color-*` يولّد `bg-*`، `text-*`، `border-*` وغيرها. `--breakpoint-*` يولّد variants مثل `3xl:*`.

### 2.4 أهم الـ directives

| Directive | الوظيفة | أهمية للمحرر |
|---|---|---|
| `@import "tailwindcss"` | تحميل Tailwind | نقطة البداية |
| `@theme` | تعريف tokens | مصدر الحقيقة للثيم |
| `@source` | تسجيل ملفات/مسارات للمسح | ضروري للمكتبات الخارجية |
| `@source inline()` | safelist classes | بديل `safelist` |
| `@utility` | utility مخصص | يجب أن يظهر في المحرر |
| `@variant` | تطبيق variant داخل CSS | تحرير CSS متقدم |
| `@custom-variant` | variant مخصص | يجب دعمه في الـ UI |
| `@apply` | تضمين utilities في CSS | أساس Component Styles |
| `@reference` | جلب الثيم للـ CSS modules/Vue/Svelte | مهم للتحرير داخل المكونات |
| `@config` | تحميل config قديم | توافق v3 |
| `@plugin` | تحميل plugin قديم | توافق بيئي |

### 2.5 functions

| Function | الوظيفة |
|---|---|
| `--alpha(color / 50%)` | تعديل الشفافية |
| `--spacing(n)` | قيمة من مقياس spacing |
| `theme(...)` | قراءة قيمة من الثيم، deprecated لصالح CSS variables |

## 3. scanning والأصناف الديناميكية

### 3.1 القاعدة الأساسية

`[موثق]` يجب أن توجد أسماء الأصناف كاملة في الملفات. لا يجوز:

```html
<div class="text-{{ error ? 'red' : 'green' }}-600"></div>
```

بل:

```html
<div class="{{ error ? 'text-red-600' : 'text-green-600' }}"></div>
```

### 3.2 الملفات التي تُمسح

- كل الملفات ما عدا:
  - ما هو في `.gitignore`
  - `node_modules`
  - الملفات الثنائية
  - ملفات CSS
  - lock files

### 3.3 التحكم في المصادر

```css
@import "tailwindcss" source("../src");
@source "../node_modules/@acme/ui-lib";
@source not "../src/legacy";
@source inline("{hover:,focus:,}bg-red-{50,{100..900..100},950}");
```

### 3.4 الأثر على المحرر البصري

هذه النقطة هي **أخطر نقطة تقنية** في أي محرر Tailwind:

1. المحرر يضيف classes إلى DOM.
2. Tailwind scanner قد لا يراها إذا كانت الصفحة لم تُحفظ أو إذا كانت تُبنى ديناميكيًا.
3. النتيجة: class موجود في DOM لكن CSS غير مولّد، فيبدو التغيير بلا تأثير.

الحلول المطلوبة:

- بناء candidate set من AST المحرر، وليس فقط من الملفات المحفوظة.
- تمرير candidates إلى Tailwind عبر `@source inline()` أو API مخصص.
- إعادة البناء Incremental فور تغيير class.
- التحقق من وجود CSS rule لكل class مستخدم.
- تمييز class "غير معروف" أو "غير مولّد" في الواجهة.

## 4. variants

### 4.1 الفئات

| الفئة | أمثلة |
|---|---|
| Responsive | `sm:`, `md:`, `lg:` |
| Pseudo-state | `hover:`, `focus:`, `active:`, `disabled:` |
| Theme | `dark:` |
| Group/peer | `group-hover:`, `peer-checked:` |
| Data/ARIA | `data-*:`, `aria-*:` |
| Structural | `*:`, `first:`, `last:`, `odd:`, `even:` |
| Container queries | `@sm:`, `@container` |
| Arbitrary | `[&>svg]:` |
| Custom | `@custom-variant` |

### 4.2 ترتيب التراكب

`[موثق]` في v4 تُطبق variants المتراكمة من اليسار إلى اليمين، بعكس v3. هذا يكسر مشاريع قديمة تعتمد على الترتيب.

مثال:

```html
<ul class="py-4 *:first:pt-0 *:last:pb-0">
```

بدل:

```html
<ul class="py-4 first:*:pt-0 last:*:pb-0">
```

### 4.3 hover على الأجهزة اللمسية

`[موثق]` في v4 أصبح `hover:` محاطًا بـ `@media (hover: hover)`. هذا يمنع hover الوهمي على اللمس، لكنه يكسر مواقع تعتمد على tap-hover.

### 4.4 الأثر على المحرر

- المحرر يجب أن يعرف أي variants مفعلة في الثيم.
- يجب أن يعرض composition بشكل شجري، لا كنص فقط.
- يجب أن يشرح الفرق بين `md:` و`max-md:` و`min-[...]`.
- يجب أن يمنع إنشاء variant غير موجود، أو يحذّر.

## 5. الأصناف وال conflicting utilities

### 5.1 المشكلة

Tailwind نفسه لا يمنع تعارض الأصناف:

```html
<div class="p-4 p-6 bg-red-500 bg-blue-500"></div>
```

CSS الناتج يحتوي القاعدتين، والفائز يعتمد على ترتيب الـ stylesheet، لا على ترتيب class في HTML.

### 5.2 الحل الشائع

`tailwind-merge` يحلل class strings ويحذف المتعارض. لكنه:

- يحتاج تحديثًا مع كل إصدار Tailwind.
- لا يفهم arbitrary values المعقدة دائمًا.
- لا يحل التعارض بين variant scopes المختلفة.

### 5.3 ما يحتاجه المحرر

نموذج `UtilityIR` + `ConflictResolver`:

```text
p-4 + p-6        -> p-6
bg-red-500 + !bg-blue-500 -> !bg-blue-500
md:p-4 + p-6     -> يحتفظ بالاثنين (scopes مختلفة)
hover:bg-red-500 + bg-blue-500 -> يحتفظ بالاثنين
```

## 6. theme وdesign tokens

### 6.1 namespaces الأساسية

| Namespace | يولّد |
|---|---|
| `--color-*` | `bg-*`، `text-*`، `border-*`، `fill-*` |
| `--font-*` | `font-*` |
| `--text-*` | `text-*` (size) |
| `--font-weight-*` | `font-*` (weight) |
| `--tracking-*` | `tracking-*` |
| `--leading-*` | `leading-*` |
| `--breakpoint-*` | `sm:*`، `md:*` |
| `--container-*` | `@sm:*`، `max-w-*` |
| `--spacing-*` | `p-*`، `m-*`، `gap-*` |
| `--radius-*` | `rounded-*` |
| `--shadow-*` | `shadow-*` |
| `--blur-*` | `blur-*` |
| `--aspect-*` | `aspect-*` |
| `--ease-*` | `ease-*` |
| `--animate-*` | `animate-*` |

### 6.2 ما يجب أن يفعله المحرر

1. قراءة `@theme` وبناء token graph.
2. عرض tokens بأسماء دلالية، لا أرقام فقط.
3. منع استخدام قيمة غير موجودة في الثيم إلا كـ arbitrary value مع تحذير.
4. عند تغيير token، تحديث كل utility مستخدمة تلقائيًا.
5. عند حذف token، إظهار كل الأماكن المتأثرة قبل الحذف.
6. دعم `@theme inline` و`static`.
7. دعم الثيمات المتعددة (light/dark/براند) كـ token sets.

### 6.3 مشكلة حذف/إعادة تسمية token

إذا حُذف `--color-brand-500`، فكل `bg-brand-500` يصبح class غير معروف. المحرر يجب أن:

- يمنع الحذف الصامت.
- يعرض impact analysis.
- يقترح بديلًا.
- يحدث الكود في transaction واحدة.

## 7. الاستجابة

### 7.1 mobile-first

`[موثق]` Tailwind يعتمد mobile-first. القيمة على `md:` تؤثر على `md` وما فوق. المحرر يجب أن يعرض القيمة الفعلية الموروثة، لا فقط القيمة المعينة على breakpoint الحالي.

### 7.2 ما يحتاجه المحرر

- شريط breakpoints قابل للتخصيص من `--breakpoint-*`.
- عرض inheritance لكل خاصية.
- تحرير "القيمة الحالية" مع إظهار مصدرها.
- كشف overrides غير الضرورية.
- معاينة متعددة الأحجام في وقت واحد.
- مقارنة قبل/بعد لكل breakpoint.

## 8. البناء والتوافق

### 8.1 المتصفحات

`[موثق]` Tailwind v4.0 يدعم:
- Chrome 111+
- Safari 16.4+
- Firefox 128+

إذا كان العميل يحتاج متصفحات أقدم، يجب البقاء على v3.4. هذا قرار يجب أن يظهر في المحرر عند إنشاء مشروع.

### 8.2 preprocessors

`[موثق]` Tailwind v4 ليس مصممًا للعمل مع Sass/Less/Stylus. هو نفسه build tool. هذا يبسّط stack لكنه يكسر مشاريع قديمة.

### 8.3 CSS modules وVue/Svelte

`[موثق]` كل CSS module أو `<style scoped>` يعالج منفصلًا، ما يضاعف وقت البناء. الحل: `@reference` أو استخدام CSS variables بدل `@apply`.

### 8.4 الهجرة من v3 إلى v4

تغييرات مؤثرة:

| v3 | v4 |
|---|---|
| `@tailwind base/components/utilities` | `@import "tailwindcss"` |
| `shadow-sm` | `shadow-xs` (المعنى تغير) |
| `shadow` | `shadow-sm` |
| `rounded-sm` | `rounded-xs` |
| `blur-sm` | `blur-xs` |
| `outline-none` | `outline-hidden` |
| `ring` (3px) | `ring` (1px)، استخدم `ring-3` للسلوك القديم |
| `!flex` | `flex!` |
| `bg-[--brand]` | `bg-(--brand)` |
| variants من اليمين لليسار | من اليسار لليمين |
| border افتراضي gray-200 | currentColor |
| hover يعمل على اللمس | `@media (hover: hover)` |
| `flex-shrink-*` | `shrink-*` |

`[موثق]` توجد أداة ترقية رسمية: `npx @tailwindcss/upgrade`، وتتطلب Node 20+.

### 8.5 الأثر على المنتج

- يجب أن يدعم المحرر v3 وv4؟ التوصية: v4 فقط في v1، مع أداة ترقية لاحقة.
- يجب أن يكشف إصدار Tailwind في المشروع ويعدل سلوكه.
- يجب أن يحذر من classes مهجورة.
- يجب أن يدعم `@config` و`@plugin` للمشاريع القديمة.

## 9. القيود التي تخلق فرصًا

| القيد | الفرصة |
|---|---|
| scanning نصي لا يفهم الديناميكية | محرر يبني candidates من AST ويضمن التوليد |
| classes متعارضة | conflict resolver مدمج |
| class soup | كشف الأنماط المتكررة واقتراح مكونات |
| theme tokens سهلة الحذف | impact analysis وmigration |
| variants كثيرة | واجهة composition ذكية |
| صعوبة معرفة class غير موجود | تحقق فوري |
| بناء CSS غير شفاف | عرض CSS الناتج لكل class |
| هجرة v3/v4 | أداة ترقية مدمجة |
| صعوبة responsive | محرر inheritance |
| صعوبة accessibility | فحص مدمج مرتبط بالعناصر |

## 10. ما يجب أن يدعمه المحرر تقنيًا

### 10.1 الحد الأدنى

- Tailwind v4 عبر المحرك الرسمي.
- `@theme` و`@utility` و`@custom-variant`.
- scanning من AST + ملفات.
- incremental compile.
- class parser + conflict resolver.
- variants + responsive + states.
- arbitrary values.
- `@apply` في Component Styles.
- external build اختياري.

### 10.2 المتقدم

- ثيمات متعددة.
- plugins.
- container queries.
- RTL logical properties.
- CSS layers.
- migration v3 -> v4.
- custom utilities.
- safelist management.
- CSS output inspector.

## 11. قرارات تقنية مقترحة

1. **لا تكتب محرك Tailwind من الصفر.** استخدم المحرك الرسمي عبر adapter.
2. **ابنِ طبقة IR خاصة بك.** المحرك الرسمي يولد CSS، لكنه لا يعطيك نموذجًا بصريًا للـ classes.
3. **لا تعتمد على DOM وحده.** استخدم AST + source locations.
4. **اجعل candidate set مشتركًا بين المحرر والمحرك.** هذا يحل مشكلة الأصناف الديناميكية.
5. **اعرض CSS الناتج.** الشفافية تبني الثقة.
6. **اربط الجودة بالـ IR.** يمكنك معرفة تعارض spacing أو لون قبل البناء.

## 12. المخاطر

| الخطر | الأثر | التخفيف |
|---|---|---|
| تغير Tailwind بسرعة | كسر المحرك/الـ IR | adapter + version pinning + اختبارات توافق |
| الاعتماد على APIs داخلية | عدم استقرار | استخدام الحزم الرسمية الموثقة، وCLI كـ fallback |
| تعقيد arbitrary values | parser هش | AST parser + اختبارات property-based |
| تعدد build tools | مصفوفة دعم كبيرة | v1 يدعم Vite/CLI فقط |
| أداء المشاريع الكبيرة | بطء | incremental + workers + cache |
| ترخيص العلامة التجارية | مشكلة قانونية | مراجعة قانونية قبل الاسم والتسويق |

## 13. خلاصة

Tailwind v4 يوفر أساسًا قويًا للثيم والبناء، لكنه يترك فجوة كبيرة في **الفهم الدلالي للأصناف وتجربة التحرير البصري**. هذه الفجوة هي بالضبط مكان المنتج المقترح: طبقة ذكية فوق محرك Tailwind الرسمي، تفهم البنية، وتضمن الصحة، وتسرّع البناء، دون اختراع لغة جديدة أو قفل الكود.
