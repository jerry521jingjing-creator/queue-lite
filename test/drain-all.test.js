const { test } = require('node:test');
const assert = require('node:assert/strict');
const Queue = require('../src/index');

test('drainAll: resolves immediately if idle', async () => {
  const q = new Queue();
  await q.drainAll(); // should not hang
});

test('drainAll: resolves after all tasks complete', async () => {
  const q = new Queue({ concurrency: 1 });
  const results = [];
  
  q.push(async () => { await new Promise(r => setTimeout(r, 10)); results.push(1); });
  q.push(async () => { await new Promise(r => setTimeout(r, 10)); results.push(2); });
  q.push(async () => { await new Promise(r => setTimeout(r, 10)); results.push(3); });
  
  await q.drainAll();
  assert.equal(results.length, 3);
  assert.equal(q.idle, true);
});

test('drainAll: works with retry', async () => {
  const q = new Queue({ maxRetries: 1, retryDelay: 10 });
  let attempts = 0;
  
  q.push(async () => {
    attempts++;
    if (attempts === 1) throw new Error('fail once');
    return 'ok';
  });
  
  await q.drainAll();
  assert.equal(attempts, 2);
});
