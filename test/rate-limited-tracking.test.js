const { test } = require('node:test');
const assert = require('node:assert/strict');
const Queue = require('../src/index');

test('rate-limited tasks counted in stats', async () => {
  const q = new Queue({ concurrency: 10, rateLimit: 2, rateBurst: 2 });
  
  // Use up burst
  q.push(async () => 1);
  q.push(async () => 2);
  
  // These should be rate-limited
  q.push(async () => 3).promise.catch(() => {});
  q.push(async () => 4).promise.catch(() => {});
  q.push(async () => 5).promise.catch(() => {});
  
  await q.drainAll();
  
  const s = q.stats();
  assert.equal(s.completed, 2);
  assert.equal(s.rateLimited, 3);
  assert.equal(s.rateLimited + s.completed, 5);
});
