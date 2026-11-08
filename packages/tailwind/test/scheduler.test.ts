import assert from 'node:assert/strict';
import test from 'node:test';
import { createScheduler } from '@tep/tailwind';

test('scheduler debounces bursts into one build', async () => {
  let builds = 0;
  const scheduler = createScheduler(
    {
      build: (candidates) => ({ css: [...candidates].join(' '), rules: 1, durationMs: 0 }),
      dispose() {},
    },
    { debounceMs: 10 },
  );
  let last = '';
  for (let i = 0; i < 5; i += 1) {
    scheduler.update([`p-${i}`], (result) => {
      builds += 1;
      last = result.css;
    });
  }
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(builds, 1);
  assert.equal(last, 'p-4');
});

test('flush runs the pending build immediately', () => {
  let builds = 0;
  const scheduler = createScheduler(
    { build: () => ({ css: '', rules: 0, durationMs: 0 }), dispose() {} },
    { debounceMs: 1000 },
  );
  scheduler.update(['p-1'], () => {
    builds += 1;
  });
  scheduler.flush();
  assert.equal(builds, 1);
});

test('cancel drops the pending build', async () => {
  let builds = 0;
  const scheduler = createScheduler(
    { build: () => ({ css: '', rules: 0, durationMs: 0 }), dispose() {} },
    { debounceMs: 5 },
  );
  scheduler.update(['p-1'], () => {
    builds += 1;
  });
  scheduler.cancel();
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.equal(builds, 0);
});
