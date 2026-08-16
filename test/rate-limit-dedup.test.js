const { test } = require('node:test');
const assert = require('node:assert/strict');
const Queue = require('../src/index');

// --- Rate Limiting ---

test('rate limiting: rejects when limit exceeded', async () => {
  const q = new Queue({ concurrency: 10, rateLimit: 2, rateBurst: 2 });
  
  // First 2 should succeed (burst)
  const t1 = q.push(async () => 1);
  const t2 = q.push(async () => 2);
  
  // Third should fail (rate limit)
  const { promise: p3 } = q.push(async () => 3);
  await assert.rejects(p3, /Rate limit/);
  
  await Promise.all([t1.promise, t2.promise]);
});

test('rate limiting: tokens refill over time', async () => {
  const q = new Queue({ concurrency: 10, rateLimit: 10, rateBurst: 1 });
  
  // Use the burst
  const t1 = q.push(async () => 1);
  await t1.promise;
  
  // Wait for refill
  await new Promise(r => setTimeout(r, 150));
  
  // Should work now
  const t2 = q.push(async () => 2);
  const result = await t2.promise;
  assert.equal(result, 2);
});

test('rate limiting: unlimited by default', async () => {
  const q = new Queue({ concurrency: 10 });
  
  // Should all succeed
  const tasks = Array.from({ length: 20 }, (_, i) => q.push(async () => i));
  const results = await Promise.all(tasks.map(t => t.promise));
  assert.equal(results.length, 20);
});

// --- Task Deduplication ---

test('dedup: rejects duplicate task with same key', async () => {
  const q = new Queue({ concurrency: 1 });
  
  const t1 = q.push(async () => { await new Promise(r => setTimeout(r, 50)); return 1; }, { dedupKey: 'unique-task' });
  
  // Second with same key should fail immediately
  const { promise: p2 } = q.push(async () => 2, { dedupKey: 'unique-task' });
  await assert.rejects(p2, /Duplicate task/);
  
  await t1.promise;
});

test('dedup: allows different keys', async () => {
  const q = new Queue({ concurrency: 2 });
  
  const t1 = q.push(async () => 1, { dedupKey: 'task-a' });
  const t2 = q.push(async () => 2, { dedupKey: 'task-b' });
  
  const [r1, r2] = await Promise.all([t1.promise, t2.promise]);
  assert.equal(r1, 1);
  assert.equal(r2, 2);
});

test('dedup: key freed after task completes', async () => {
  const q = new Queue({ concurrency: 1 });
  
  const t1 = q.push(async () => { await new Promise(r => setTimeout(r, 10)); return 1; }, { dedupKey: 'task-x' });
  await t1.promise;
  
  // Should allow same key again
  const t2 = q.push(async () => 2, { dedupKey: 'task-x' });
  const result = await t2.promise;
  assert.equal(result, 2);
});

test('dedup: key freed after task fails', async () => {
  const q = new Queue({ maxRetries: 0 });
  
  const t1 = q.push(async () => { throw new Error('fail'); }, { dedupKey: 'fail-task' });
  t1.promise.catch(() => {});
  await t1.promise.catch(() => {});
  
  // Should allow same key again
  const t2 = q.push(async () => 'ok', { dedupKey: 'fail-task' });
  const result = await t2.promise;
  assert.equal(result, 'ok');
});

test('dedup: key freed after cancel', async () => {
  const q = new Queue({ concurrency: 1 });
  
  // Fill concurrency
  q.push(async () => new Promise(r => setTimeout(r, 100)));
  
  const t1 = q.push(async () => 'x', { dedupKey: 'cancel-task' });
  t1.cancel();
  t1.promise.catch(() => {});
  
  // Should allow same key again
  const t2 = q.push(async () => 'ok', { dedupKey: 'cancel-task' });
  const result = await t2.promise;
  assert.equal(result, 'ok');
});

test('dedup: stats track duplicates', async () => {
  const q = new Queue({ concurrency: 1 });
  
  q.push(async () => new Promise(r => setTimeout(r, 50)), { dedupKey: 'dup' });
  q.push(async () => 'x', { dedupKey: 'dup' }).promise.catch(() => {});
  
  await new Promise(r => setTimeout(r, 100));
  
  assert.equal(q.stats().deduplicated, 1);
});

test('dedup: no key means no dedup', async () => {
  const q = new Queue({ concurrency: 2 });
  
  const t1 = q.push(async () => 1);
  const t2 = q.push(async () => 2);
  
  const [r1, r2] = await Promise.all([t1.promise, t2.promise]);
  assert.equal(r1, 1);
  assert.equal(r2, 2);
});
