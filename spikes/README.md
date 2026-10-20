# Technical spikes

إثبات تقني لثلاث فرضيات قبل بدء بناء المحرر:

1. تعديل HTML جراحيًا دون فقدان تنسيق.
2. تشغيل Tailwind CSS v4 برمجيًا مع candidate set صريحة.
3. تحديث CSS في المعاينة مع الحفاظ على العناصر والتحديد.

## التشغيل

```bash
npm install
npm test
npm run bench
```

- `src/html-surgery.mjs`: حقن معرفات، إضافة/إزالة class، عكس التعديل بايتيًا.
- `src/tailwind.mjs`: غلاف حول `@tailwindcss/node` + كشف scanning.
- `src/preview.mjs`: آلية تبديل CSS والتحديد.
- `src/classes.mjs`: استخراج classes من AST.
- `test/`: 26 اختبارًا.
- `bench/run.mjs`: قياسات تُكتب في `bench/results.json`.
- `REPORT.md`: التقرير والنتائج والقرارات.

## النتيجة

26/26 اختبارًا ناجحًا. التفاصيل في `REPORT.md`.
