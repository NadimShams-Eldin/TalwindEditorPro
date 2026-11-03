import assert from 'node:assert/strict';
import test from 'node:test';
import { DocumentBuffer, addClass, classTokens, removeClass, setClasses } from '@tep/parser';

test('add and remove keep byte-exact text for quoted attributes', () => {
  const cases = [
    `<div class='a  b' data-tep-id="e1">x</div>`,
    `<div class="hero  mx-auto" data-tep-id="e1">x</div>`,
    `<div data-tep-id="e1">x</div>`,
  ];
  for (const source of cases) {
    const added = addClass(source, 'e1', 'py-24');
    assert.ok(added.includes('py-24'), source);
    assert.equal(removeClass(added, 'e1', 'py-24'), source, source);
  }
});

test('unquoted attributes keep their existing tokens when edited', () => {
  const source = `<div class=bold data-tep-id="e1">x</div>`;
  assert.equal(addClass(source, 'e1', 'py-24'), `<div class="bold py-24" data-tep-id="e1">x</div>`);
  assert.equal(removeClass(source, 'e1', 'bold'), `<div data-tep-id="e1">x</div>`);
  const bare = `<div class data-tep-id="e1">x</div>`;
  assert.equal(addClass(bare, 'e1', 'p-4'), `<div class="p-4" data-tep-id="e1">x</div>`);
});

test('removing a middle token collapses only its own whitespace run', () => {
  const source = `<div class="a b c" data-tep-id="e1">x</div>`;
  assert.equal(removeClass(source, 'e1', 'b'), `<div class="a c" data-tep-id="e1">x</div>`);
});

test('removing the last token preserves interior spacing', () => {
  const source = `<div class="hero  mx-auto py-24" data-tep-id="e1">x</div>`;
  assert.equal(
    removeClass(source, 'e1', 'py-24'),
    `<div class="hero  mx-auto" data-tep-id="e1">x</div>`,
  );
});

test('setClasses rewrites the value and keeps the original quote style', () => {
  const source = `<div class='p-4' data-tep-id="e1">x</div>`;
  assert.equal(
    setClasses(source, 'e1', ['p-6', 'flex']),
    `<div class='p-6 flex' data-tep-id="e1">x</div>`,
  );
  assert.equal(setClasses(source, 'e1', []), `<div data-tep-id="e1">x</div>`);
});

test('classTokens returns an empty list when the attribute is absent', () => {
  assert.deepEqual(classTokens(`<div data-tep-id="e1">x</div>`, 'e1'), []);
});

test('ledger undo returns to the original document after 999 edits', () => {
  const source = `<div class="p-4" data-tep-id="e1">x</div>`;
  const buffer = new DocumentBuffer(source, 'doc', { historyLimit: 1000 });
  for (let i = 0; i < 999; i += 1) {
    buffer.apply('toggle', (text) => {
      const current = classTokens(text, 'e1');
      const next = current.includes('flex')
        ? current.filter((t) => t !== 'flex')
        : [...current, 'flex'];
      return setClasses(text, 'e1', next);
    });
  }
  assert.ok(buffer.text.includes('flex'));
  while (buffer.undo());
  assert.equal(buffer.text, source);
});
