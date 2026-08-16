const { test } = require('node:test');
const assert = require('node:assert/strict');
const Queue = require('../src/index');

// R022: Falsy defaults bug prevention
test('defaults: concurrency=0 is valid', () => {
  // concurrency=0 means no tasks can run (paused effectively)
  const q = new Queue({ concurrency: 0 });
  assert.equal(q.concurrency, 0);
});

test('defaults: timeout=0 is valid', () => {
  // timeout=0 means immediate timeout
  const q = new Queue({ timeout: 0 });
  assert.equal(q.timeout, 0);
});

test('defaults: retryDelay=0 is valid', () => {
  const q = new Queue({ retryDelay: 0 });
  assert.equal(q.retryDelay, 0);
});

test('defaults: maxRetries=0 is valid', () => {
  const q = new Queue({ maxRetries: 0 });
  assert.equal(q.maxRetries, 0);
});

test('defaults: priority=0 is valid', async () => {
  const q = new Queue();
  const { promise } = q.push(async () => 1, { priority: 0 });
  const result = await promise;
  assert.equal(result, 1);
});

test('defaults: rateLimit=0 means unlimited', () => {
  const q = new Queue({ rateLimit: 0 });
  assert.equal(q.rateLimit, 0);
});
