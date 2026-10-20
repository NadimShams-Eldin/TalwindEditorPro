# 09 - خارطة الطريق والمخاطر

> التقديرات فرضية تخطيطية، وليست التزامًا. تعتمد على فريق صغير خبير (4-6 مهندسين) وقيادة منتج/تصميم.

## 1. المراحل

### Phase 0: التحقق والتصميم (2-3 أسابيع)

**الهدف:** تقليل مخاطر السوق والتقنية قبل بناء كبير.

**المخرجات:**
- 15-20 مقابلة مستخدم.
- 5 اختبارات استخدام لنموذج أولي.
- قرار Desktop vs Web.
- قرار نطاق v1.
- نموذج بيانات نهائي مبدئي.
- Proof of concept لـ:
  - HTML round-trip مع parse5.
  - Tailwind v4 compile programmatically.
  - preview bridge.
  - conflict resolver على 100 class.

**معيار الخروج:**
- 70% من المقابلات تؤكد 3 مشكلات على الأقل من قائمتنا.
- PoC يحقق 95% دقة في تحرير HTML دون فقدان تنسيق.
- PoC Tailwind build أقل من 300ms لمشروع صغير.

### Phase 1: نواة المحرر (8-10 أسابيع)

**الهدف:** محرر يفتح مشروعًا ويعدل ويحفظ دون كسر الكود.

**الميزات:**
- Electron shell + أمان أساسي.
- فتح/إنشاء مشروع.
- File tree + pages.
- HTML AST + source mapping.
- Canvas preview.
- تحديد العناصر.
- Code editor.
- Tree panel.
- Undo/redo.
- Save + external change handling.
- Tailwind v4 build + CSS hot swap.
- Class list + unknown class detection.
- Basic inspector.

**معيار الخروج:**
- فتح مشروع 100 صفحة < 3s.
- تعديل 100 عنصر وحفظهم دون فقدان تنسيق.
- 0 crashes في اختبار 8 ساعات.
- Undo/redo 1000 عملية دون فساد.

### Phase 2: التحرير البصري Tailwind (8 أسابيع)

**الهدف:** بناء صفحة كاملة بصريًا.

**الميزات:**
- Visual controls للحقول الأساسية.
- Class Tree.
- Responsive breakpoints + inheritance.
- States: hover/focus/active/dark.
- Arbitrary values.
- Conflict resolution.
- Design tokens panel.
- Theme switching.
- CSS Grid editor (أساسي).
- Code/CSS inspector.
- Quality basics: contrast, overflow, unknown classes.

**معيار الخروج:**
- بناء landing page كاملة في < 20 دقيقة.
- 0 classes متعارضة.
- 0 "no effect" bugs في 200 تعديل.
- RTL preview يعمل.

### Phase 3: موقع كامل ومكونات (6-8 أسابيع)

**الهدف:** إدارة موقع متعدد الصفحات.

**الميزات:**
- Components + props + slots.
- Extract component.
- Component library.
- Layouts/master pages.
- Pages manager.
- Assets manager.
- Links + navigation.
- HTML snippets.
- Revisions + visual diff.
- Import existing site.
- Basic SEO.
- Export static.

**معيار الخروج:**
- موقع 10 صفحات مع header/footer/مكونات.
- تحديث مكون يحدّث كل الصفحات.
- تصدير نظيف 0 metadata.
- استيراد موقع قديم يعمل.

### Phase 4: الجودة وAI وRTL (6-8 أسابيع)

**الهدف:** تمايز حقيقي.

**الميزات:**
- Page Health كامل.
- axe accessibility.
- Fix suggestions.
- AI patch protocol.
- AI context + validation.
- Local model option.
- Class soup detection.
- Token extraction from existing site.
- RTL assistant.
- Performance budget.
- Quality report.

**معيار الخروج:**
- 95% AI patches صالحة.
- 90% من issues لها إصلاح.
- تقرير جودة قابل للتسليم للعميل.
- RTL site بدون CSS مخصص.

### Phase 5: النشر والتعاون (6-8 أسابيع)

**الهدف:** إنتاجية الفريق.

**الميزات:**
- Publish to GitHub/Netlify/Cloudflare/SFTP.
- Publish review.
- Preview deployments.
- Comments.
- Async review.
- Optional cloud sync.
- Team permissions.
- Plugin API alpha.

**معيار الخروج:**
- نشر موقع كامل بضغطة.
- مراجعة تعليقات على العناصر.
- Sync دون فقدان بيانات.

### Phase 6: Beta عام (4 أسابيع)

**الميزات:**
- Onboarding.
- Templates.
- Docs.
- Telemetry opt-in.
- Crash reporting.
- Licensing.
- Update mechanism.
- Support workflow.

## 2. الجدول الزمني

```text
Month 1      Phase 0
Month 2-3    Phase 1
Month 4-5    Phase 2
Month 6-7    Phase 3
Month 8-9    Phase 4
Month 10-11  Phase 5
Month 12     Phase 6 / Beta
```

المجموع: 10-12 شهرًا إلى Beta عام، مع MVP داخلي في الشهر 5-6.

## 3. الفريق المقترح

| الدور | العدد | المسؤولية |
|---|---|---|
| Tech Lead | 1 | المعمارية، مراجعة، قرارات تقنية |
| Frontend/Editor | 2 | UI، canvas، interactions |
| Core/Compiler | 1-2 | AST، class IR، Tailwind adapter |
| Backend/Platform | 1 | files, build, publish, auth |
| Product Design | 1 | UX، design system، prototyes |
| QA/Automation | 0.5-1 | اختبارات، releases |
| DevRel/Support | 0.5 | docs، community |

## 4. أولويات القيمة

### يجب أن يوجد في MVP

1. فتح مشروع Tailwind.
2. تحرير بصري أساسي.
3. responsive.
4. class inspector.
5. tokens.
6. حفظ/تصدير نظيف.
7. undo.
8. preview.

### يجب أن يوجد في v1

1. components.
2. layouts.
3. quality.
4. AI patch.
5. publish.
6. RTL.
7. revisions.

### يمكن تأجيله

1. collaboration حي.
2. CMS.
3. WordPress.
4. marketplace.
5. plugins.
6. frameworks.

## 5. المخاطر

### 5.1 مصفوفة المخاطر

| ID | الخطر | الاحتمال | الأثر | التخفيف |
|---|---|---|---|---|
| R-01 | HTML round-trip يفقد التنسيق | مرتفع | مرتفع | PoC مبكر، source locations، اختبارات golden |
| R-02 | Tailwind API غير مستقر | متوسط | مرتفع | adapter + version pinning + CLI fallback |
| R-03 | بطء المشاريع الكبيرة | متوسط | مرتفع | incremental + workers + index |
| R-04 | تعقيد UX | مرتفع | مرتفع | اختبارات استخدام، progressive disclosure |
| R-05 | السوق أصغر من المتوقع | متوسط | مرتفع | مقابلات، pre-sales، waitlist |
| R-06 | منافس يضيف Tailwind | متوسط | متوسط | التركيز على العمق والجودة |
| R-07 | AI غير موثوق | مرتفع | متوسط | patch validation + preview + rollback |
| R-08 | مشاكل ترخيص العلامة | متوسط | مرتفع | مراجعة قانونية، اسم مستقل |
| R-09 | عبء دعم كبير | متوسط | متوسط | docs، diagnostics، templates |
| R-10 | تسرب بيانات/أمان | منخفض | مرتفع | sandbox، audits، threat model |
| R-11 | نطاق يتضخم | مرتفع | مرتفع | non-goals، بوابات مرحلة |
| R-12 | الاعتماد على شخص واحد | متوسط | مرتفع | توثيق، مراجعة، توزيع معرفة |

### 5.2 أعلى 5 مخاطر

#### R-01: دقة الكود

إذا لم نستطع تعديل HTML دون إفساد التنسيق، المنتج سيفشل مع المحترفين. هذا هو "must-win battle".

**التخفيف:**
- PoC في Phase 0.
- مكتبة اختبارات تحتوي HTML غير منسق، comments، inline scripts، SVG، pre.
- عدم إعادة التنسيق إلا بطلب.
- fallback: إذا فشل التحرير الجراحي، اعرض للمستخدم خيار التعديل اليدوي.

#### R-04: التعقيد

المحرر البصري يميل إلى التضخم. يجب أن يكون MVP بسيطًا ومباشرًا.

**التخفيف:**
- Progressive disclosure.
- 3 تدفقات أساسية فقط في onboarding.
- قياس time-to-task.
- حذف الميزات غير المستخدمة.

#### R-05: حجم السوق

قد يكون عدد المحترفين الذين يريدون Tailwind + visual أقل من المتوقع.

**التخفيف:**
- تحقق مبكر.
- قنوات مجتمع Tailwind.
- عرض قيمة للوكالات.
- خطة تمويل مرحلية.

#### R-06: المنافسة

Pinegrow يتحسن، وWebflow/Framer قد يضيفان Tailwind.

**التخفيف:**
- التركيز على design system + quality + clean export.
- سرعة الإصدار.
- علاقة قوية بالمجتمع.

#### R-11: تضخم النطاق

كل ميزة تبدو ضرورية. لكن كل ميزة تضيف تعقيدًا.

**التخفيف:**
- Non-goals موثقة.
- بوابة "هل تخدم JTBD الأساسي؟"
- تأجيل كل ما ليس في MVP.

## 6. بوابات الجودة

### Gate 1: بعد Phase 1

- لا فقدان بيانات.
- لا crashes في 8 ساعات.
- دقة source mapping >= 99%.

### Gate 2: بعد Phase 2

- بناء صفحة كاملة في 20 دقيقة.
- 0 no-effect bugs.
- 0 class conflicts.

### Gate 3: بعد Phase 3

- موقع 10 صفحات.
- export نظيف.
- component update آمن.

### Gate 4: قبل Beta

- 50 مستخدمًا في تجربة.
- NPS >= 30.
- crash-free sessions >= 99%.
- accessibility issues < 3/page.

## 7. استراتيجية الإصدار

### Internal alpha

- فريق + 5 مصممين.
- أسبوعي.
- تركيز على الاستقرار.

### Private beta

- 50-100 مستخدم.
- دعوات.
- قنوات feedback.
- تحديث كل أسبوعين.

### Public beta

- waitlist.
- free tier.
- docs.
- community.

### v1

- paid plans.
- publish.
- support SLA.

## 8. ما بعد v1

1. Collaboration.
2. CMS.
3. WordPress.
4. Plugin API.
5. Marketplace.
6. React/Vue/Astro.
7. Motion editor.
8. Cloud rendering.

## 9. مؤشرات التقدم

| المؤشر | أسبوعي |
|---|---|
| عدد تدفقات مكتملة | 1-2 |
| crash-free sessions | > 99% |
| time to build page | ينخفض |
| عدد issues مفتوحة | ينخفض |
| مستخدمون نشطون | ينمو |
| retention | ينمو |

## 10. الخلاصة

الخطة ليست "بناء كل شيء". هي **بناء النواة الصحيحة أولًا**، وإثبات أننا نستطيع تعديل كود حقيقي دون إفساده، ثم إضافة الطبقات. أي إغراء لتوسيع النطاق قبل Gate 1-2 يجب مقاومته.
