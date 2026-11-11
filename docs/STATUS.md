# حالة التنفيذ

آخر تحديث: 2026-11-10

## المراحل

| المرحلة | الحالة | البوابة |
|---|---|---|
| P0 — التأسيس | مكتملة | 116 اختبارًا، bench + budget أخضر |
| P1 — الفهرس والسجل | مكتملة | 132 اختبارًا، indexed p95 ≈ 6–9ms |
| P2 — محرك Tailwind | مكتملة | cold compile 30–56ms، parity أخضر |
| P3 — قشرة سطح المكتب | مكتملة | E2E 4/4 + Electron journey، فتح 100 صفحة 1.2s |
| P4 — التحرير البصري + Class IR | لم تبدأ | تحتاج توسيع الخطة عبر `writing-plans` |

## أرقام مرجعية (bench/results.json)

| القياس | القيمة | الميزانية |
|---|---|---|
| `setClasses.p95Ms` | 87.5ms | 200ms |
| `indexedEdit.p95Ms` | 9.3ms | 30ms |
| `restoredExactly` | true | true |
| `indexedDrift` | false | false |
| فتح مشروع 100 صفحة | 1225ms | 3000ms |

## عقود جاهزة

- `packages/parser`: تحرير جراحي بايتي، فهرس بنيوي، `shiftIndex`, `CausalBuffer` + `explain`.
- `packages/tailwind`: `createCompiler`, `collectFromHtml`, `parseTheme`, `createScheduler`, `detectMode`.
- `packages/contracts`: مخططات zod لمنع path traversal وتحقّق IPC.
- `packages/fs`: port + تنفيذ Node + Memory + glob matcher.
- `packages/preview`: خادم loopback فقط + bridge messages.
- `packages/editor`: `Session` الوحيدة التي تلامس الملفات عبر Ledger.
- `apps/desktop`: Electron آمن (`contextIsolation`, `sandbox`, `nodeIntegration: false`) + واجهة RTL + IPC.

## ADRs

0001 شكل المنتج · 0002 النطاق (+ addendum رفض Silex) · 0003 الاسم · 0004 التحرير الجراحي · 0005 المسارات البنيوية.

## المتبقي قبل P4

1. توسيع P4 إلى خطة تفصيلية بكود (`writing-plans`).
2. ADR-0006: adapter لـ Tailwind (بديل D-03).
3. فتح بوابة الدخول: P3 خضراء + D-01 معتمد.
