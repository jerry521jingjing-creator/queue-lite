const { test } = require('node:test');
const assert = require('node:assert/strict');
const Queue = require('../src/index');

test('stats: completed count accurate after task resolves', async () => {
  const q = new Queue({ concurrency: 1 });
  
  const { promise } = q.push(async () => 42);
  await promise;
  
  const s = q.stats();
  assert.equal(s.completed, 1);
  assert.equal(s.failed, 0);
  assert.equal(s.pending, 0);
  assert.equal(s.running, 0);
});

test('stats: accurate after multiple tasks', async () => {
  const q = new Queue({ concurrency: 2 });
  
  const t1 = q.push(async () => 1);
  const t2 = q.push(async () => 2);
  const t3 = q.push(async () => 3);
  
  await Promise.all([t1.promise, t2.promise, t3.promise]);
  
  const s = q.stats();
  assert.equal(s.completed, 3);
});

test('stats: accurate after failure', async () => {
  const q = new Queue({ maxRetries: 0 });
  
  const { promise } = q.push(async () => { throw new Error('fail'); });
  promise.catch(() => {});
  
  await promise.catch(() => {});
  
  assert.equal(q.stats().failed, 1);
  assert.equal(q.stats().completed, 0);
});

test('stats: accurate after retry', async () => {
  const q = new Queue({ maxRetries: 1, retryDelay: 10 });
  let attempts = 0;
  
  const { promise } = q.push(async () => {
    attempts++;
    if (attempts === 1) throw new Error('fail');
    return 'ok';
  });
  
  await promise;
  
  const s = q.stats();
  assert.equal(s.completed, 1);
  assert.equal(s.retried, 1);
});

test('stats: reflects paused state', () => {
  const q = new Queue();
  assert.equal(q.stats().paused, false);
  q.pause();
  assert.equal(q.stats().paused, true);
  q.resume();
  assert.equal(q.stats().paused, false);
});
