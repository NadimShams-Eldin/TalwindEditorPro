# 01 - تفكيك Pinegrow Web Editor

## 1. لماذا ندرسه

Pinegrow هو أقرب منتج ناضج إلى ما نريد بناءه: محرر بصري يعمل على HTML/CSS حقيقي، مع دعم Tailwind، ومكونات، ونشر. تفكيكه يساعدنا على فصل:

- ما يجب تقليده لأنه يخدم المحترف.
- ما يجب تجنبه لأنه يخلق تعقيدًا أو قيودًا.
- ما لم يفعله Pinegrow ويمكن أن يكون تمايزًا لنا.

## 2. هوية المنتج

`[موثق]` Pinegrow يصف نفسه كمحرر ويب بصري سطح مكتبي، يعمل مباشرة على ملفات HTML وCSS وJS. وهو ليس أداة تصميم مثل Figma، ولا أداة no-code. الوثائق تقول صراحة إنه غير مناسب لمن لا يعرف HTML/CSS، وإنه يهدف إلى تسريع عمل من يفهم الأساسيات.

`[موثق]` المنتج متاح كتطبيق سطح مكتب، وكإضافة WordPress ذاتية الاستضافة، وكـ Pinegrow Online. بعض الميزات تبقى حصرية لسطح المكتب، مثل SFTP في النشر.

`[موثق]` المشروع في Pinegrow هو مجلد على القرص. الملفات تبقى مملوكة للمستخدم، ويمكن فتح موقع موجود أو إنشاء مشروع جديد.

### النموذج الذهني

```text
مشروع = مجلد ملفات حقيقي
صفحة = ملف HTML حقيقي
تنسيق = CSS حقيقي
مكون = عنصر HTML + Actions + Editable Areas
حالة المشروع = ملفات metadata داخل المشروع
```

هذا النموذج هو أهم درس: **لا تخزين المحتوى في قاعدة بيانات مغلقة إذا كان الجمهور يريد ملكية الكود.**

## 3. خريطة الميزات

### 3.1 التحرير الأساسي

| الميزة | الوصف | الدلالة |
|---|---|---|
| Page View | معاينة حية قابلة للتحرير، بأحجام أجهزة متعددة | التحرير يحدث على الصفحة نفسها |
| Tree Panel | شجرة DOM دقيقة | ضرورية للمحترفين |
| Element Properties | خصائص العنصر وclasses وattributes | نقطة الربط مع الكود |
| Style Panel | تحرير CSS rules، active rules، media queries | عمق CSS حقيقي |
| Code Editor | تحرير HTML/CSS مباشر | لا حجب عن الكود |
| History | Undo/Redo وتغييرات | ثقة في التحرير |
| Drag & Drop | إدراج وإعادة ترتيب | سرعة بناء |
| Library Panel | عناصر ومكونات ومكتبات صفحات | إعادة استخدام |
| HTML Snippets | مقاطع قابلة لإعادة الاستخدام | إنتاجية |
| Multi-page Views | عدة صفحات/أحجام جنبًا إلى جنب | عمل responsive فعلي |

`[موثق]` الوثائق تحذر من أن فتح عدد كبير من Page Views يؤثر على الأداء. هذا قيد معماري مهم: كل view يستهلك DOM/render مستقل.

### 3.2 Tailwind Visual Editor

| الميزة | الوصف | ملاحظة |
|---|---|---|
| Visual Controls | تحكم بصري يقابل classes | يظهر كل variants حتى غير المفعلة |
| Class Tree Inspector | شجرة variants وclasses للعنصر والآباء | عرض شامل، وتحكم سريع |
| Class Styles | تجميع classes في نمط مسمى | يخزن في `data-pg-class-style` |
| Component Styles | Tailwind ينشئ CSS selector-based | يتطلب built-in compiler |
| Design Panel | ألوان، خطوط، خلفيات، JIT، saved designs | نقطة قوة واضحة |
| Tailwind Blocks | مكتبة blocks جاهزة | تسريع البداية |
| Component Libraries | TailwindUI وFlowbite Blocks | قيمة لكنها تعتمد على محتوى مدفوع |
| External Build | تكامل مع Tailwind CLI/npm | ضروري للـ plugins |
| Class Tree | إضافة/تعديل variants | لا يدعم class styles بالكامل |
| Custom Theme Sync | مطابقة controls مع config مخصص | فيه قيود موثقة |

`[موثق]` Pinegrow 8.4 أضاف دعم Tailwind CSS 4. Pinegrow 8 أدخل Component Styles وCSS Grid editor وStyle manager.

### 3.3 المكونات وإعادة الاستخدام

| الميزة | الوصف |
|---|---|
| Smart Components | عنصر HTML يمكن تحديثه في كل الصفحات |
| Editable Areas | تحديد المحتوى/الصور/الـ attributes/الـ classes القابلة للتعديل |
| Nested Components | مكونات داخل مكونات |
| Component Sections | تنظيم المكتبة |
| Make instance of | تحويل HTML موجود إلى instance |
| Load project as library | إعادة استخدام مكونات بين المشاريع |
| Library Resources | CSS/JS/images مرتبطة بالمكتبة |
| Master Pages | قالب عام مع editable areas |
| Partials | تضمين أجزاء |

`[موثق]` تحديث المكونات يستبدل كل instances، ما لم توجد editable areas أو تعطيل التحديث. الوثائق تنصح باستخدام Git لأن التحديث قد تكون له نتائج غير مقصودة.

`[موثق]` Master Pages لا ينصح بها في مشاريع WordPress لأن WordPress لديها نظام قوالب خاص.

### 3.4 المحتوى والـ CMS

`[موثق]` Pinegrow CMS يسمح للمستخدم النهائي بتحرير مناطق محددة في HTML ثابت، دون كود. المعلومات تُخزن في `data-pgc-*` attributes. توجد رخصة CMS منفصلة لكل مستخدم نهائي.

القيود:

- المحتوى محلي/ملفات، وليس CMS سحابي متعدد المستخدمين.
- النشر خارج الأداة في الإصدارات القديمة؛ Pinegrow 10 أضاف Publish إلى GitHub/Netlify/Cloudflare/SFTP.
- لا يوجد نموذج محتوى متقدم أو علاقات أو workflow تحريري.

### 3.5 التفاعل والحركة

`[موثق]` Pinegrow Interactions إضافة مدفوعة منفصلة، مبنية على GSAP، مع Timeline Editor وScroll Scenes وBlueprints. السعر المذكور للمستخدمين ذوي الترخيص الدائم هو 50 دولارًا سنويًا.

الدلالة: الحركة ليست ضمن النواة. هذا يخلق فرصة لمن يدمج motion بشكل أصلي، لكنه أيضًا يرفع كلفة التطوير.

### 3.6 الجودة والفحص

Pinegrow 10 أضاف:

- Page Health: HTML nesting، duplicate IDs، missing title/lang، broken ARIA/label/in-page links.
- Accessibility checks باستخدام axe.
- Spell check.
- Visual change review and revisions.
- Site map وrobots.txt.
- Publish review مع عرض الملفات التي ستُرفع/تُحذف.

`[مستنتج]` هذه الميزات تجعل Pinegrow قريبًا من "IDE للويب" أكثر من كونه أداة تصميم. لكنها فحص بعدي، وليست قيودًا تمنع إنشاء الخطأ.

### 3.7 الذكاء الاصطناعي

`[موثق]` AI Assistant يدعم مزودين متعددين، BYO API key، مهام مثل إنشاء/تحويل HTML، CSS، accessibility، image-to-HTML، Smart Insert، Continue my edits، وتكامل Codex CLI وClaude Code. الوثائق تعترف بأن النتائج لا تكون صحيحة 100%، وأن Pinegrow أدوات التحرير ضرورية للتصحيح.

`[موثق]` في الإصدارات الأقدم كان هناك حد 4000 tokens للـ prompt+response، وتحسينات على إرسال URLs وSVG. هذا يوضح تحديًا معماريًا: تحرير الوثائق الكبيرة عبر LLM مكلف وغير دقيق.

### 3.8 النشر

`[موثق]` Pinegrow 10 ينشر إلى GitHub وNetlify وCloudflare Pages وSFTP (سطح المكتب فقط). يعرض مراجعة قبل النشر، ويرسل الملفات المتغيرة فقط، ويدعم preview deployments، ويحفظ revision بعد النشر.

## 4. المعمارية المستنتجة

لا نملك كود Pinegrow، لكن من السلوك يمكن استنتاج طبقات مشابهة لهذه:

```text
Shell (Desktop / Browser / WordPress plugin)
  ├─ Project & File System
  ├─ HTML/CSS/JS parsers & editors
  ├─ DOM/Preview runtime
  ├─ Actions engine (data-pg-*)
  ├─ Component & Master Page engine
  ├─ Framework extensions (Tailwind, Bootstrap, ...)
  ├─ Tailwind compiler / external build bridge
  ├─ AI provider layer
  ├─ Publish integrations
  └─ Plugin API
```

### نقاط تصميم مهمة

1. **الملفات هي مصدر الحقيقة.** الحالة الإضافية محصورة في metadata.
2. **Actions كنظام extensibility.** بدل hard-coding كل سلوك، Pinegrow يضيف actions على العناصر.
3. **المعاينة DOM حقيقي.** التحرير البصري يعتمد على DOM وليس canvas اصطناعي.
4. **Tailwind compiler مدمج + external build.** هذا يخلق مرونة لكنه يخلق أيضًا اختلافات سلوكية.
5. **امتدادات frameworks منفصلة.** Tailwind extension يمكن تفعيله للصفحة.
6. **AI كطبقة اختيارية.** ليس جزءًا من نموذج التحرير الأساسي.

## 5. نقاط القوة

### 5.1 ملكية الكود وعدم القفل

المستخدم يحصل على HTML/CSS/JS عادي. لا يوجد runtime خاص مطلوب للموقع المنشور. هذا مطلب أساسي للمحترفين والوكالات.

### 5.2 العمل على مواقع موجودة

يمكن فتح موقع قائم وتحريره. هذا يوسع السوق بشكل كبير مقارنة بأدوات تبني فقط من الصفر.

### 5.3 عمق التحكم

وجود Tree وStyle وCode Editor يعني أن الأداة لا تعيق المحترف عند الحاجة للتفاصيل.

### 5.4 دعم Tailwind المتقدم

Class Tree وDesign Panel وComponent Styles وCSS Grid editor تمثل استثمارًا حقيقيًا في Tailwind، وليست مجرد autocomplete.

### 5.5 المكونات والقوالب

Smart Components + Editable Areas + Master Pages نموذج عملي لإدارة موقع كامل.

### 5.6 الخصوصية والعمل المحلي

التطبيق سطح مكتبي، والبيانات لا تترك الجهاز. هذا مهم للوكالات التي تعمل مع عملاء حساسين.

### 5.7 نظام بيئي واسع

Bootstrap، Foundation، WordPress، WooCommerce، Vue، Interactions، AI، Publish.

## 6. نقاط الضعف والقيود

### 6.1 منحنى تعلم حاد

`[موثق]` الوثائق نفسها تقول إن الأداة غير مناسبة لمن لا يعرف HTML/CSS. هذا يحد من السوق ويجعل onboarding مكلفًا.

### 6.2 كثافة الواجهة

وجود عشرات اللوحات والأوضاع والاختصارات يخلق قوة للمحترف، لكنه يخلق حملًا إدراكيًا كبيرًا للمبتدئ.

### 6.3 قيود Tailwind الموثقة

| القيد | الأثر |
|---|---|
| Visual controls تعرض variants غير مفعلة | المستخدم يظن أن التغيير عمل، لكنه بلا تأثير |
| لا كشف تلقائي لما هو معرف في الثيم | تجربة "silent failure" |
| Class Tree لا يضيف/يعدل/يحذف class styles | مسارين مختلفين للتحرير |
| Component Styles تتطلب built-in compiler | لا تعمل مع external build |
| External build مطلوب للـ plugins/إصدارات أحدث | تعارض بين المرونة والتكامل |
| التبديل من built-in إلى external يتطلب تعديل مراجع CSS في كل HTML | هجرة مؤلمة |
| used-classes لا تُنظف تلقائيًا | CSS متضخم أو classes قديمة |
| حذف/إعادة تسمية لون في Design Panel لا يعدل HTML | عناصر قد تفقد تنسيقها |

### 6.4 تعقيد المكونات

`[موثق]` تحديث المكونات قد يدمر تعديلات instances إن لم تكن editable areas. الوثائق تنصح بـ Git. هذا يعني أن نموذج المكونات قوي لكنه سهل الاستخدام الخطأ.

### 6.5 الجودة بعدية

Page Health وAccessibility أدوات فحص، وليست ضمانات. لا تمنع إنشاء HTML غير صحيح أو classes غير موجودة أثناء التحرير.

### 6.6 التعاون

لا يوجد real-time collaboration موثق بمستوى Webflow/Framer. العمل الجماعي يتم عبر Git أو تبادل ملفات.

### 6.7 السحابة والتكاملات

Pinegrow Online موجود، لكن التطبيق أساسًا محلي. التكامل مع أنظمة المحتوى الحديثة أو منصات الفرق ليس بنفس عمق المنافسين السحابيين.

### 6.8 التسعير والإضافات

وجود إضافات مدفوعة (Interactions، CMS، WordPress) يخلق تعقيدًا في القيمة مقابل السعر. هذا ليس عيبًا بحد ذاته، لكنه فرصة لمن يقدم حزمة أوضح.

### 6.9 الاعتماد على محتوى طرف ثالث

TailwindUI وFlowbite Blocks يحتاجان تراخيص منفصلة. لا يمكن بناء ميزة "مكتبة مكونات" على محتوى غير مرخص.

## 7. ما يجب تقليده

1. الملفات كمصدر حقيقة.
2. الجمع بين Visual وTree وCode.
3. نظام مكونات مع editable areas واضحة.
4. Master pages / layouts.
5. Class Tree يعرض cascade والـ variants.
6. Design tokens panel.
7. Publish review قبل الإرسال.
8. Revisions وvisual diff.
9. مكونات قابلة لإعادة الاستخدام بين المشاريع.
10. العمل دون اتصال.

## 8. ما يجب تجنبه أو تحسينه

| مشكلة Pinegrow | مبدأنا المقترح |
|---|---|
| إظهار variants غير مفعلة | لا تعرض control إلا إذا كان Utility موجودًا في الثيم |
| صمت عند class غير موجود | تحذير فوري + إصلاح مقترح |
| مساران للتحرير (class styles vs component styles) | نموذج واحد مع أوضاع واضحة |
| metadata في data attributes | metadata في ملفات مشروع منفصلة + تصدير نظيف |
| class soup غير مُدار | كشف التكرار واقتراح استخراج مكون/نمط |
| جودة بعدية | قيود أثناء التحرير + فحص مستمر |
| تعاون محدود | سحابة اختيارية + CRDT في مرحلة لاحقة |
| AI يعيد HTML كاملًا | patch protocol مقيد + تحقق آلي |
| هجرة external build مؤلمة | adapter موحد + إعادة بناء تلقائية |

## 9. الدروس المعمارية

### 9.1 لا تجعل المحرر يعتمد على DOM فقط

DOM ممتاز للمعاينة، لكنه ليس مصدر حقيقة جيدًا للكود. نحتاج طبقة AST مع source locations للحفاظ على التنسيق وإجراء تعديلات جراحية.

### 9.2 اجعل Tailwind IR مستقلًا

لا تربط كل control بـ class string مباشرة. حوّل class إلى بنية:

```text
UtilityIR = {
  variants: ["md", "hover"],
  property: "bg",
  value: "red-500",
  modifier: null,
  important: false,
  arbitrary: false
}
```

هذه البنية تسمح بالدمج، والتحقق، والترتيب، والتحويل، والتوليد.

### 9.3 المكونات تحتاج حدودًا واضحة

كل مكون يجب أن يكون له:

- تعريف في ملف.
- props schema.
- slots / editable areas.
- variants.
- dependencies.
- نسخة وتاريخ.

### 9.4 الجودة يجب أن تكون جزءًا من النموذج

بدل فحص لاحق، اجعل العنصر يحمل حالة:

```text
ElementHealth = {
  htmlValid: boolean,
  a11yIssues: Issue[],
  unknownClasses: string[],
  contrastRisk: boolean,
  responsiveRisk: boolean
}
```

## 10. استنتاجات للتصميم

1. السوق يريد كودًا مملوكًا، وليس منصة مغلقة.
2. المحترف يريد سرعة بصرية دون فقدان التحكم.
3. Tailwind يحتاج فهمًا دلاليًا، لا مجرد إكمال نصوص.
4. نظام التصميم هو المحور الذي يجمع الثيم والمكونات والجودة.
5. AI يجب أن يكون مقيدًا بالبنية، لا مولّدًا نصوصًا حرة.
6. التعاون والاستضافة ميزة لاحقة، لكن يجب ألا تعرقل النواة المحلية.

## 11. أسئلة مفتوحة ناتجة عن التحليل

1. هل نستهدف static HTML فقط في v1 أم ندعم React/Vue أيضًا؟
2. هل نبدأ بسطح المكتب أم بالويب؟
3. هل المكونات ملفات HTML أصلية أم custom elements أم قوالب خاصة؟
4. هل ندعم WordPress في v1 أم نؤجله؟
5. هل نبني Tailwind compiler خاصًا أم نستخدم المحرك الرسمي؟
6. هل نقدم CMS مدمجًا أم نكامل CMS خارجي؟
7. هل نبيع ترخيصًا دائمًا أم اشتراكًا؟
8. هل نستهدف السوق العربي/RTL كتمايز أولي؟

هذه الأسئلة موثقة تفصيليًا في `10-open-questions-and-validation.md`.
