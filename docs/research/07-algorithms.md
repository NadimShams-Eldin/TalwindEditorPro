# 07 - الخوارزميات الأساسية

> هذا المستند يصف الخوارزميات المقترحة بلغة pseudocode قابلة للتحويل إلى TypeScript. لا يحتوي كود إنتاجي.

## 1. خريطة الخوارزميات

| ID | الخوارزمية | الطبقة | الأثر |
|---|---|---|---|
| A-01 | تحليل class token | class-ir | أساس كل شيء |
| A-02 | حل utility من الثيم | class-ir | تحقق وتوليد |
| A-03 | جمع المرشحات وتوليد CSS | tailwind | حل مشكلة الديناميكية |
| A-04 | حل تعارض الأصناف | class-ir | منع classes متعارضة |
| A-05 | تطبيق control بصري | editor | تحرير دلالي |
| A-06 | حساب النمط الفعلي | editor | responsive/state |
| A-07 | بناء Tailwind incremental | build | سرعة |
| A-08 | ربط DOM بـ AST | document | تحرير دقيق |
| A-09 | استخراج مكون | components | إعادة استخدام |
| A-10 | كشف class soup | refactor | تنظيف |
| A-11 | استخراج tokens | design-system | تبني مشروع قائم |
| A-12 | AI patch آمن | ai | تقليل الهلوسة |
| A-13 | Undo/Redo معاملاتي | editor | ثقة |
| A-14 | فحص الجودة | quality | ضمان |
| A-15 | تحويل RTL | i18n | تمايز |
| A-16 | تصدير static نظيف | export | ملكية الكود |

---

## A-01: تحليل class token

### الهدف

تحويل string مثل `md:hover:!bg-red-500/50` إلى بنية دلالية.

### البنية

```ts
type Variant = {
  name: string;
  arbitrary: boolean;
  raw: string;
};

type UtilityIR = {
  raw: string;
  prefix?: string;
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

### الخطوات

```text
parseClass(token):
  if token is empty: return null

  if token starts with prefix + ":":
      prefix = read until ":"
      token = rest

  parts = splitTopLevel(token, ":")
  utilityPart = parts.last
  variants = parts[0..last-1]

  important = false
  if utilityPart endsWith "!":
      important = true
      utilityPart = utilityPart without trailing "!"
  if utilityPart startsWith "!":
      important = true
      utilityPart = utilityPart without leading "!"

  negative = false
  if utilityPart startsWith "-":
      negative = true
      utilityPart = utilityPart without leading "-"

  if containsTopLevel(utilityPart, "[") or containsTopLevel(utilityPart, "("):
      arbitrary = true

  property, value, modifier = splitUtility(utilityPart)

  return {
      raw: token,
      prefix,
      variants: variants.map(parseVariant),
      important,
      negative,
      property,
      value,
      modifier,
      arbitrary,
      unknown: false
  }
```

### `splitTopLevel`

```text
splitTopLevel(input, separator):
  result = []
  depthSquare = 0
  depthRound = 0
  current = ""

  for ch in input:
      if ch == "[": depthSquare++
      if ch == "]": depthSquare--
      if ch == "(": depthRound++
      if ch == ")": depthRound--

      if ch == separator and depthSquare == 0 and depthRound == 0:
          result.push(current)
          current = ""
      else:
          current += ch

  result.push(current)
  return result
```

### `splitUtility`

```text
splitUtility(part):
  if part contains "/" at top level:
      base, modifier = split at last top-level "/"
  else:
      base = part
      modifier = null

  if base in STATIC_UTILITIES:
      return { property: STATIC_UTILITIES[base], value: "", modifier }

  candidates = PROPERTY_PREFIXES sorted by length desc
  for prefix in candidates:
      if base startsWith prefix + "-":
          return {
              property: prefix,
              value: base after prefix + "-",
              modifier
          }

  return { property: "unknown", value: base, modifier }
```

### الحالات الحرجة

- `[&>svg]:size-4` -> variant arbitrary.
- `bg-[url('/a:b.png')]` -> النقطتان داخل brackets لا تُقسَّم.
- `w-[calc(100%-1rem)]` -> parentheses.
- `-mt-4` -> negative.
- `!p-4` و`p-4!` -> important.
- `tw:flex` -> prefix.
- `data-[state=open]:...` -> variant arbitrary.
- `text-[color:var(--x)]` -> type hint.
- `bg-red-500/50` -> modifier.

### معيار القبول

- 100% من classes في اختبار مرجعي (500 class) تُحلل دون استثناء.
- أي class غير معروف يعود `unknown: true` ولا يكسر المحرر.

---

## A-02: حل utility من الثيم

### الهدف

معرفة هل class موجود، وما CSS الذي يولده، وأي tokens يستخدم.

```text
resolveUtility(ir, theme):
  if ir.unknown: return UNKNOWN

  family = UTILITY_FAMILIES[ir.property]
  if family is null: return UNKNOWN

  token = family.tokenFor(ir.value)
  if token is null and not ir.arbitrary:
      return UNKNOWN

  declarations = family.declarations(ir, token, theme)
  if declarations is empty:
      return UNKNOWN

  return {
      declarations,
      tokensUsed: token ? [token] : [],
      variants: compileVariants(ir.variants, theme)
  }
```

### `compileVariants`

```text
compileVariants(variants, theme):
  result = []
  for variant in variants:
      if variant is responsive:
          bp = theme.breakpoints[variant.name]
          if bp is null: return INVALID
          result.push({ type: "media", query: "(min-width: " + bp + ")" })

      else if variant is state:
          if not theme.states.includes(variant.name): return INVALID
          result.push({ type: "selector", suffix: ":" + variant.name })

      else if variant is dark:
          result.push({ type: "selector", suffix: theme.darkSelector })

      else if variant is arbitrary:
          result.push({ type: "raw", selector: variant.raw })

      else:
          return INVALID

  return result
```

### التحقق

```text
validateClass(ir, theme):
  resolved = resolveUtility(ir, theme)
  if resolved == UNKNOWN:
      return {
          ok: false,
          reason: "unknown-utility",
          suggestions: nearestUtilities(ir.raw, theme, limit=5)
      }
  if resolved.variants == INVALID:
      return {
          ok: false,
          reason: "variant-not-enabled",
          suggestions: enabledVariantsFor(ir, theme)
      }
  return { ok: true, resolved }
```

### معيار القبول

- عند إضافة class غير موجود، يظهر تحذير فوري مع بديل.
- عند استخدام variant غير مفعل، يظهر السبب وليس صمتًا.

---

## A-03: جمع المرشحات وتوليد CSS

### الهدف

ضمان أن كل class موجود في المحرر يُولد له CSS، حتى لو لم يُحفظ الملف.

```text
collectCandidates(project):
  set = new Set()

  for file in project.editableFiles:
      ast = project.ast(file)
      for element in ast.elements:
          for cls in element.classes:
              set.add(cls)

      for script in ast.inlineScripts:
          set.addAll(scanTextForClasses(script))

  for css in project.cssFiles:
      for apply in css.applyDirectives:
          set.addAll(apply.classes)

  for source in project.sourceDirectives:
      set.addAll(scanSource(source))

  for cls in project.safelist:
      set.add(cls)

  return set
```

### توليد CSS

```text
compileTailwind(project, candidates):
  hash = sha1(sorted(candidates))
  if hash == cache.candidatesHash and cache.css exists:
      return cache.css

  result = tailwindAdapter.compile({
      candidates: candidates,
      theme: project.theme,
      entry: project.tailwindEntry,
      config: project.config,
      mode: project.buildMode
  })

  cache.candidatesHash = hash
  cache.css = result.css
  cache.map = result.map
  return result.css
```

### ضمان التوليد

```text
ensureClassesGenerated(project, classes):
  candidates = collectCandidates(project)
  missing = classes.filter(c => !candidates.has(c))
  if missing is empty: return

  candidates.addAll(missing)
  css = compileTailwind(project, candidates)
  swapCss(css)
```

### ملاحظة

إذا كان المشروع يستخدم external build، نرسل `used-classes` إلى أداة البناء، وننتظر الملف الناتج، مع timeout وfallback.

### معيار القبول

- لا يوجد class في DOM المحرر بلا CSS rule بعد 200ms.
- إضافة 100 class دفعة واحدة لا تجمد الواجهة.

---

## A-04: حل تعارض الأصناف

### الهدف

منع `p-4 p-6` و`bg-red-500 bg-blue-500`، مع احترام variants.

### نموذج

```ts
type ConflictGroup = {
  id: string;
  coveredBy: string[];
};

type ClassEntry = {
  ir: UtilityIR;
  scope: string;
  groups: string[];
};
```

### الخطوات

```text
mergeClasses(existing: ClassEntry[], incoming: ClassEntry):
  result = existing.copy()

  for inc in incoming:
      for old in result.copy():
          if scopesEqual(inc.scope, old.scope):
              if inc.covers(old) or old.covers(inc):
                  if inc.important and not old.important:
                      result.remove(old)
                  else if old.important and not inc.important:
                      result.keep(old)
                      result.add(inc)
                      continue
                  else if orderOf(inc) >= orderOf(old):
                      result.remove(old)
                  else:
                      result.remove(inc)
                      continue

      if not result.contains(inc):
          result.add(inc)

  return result
```

### `covers`

```text
covers(a, b):
  if a.groups contains all b.groups: return true
  if a.groups contains a shorthand that covers b.groups: return true
  return false
```

### جدول التقاطع

| A | B | النتيجة |
|---|---|---|
| `p-4` | `p-6` | `p-6` |
| `p-4` | `px-2` | `p-4` يحذف `px-2` إن جاء بعده |
| `px-2` | `p-4` | `p-4` يحذف `px-2` |
| `bg-red-500` | `bg-blue-500` | `bg-blue-500` |
| `bg-red-500` | `bg-[url(x)]` | لا تعارض (color vs image) |
| `text-sm` | `text-red-500` | لا تعارض (size vs color) |
| `md:p-4` | `p-6` | لا تعارض (scope مختلف) |
| `hover:bg-red-500` | `bg-blue-500` | لا تعارض |
| `!p-4` | `p-6` | `!p-4` يفوز |

### الحالات الحرجة

- shorthand vs longhand.
- arbitrary values.
- negative.
- important.
- variants متعددة.
- prefix.

### معيار القبول

- 0 classes متعارضة في نفس scope بعد 1000 عملية تحرير عشوائية.
- لا حذف classes في scopes مختلفة.

---

## A-05: تطبيق control بصري

### الهدف

تحويل إجراء في الواجهة (تغيير padding) إلى classes صحيحة، دون كسر classes أخرى.

```text
applyControl(element, control, value, context):
  targetScope = scopeOf(context.breakpoint, context.state, context.variant)
  current = element.classes.filter(c => c.scope == targetScope)

  desired = control.toClass(value, context.theme)
  if desired is null:
      return { ok: false, reason: "value-not-in-theme" }

  if context.important:
      desired.important = true

  merged = mergeClasses(
      current.map(toEntry),
      [toEntry(desired, targetScope)]
  )

  removed = current - merged
  added = merged - current

  if removed empty and added empty:
      return { ok: true, noop: true }

  transaction = {
      element: element.id,
      remove: removed,
      add: added,
      scope: targetScope,
      label: control.label + " = " + value
  }

  applyTransaction(transaction)
  return { ok: true, transaction }
```

### العكس: من class إلى control

```text
deriveControlState(element, control, scope, theme):
  candidates = element.classes
      .filter(c => c.scope == scope)
      .map(parseClass)
      .filter(ir => ir.property in control.properties)

  if candidates empty:
      return {
          value: inheritedValue(element, control, scope),
          source: "inherited"
      }

  return {
      value: control.fromIR(candidates.last, theme),
      source: "explicit"
  }
```

### معيار القبول

- تغيير padding لا يحذف margin أو background.
- القيمة الموروثة تظهر بوضوح، ولا تُحفظ كـ class جديد إلا عند التعديل.

---

## A-06: حساب النمط الفعلي

### الهدف

معرفة القيمة الفعلية لخاصية على breakpoint/state معين، ومصدرها.

```text
effectiveStyle(element, property, breakpoint, state, theme):
  orderedBreakpoints = theme.breakpoints.sortBy(minWidth)
  applicable = orderedBreakpoints.filter(bp => bp.minWidth <= breakpoint.minWidth)

  declarations = []

  for bp in applicable:
      for cls in element.classes:
          ir = parseClass(cls)
          if not matchesBreakpoint(ir, bp, theme): continue
          if not matchesState(ir, state, theme): continue
          resolved = resolveUtility(ir, theme)
          if resolved == UNKNOWN: continue
          for d in resolved.declarations where d.property == property:
              declarations.push({ d, bp, source: cls })

  if declarations empty:
      return inheritedFromAncestors(element, property)

  winner = declarations.sortBy(cascadeOrder).last
  return {
      value: winner.d.value,
      source: winner.source,
      breakpoint: winner.bp,
      overridden: declarations.except(winner)
  }
```

### `cascadeOrder`

```text
cascadeOrder(decl):
  return [
      decl.important ? 1 : 0,
      decl.specificity,
      decl.bp.minWidth,
      decl.sourceOrder
  ]
```

### معيار القبول

- القيمة المعروضة تطابق computed style في 99% من الحالات.
- المصدر يظهر لكل قيمة.

---

## A-07: بناء Tailwind incremental

```text
class BuildCoordinator {
  generation = 0
  timer = null
  pending = new Set()

  onFilesChanged(files):
      pending.addAll(files)
      if timer: cancel(timer)
      timer = debounce(30ms, () => this.flush())

  flush():
      gen = ++generation
      candidates = collectCandidates(project)
      result = tailwindAdapter.compileAsync(candidates)

      if gen != generation:
          return

      if result.cssHash == lastCssHash:
          return

      lastCssHash = result.cssHash
      swapCssAtomically(result.css)

      if result.errors:
          showErrors(result.errors)
  }
}
```

### Atomic swap

```text
swapCssAtomically(css):
  style = preview.getStyleNode("tep-tailwind")
  style.textContent = css
  preview.notify("css-updated")
```

### معيار القبول

- لا flicker.
- لا تجميد.
- إلغاء builds القديمة.
- عرض الأخطاء دون كسر المعاينة.

---

## A-08: ربط DOM بـ AST

### الهدف

تحديد العنصر في الكود عند النقر في المعاينة، والعكس.

```text
buildSourceMap(ast):
  map = new Map()

  for node in ast.walk():
      map.set(node.path, {
          start: node.source.startOffset,
          end: node.source.endOffset,
          startTag: node.source.startTag,
          endTag: node.source.endTag
      })

  return map
```

### عند العرض

```text
renderForPreview(ast):
  clone = ast.clone()
  counter = 0

  for node in clone.elements:
      node.attributes["data-tep-id"] = String(counter)
      previewMap[counter] = node.path
      counter++

  return serialize(clone, { preserveWhitespace: true })
```

### عند التحديد

```text
onPreviewPick(id):
  path = previewMap[id]
  node = ast.findByPath(path)
  editor.select(node)
  editor.revealInCode(node.source.startOffset)
```

### الحالات الحرجة

- عناصر يضيفها JS: لا mapping، تظهر كـ runtime-only.
- إعادة الترتيب: تحديث map.
- نصوص: mapping منفصل.
- تعليقات: لا تُعرض كنقاط تحديد.

### معيار القبول

- النقر على أي عنصر ثابت يحدد الكود الصحيح.
- لا تُكتب `data-tep-id` في الملفات.

---

## A-09: استخراج مكون

### الهدف

تحويل عنصر أو مجموعة عناصر إلى مكون قابل لإعادة الاستخدام.

```text
extractComponent(selection, options):
  if selection.nodes.length == 0: fail("empty")
  if not shareSingleParent(selection): fail("multiple-parents")

  root = selection.commonRoot
  name = options.name or suggestName(root)
  id = slugify(name)

  props = inferProps(root, selection)
  slots = inferSlots(root, props)

  html = serializeForComponent(root, { props, slots })

  writeFile("components/" + id + ".html", html)
  writeFile("components/" + id + ".json", schema(props, slots))

  instance = createInstance(id, props.defaults)
  replaceInAst(root, instance)

  updateSourceMap()
  preview.reload()
  return { id, props, slots }
```

### `inferProps`

```text
inferProps(root):
  props = {}

  for text in root.textNodes:
      if text.looksLikeContent:
          props[propNameFor(text)] = {
              type: "string",
              default: text.value
          }

  for img in root.find("img"):
      props[propNameFor(img, "src")] = { type: "image" }

  for link in root.find("a"):
      props[propNameFor(link, "href")] = { type: "url" }

  return props
```

### `inferSlots`

```text
inferSlots(root, props):
  slots = []
  for child in root.children:
      if child.isVariableCollection:
          slots.push(nameFor(child))
  return slots
```

### معيار القبول

- استخراج بطاقة، استخدامها 10 مرات، تحديثها مرة واحدة.
- props الإلزامية تظهر كتحذير عند غيابها.
- الكود المُصدَّر لا يحتوي `<tep-*>`.

---

## A-10: كشف class soup

### الهدف

اكتشاف الأنماط المتكررة واقتراح إعادة هيكلة.

```text
detectRepeatedPatterns(project):
  patterns = new Map()

  for subtree in project.subtrees(minDepth=2, maxNodes=50):
      key = structuralHash(subtree) + "|" + classMultisetHash(subtree)
      entry = patterns.get(key) or createEntry(subtree)
      entry.count++
      entry.instances.push(subtree)

  suggestions = []

  for entry in patterns.values():
      if entry.count < 3: continue

      score = entry.count * entry.size * entry.similarity

      if score < THRESHOLD: continue

      suggestions.push({
          type: suggestType(entry),
          score,
          instances: entry.instances.take(20),
          preview: entry.representative,
          estimatedSavings: estimateSavings(entry)
      })

  return suggestions.sortBy(score desc)
```

### `suggestType`

```text
suggestType(entry):
  if entry.hasVariableContent and entry.hasFixedStructure:
      return "component"
  if entry.hasSameClasses and entry.differentContent:
      return "component-style"
  if entry.hasArbitraryValues:
      return "token"
  return "review"
```

### معايير الأمان

- لا نقترح دمج عناصر بدلالات مختلفة (nav vs footer) لمجرد تشابه classes.
- نطلب تأكيد المستخدم.
- المعاينة قبل التطبيق.
- إمكانية التراجع.

### معيار القبول

- على مشروع مرجعي، 70% من الاقتراحات مقبولة من مطور خبير.
- لا اقتراحات مكررة أو تافهة.

---

## A-11: استخراج tokens من مشروع قائم

### الهدف

تحويل قيم CSS المتناثرة إلى ثيم Tailwind متماسك.

```text
extractTokens(project):
  values = {
      colors: [],
      spacing: [],
      fonts: [],
      radii: [],
      shadows: []
  }

  for css in project.cssFiles:
      for decl in css.declarations:
          if isColor(decl): values.colors.push(decl)
          if isSpacing(decl): values.spacing.push(decl)
          if isFont(decl): values.fonts.push(decl)
          if isRadius(decl): values.radii.push(decl)
          if isShadow(decl): values.shadows.push(decl)

  colors = clusterColors(values.colors, deltaE=2)
  spacing = clusterNumbers(values.spacing, tolerance=1)
  fonts = clusterFonts(values.fonts)

  theme = proposeTheme(colors, spacing, fonts, values)

  return {
      theme,
      mapping: mapExistingToTokens(values, theme),
      confidence: scoreConfidence(values, theme)
  }
```

### `clusterColors`

```text
clusterColors(colors, deltaE):
  clusters = []
  for c in colors:
      found = clusters.find(cl => distance(c.oklch, cl.center) <= deltaE)
      if found: found.add(c)
      else: clusters.push(new Cluster(c))

  for cl in clusters:
      cl.name = suggestColorName(cl.center)
      cl.shades = assignShades(cl.members)

  return clusters
```

### معيار القبول

- مشروع bootstrap/Tailwind قديم يتحول إلى ثيم متماسك.
- المستخدم يوافق على الأسماء.
- لا تغيير بصري عند التطبيق.

---

## A-12: AI patch آمن

### الهدف

جعل AI يعدل بنية محددة، لا يولد ملفًا كاملًا.

```text
generateAIPatch(request, context):
  prompt = {
      task: request,
      selection: serializeSelection(context.selection),
      theme: context.theme.tokens,
      allowedClasses: context.theme.utilities,
      components: context.components.names,
      schema: PATCH_SCHEMA
  }

  raw = provider.complete(prompt)
  patch = parseJSON(raw)

  validation = validatePatch(patch, context)
  if not validation.ok:
      return { ok: false, errors: validation.errors }

  preview = applyPatchDryRun(patch)
  return { ok: true, patch, preview }
```

### `validatePatch`

```text
validatePatch(patch, context):
  errors = []

  if not matchesSchema(patch, PATCH_SCHEMA):
      errors.push("schema")

  for op in patch.ops:
      if not context.files.includes(op.file):
          errors.push("file-not-found")

      node = context.ast.findByPath(op.target.path)
      if node is null:
          errors.push("target-not-found")

      if op.op == "replace" and not isSafeHtml(op.html):
          errors.push("unsafe-html")

      classes = extractClasses(op.html)
      for cls in classes:
          if not context.theme.hasClass(cls):
              errors.push("unknown-class:" + cls)

      if touchesProtected(op, context):
          errors.push("protected-area")

  return { ok: errors.empty, errors }
```

### `applyAIPatch`

```text
applyAIPatch(patch, context):
  tx = beginTransaction("AI: " + patch.label)

  for op in patch.ops:
      switch op.op:
          case "replace":
              tx.replace(op.target, op.html)
          case "insert":
              tx.insert(op.target, op.html, op.position)
          case "remove":
              tx.remove(op.target)
          case "set-classes":
              tx.setClasses(op.target, op.classes)
          case "set-token":
              tx.setToken(op.token, op.value)

  tx.commit()
  verifyPreview()
  if failed:
      tx.undo()
      return { ok: false }
  return { ok: true }
```

### معيار القبول

- 95% من patches تمر التحقق.
- أي patch غير صالح لا يغير الملفات.
- المستخدم يرى diff قبل التطبيق.

---

## A-13: Undo/Redo معاملاتي

```text
type TextEdit = {
  file: string;
  start: number;
  end: number;
  before: string;
  after: string;
};

type Transaction = {
  id: string;
  label: string;
  edits: TextEdit[];
  selectionBefore: Selection;
  selectionAfter: Selection;
  timestamp: number;
};

undoStack = []
redoStack = []

commit(tx):
  undoStack.push(tx)
  redoStack.clear()
  applyEdits(tx.edits, "after")

undo():
  tx = undoStack.pop()
  if tx is null: return
  applyEdits(tx.edits.reverse(), "before")
  restoreSelection(tx.selectionBefore)
  redoStack.push(tx)

redo():
  tx = redoStack.pop()
  if tx is null: return
  applyEdits(tx.edits, "after")
  restoreSelection(tx.selectionAfter)
  undoStack.push(tx)
```

### Coalescing

```text
coalesce(a, b):
  if a.label != b.label: return false
  if b.timestamp - a.timestamp > 500ms: return false
  if a.file != b.file: return false
  a.edits.addAll(b.edits)
  a.selectionAfter = b.selectionAfter
  return true
```

### معيار القبول

- 1000 عملية undo/redo لا تفسد الملف.
- الحفظ لا يمسح الـ stack.
- التغييرات الخارجية تُعامل كمعاملة منفصلة.

---

## A-14: فحص الجودة

```text
scanQuality(project, scope):
  issues = []

  for file in scope.files:
      ast = project.ast(file)

      issues.addAll(checkHtmlStructure(ast))
      issues.addAll(checkUnknownClasses(ast, project.theme))
      issues.addAll(checkDuplicateIds(ast))
      issues.addAll(checkLinks(ast, project))
      issues.addAll(checkImages(ast))
      issues.addAll(checkForms(ast))

      preview = project.previewFor(file)
      if preview.ready:
          issues.addAll(axe(preview, scope.viewports))
          issues.addAll(checkContrast(preview))
          issues.addAll(checkOverflow(preview, scope.viewports))

  return dedupe(issues).sortBy(severity)
```

### Incremental

```text
onTransaction(tx):
  files = tx.affectedFiles
  schedule(() => {
      for file in files:
          issues = scanFile(file)
          updateIssueIndex(file, issues)
          notifyUI(file, issues)
  }, debounce=300ms)
```

### معيار القبول

- مشكلة جديدة تظهر خلال ثانية.
- لا false positives متكررة.
- كل issue لها إصلاح أو شرح.

---

## A-15: تحويل RTL

### الهدف

تحويل physical utilities إلى logical، أو تحذير عند التعذر.

```text
toLogical(ir):
  map = {
      "ml": "ms",
      "mr": "me",
      "pl": "ps",
      "pr": "pe",
      "left": "start",
      "right": "end",
      "text-left": "text-start",
      "text-right": "text-end",
      "rounded-l": "rounded-s",
      "rounded-r": "rounded-e",
      "border-l": "border-s",
      "border-r": "border-e"
  }

  if ir.property in map:
      return ir.withProperty(map[ir.property])

  if ir.property == "space-x":
      return { warning: "use gap for RTL-safe spacing" }

  if ir.arbitrary:
      if containsPhysicalValue(ir):
          return { warning: "physical value in arbitrary class" }

  return ir
```

### Preview

```text
preview.setDirection("rtl")
preview.setDirection("ltr")
```

### معيار القبول

- بناء صفحة عربية دون CSS مخصص.
- كشف 95% من physical utilities.
- تحذير عند `space-x-*` و`left-*` و`ml-*`.

---

## A-16: تصدير static نظيف

```text
exportStatic(project, options):
  plan = {
      pages: [],
      assets: [],
      warnings: []
  }

  for page in project.pages:
      ast = project.ast(page.file)
      expandComponents(ast)
      removeEditorMetadata(ast)
      rewriteAssetPaths(ast, options.basePath)
      injectSeo(ast, page)
      plan.pages.push(ast)

  for asset in project.assets:
      if asset.isUsed or options.includeAll:
          plan.assets.push(optimizeAsset(asset, options))

  css = tailwindAdapter.buildProduction(project)
  js = bundleProjectScripts(project)

  validateOutput(plan)
  if plan.warnings.any(error): return { ok: false, warnings: plan.warnings }

  writeDist(plan, css, js)
  report = measureOutput(plan)
  return { ok: true, report }
```

### `removeEditorMetadata`

```text
removeEditorMetadata(ast):
  for node in ast.elements:
      node.removeAttribute("data-tep-id")
      node.removeAttribute("data-tep-component")
      node.removeAttribute("data-tep-props")
      node.removeAttribute("data-pg-class-style")
```

### `validateOutput`

```text
validateOutput(plan):
  for page in plan.pages:
      if containsEditorMetadata(page): error("metadata")
      if hasUnknownClasses(page, plan.css): error("missing-css")
      if hasBrokenLocalLinks(page, plan): error("broken-link")
```

### معيار القبول

- 0 metadata داخلية.
- 0 classes بلا CSS.
- Lighthouse performance >= 90 في القالب المرجعي.
- الموقع يعمل دون المحرر.

---

## 2. ترتيب التنفيذ

1. A-01, A-02, A-08, A-13: الأساس.
2. A-03, A-07: البناء.
3. A-04, A-05, A-06: التحرير البصري.
4. A-09, A-14: المكونات والجودة.
5. A-10, A-11, A-15: إعادة الهيكلة وRTL.
6. A-12: AI.
7. A-16: التصدير.

## 3. معايير الجودة العامة

- كل خوارزمية لها property-based tests.
- كل parser له fuzz tests.
- كل خوارزمية تتعامل مع `unknown` دون crash.
- كل عملية قابلة للتراجع.
- كل عملية ثقيلة قابلة للإلغاء.
- كل نتيجة قابلة للتفسير للمستخدم.
