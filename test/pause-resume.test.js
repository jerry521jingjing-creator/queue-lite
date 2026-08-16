const { test } = require('node:test');
const assert = require('node:assert/strict');
const Queue = require('../src/index');

test('pause/resume: rapid cycle does not lose tasks', async () => {
  const q = new Queue({ concurrency: 1 });
  const order = [];
  
  q.pause();
  
  // These should be rejected
  const p1 = q.push(async () => { order.push(1); return 1; }).promise.catch(() => 'rejected');
  const p2 = q.push(async () => { order.push(2); return 2; }).promise.catch(() => 'rejected');
  
  // Resume and add new task
  q.resume();
  const p3 = q.push(async () => { order.push(3); return 3; });
  
  await Promise.all([p1, p2, p3.promise]);
  
  // Only task3 should have executed
  assert.deepEqual(order, [3]);
});

test('resume: processes tasks queued before resume', async () => {
  const q = new Queue({ concurrency: 1 });
  const executed = [];
  
  q.pause();
  q.push(async () => { executed.push(1); return 1; }).promise.catch(() => {});
  
  q.resume();
  
  const { promise } = q.push(async () => { executed.push(2); return 2; });
  await promise;
  
  assert.deepEqual(executed, [2]);
});

test('multiple pause/resume cycles', async () => {
  const q = new Queue({ concurrency: 1 });
  const results = [];
  
  q.pause();
  q.push(async () => { results.push('a'); return 1; }).promise.catch(() => {});
  q.resume();
  await q.push(async () => { results.push('b'); return 2; }).promise;
  
  q.pause();
  q.push(async () => { results.push('c'); return 3; }).promise.catch(() => {});
  q.resume();
  await q.push(async () => { results.push('d'); return 4; }).promise;
  
  assert.deepEqual(results, ['b', 'd']);
});
