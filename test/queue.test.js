const { test } = require('node:test');
const assert = require('node:assert/strict');
const Queue = require('../src/index');

test('Queue: creates with defaults', () => {
  const q = new Queue();
  assert.equal(q.concurrency, 3);
  assert.equal(q.pending, 0);
  assert.equal(q.idle, true);
});

test('Queue: push executes task', async () => {
  const q = new Queue({ concurrency: 1 });
  const { promise } = q.push(async () => 42);
  const result = await promise;
  assert.equal(result, 42);
  assert.equal(q.stats().completed, 1);
});

test('Queue: respects concurrency', async () => {
  const q = new Queue({ concurrency: 2 });
  let running = 0;
  let maxRunning = 0;
  
  const tasks = Array.from({ length: 4 }, () => q.push(async () => {
    running++;
    maxRunning = Math.max(maxRunning, running);
    await new Promise(r => setTimeout(r, 10));
    running--;
    return true;
  }));
  
  await Promise.all(tasks.map(t => t.promise));
  assert.ok(maxRunning <= 2, `Max running was ${maxRunning}, expected <= 2`);
});

test('Queue: retry on failure', async () => {
  let attempts = 0;
  const q = new Queue({ maxRetries: 2, retryDelay: 10 });
  
  const { promise } = q.push(async () => {
    attempts++;
    if (attempts < 3) throw new Error('fail');
    return 'success';
  });
  
  const result = await promise;
  assert.equal(result, 'success');
  assert.equal(attempts, 3);
  assert.equal(q.stats().retried, 2);
});

test('Queue: fails after max retries', async () => {
  const q = new Queue({ maxRetries: 1, retryDelay: 10 });
  
  const { promise } = q.push(async () => { throw new Error('always fail'); });
  await assert.rejects(promise, { message: 'always fail' });
  assert.equal(q.stats().failed, 1);
});

test('Queue: timeout', async () => {
  const q = new Queue({ timeout: 50 });
  
  const { promise } = q.push(async () => new Promise(r => setTimeout(r, 200)));
  await assert.rejects(promise, { message: /timed out/ });
}, { timeout: 1000 });

test('Queue: pause rejects new tasks', async () => {
  const q = new Queue();
  q.pause();
  
  const { promise } = q.push(async () => 1);
  await assert.rejects(promise, { message: 'Queue is paused' });
});

test('Queue: drain callback', async () => {
  let drained = false;
  const q = new Queue({ onDrain: () => { drained = true; } });
  
  const { promise } = q.push(async () => 1);
  await promise;
  assert.equal(drained, true);
});

test('Queue: priority ordering', async () => {
  const q = new Queue({ concurrency: 1 });
  const order = [];
  
  const p1 = q.push(async () => { order.push('low'); return 1; }, { priority: 0 });
  const p2 = q.push(async () => { order.push('high'); return 2; }, { priority: 10 });
  
  await Promise.all([p1.promise, p2.promise]);
  assert.deepEqual(order, ['high', 'low']);
});
