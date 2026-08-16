const { test } = require('node:test');
const assert = require('node:assert/strict');
const Queue = require('../src/index');

// R009: Stats reset
test('resetStats: clears all counters', async () => {
  const q = new Queue({ maxRetries: 0 });
  
  q.push(async () => 1);
  q.push(async () => { throw new Error('fail'); }).promise.catch(() => {});
  await q.drainAll();
  
  assert.ok(q.stats().completed > 0);
  assert.ok(q.stats().failed > 0);
  
  q.resetStats();
  const s = q.stats();
  assert.equal(s.completed, 0);
  assert.equal(s.failed, 0);
  assert.equal(s.retried, 0);
  assert.equal(s.deduplicated, 0);
  assert.equal(s.rateLimited, 0);
});

// R021: Running count getter
test('running getter: returns current running count', async () => {
  const q = new Queue({ concurrency: 1 });
  
  assert.equal(q.running, 0);
  
  const blocker = q.push(async () => new Promise(r => setTimeout(r, 100)));
  await new Promise(r => setTimeout(r, 10)); // let it start
  
  assert.equal(q.running, 1);
  
  await blocker.promise;
  assert.equal(q.running, 0);
});

// R006: cancel on running task behavior
test('cancel: returns false for running task', async () => {
  const q = new Queue({ concurrency: 1 });
  
  const { promise, cancel } = q.push(async () => {
    await new Promise(r => setTimeout(r, 100));
    return 'done';
  });
  
  await new Promise(r => setTimeout(r, 10));
  assert.equal(cancel(), false); // can't cancel running
  
  const result = await promise;
  assert.equal(result, 'done');
});
