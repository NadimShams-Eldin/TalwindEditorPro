# TalwindEditorPro

محرر HTML بصري لـ Tailwind CSS v4، مصمم ليحفظ الكود بايتيًا، ويشرح أثر كل تعديل، ويضمن أن المعاينة تطابق البناء.

> الاسم عامل (working title). قرار العلامة التجارية النهائي موثق في `docs/adr/0003-name-and-trademark.md` قبل المرحلة 3.

## الحالة الحالية

| المجال | الحالة |
|---|---|
| دراسة المنتج والتقنيات | مكتملة — 15 مستندًا في `docs/research/` |
| Spikes تقنية | مكتملة — 26 اختبارًا في `spikes/` |
| الخطة التنفيذية | مكتملة — `docs/superpowers/plans/2026-10-30-talwind-editor-pro-master-plan.md` |
| ديمو المتصفح | جاهز — `demo/` |
| نواة الإنتاج (P0-P10) | لم تبدأ |

## ديمو سريع

```bash
cd demo
npm install
npm run build
npm run serve
```

افتح `http://127.0.0.1:8000/`.

الديمو يجسّد الفكرة الأساسية: تحديد عنصر في المعاينة، إضافة/إزالة أصناف Tailwind، رؤية `diff` بايتي، وشرح لماذا لم يؤثر صنف ما (unknown / no effect / conflict).

## هيكل المستودع

```text
demo/            ديمو المتصفح للفكرة الأساسية (محرر جراحي + كشف تعارض)
docs/research/   دراسة المنتج والسوق والتقنيات (15 مستندًا)
docs/superpowers/plans/   الخطة التنفيذية المرحلية (P0-P10)
spikes/          إثباتات تقنية لـ parse5 وTailwind وHTML surgery
```

## الفكرة في سطر

> `Command → Patch → Ledger → Verify` لكل تعديل، والحفظ يكتب البايتات المعدّلة فقط، ولا يعيد تسلسل DOM.

## الاختبارات

```bash
cd spikes && npm test     # 26 اختبارًا
cd demo && npm test       # 19 اختبارًا
```

## الترخيص

غير محدد بعد (D-06 مغلق قبل P10). كل الحقوق محفوظة حتى ذلك الحين.
