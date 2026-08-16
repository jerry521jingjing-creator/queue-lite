const { test } = require('node:test');
const assert = require('node:assert/strict');
const Queue = require('../src/index');

test('drainAll: multiple calls all resolve', async () => {
  const q = new Queue({ concurrency: 1 });
  
  // Push a task that takes some time
  q.push(async () => { await new Promise(r => setTimeout(r, 20)); return 1; });
  
  // Multiple drainAll calls
  const p1 = q.drainAll();
  const p2 = q.drainAll();
  const p3 = q.drainAll();
  
  // All should resolve
  await Promise.all([p1, p2, p3]);
  
  // Queue should be idle
  assert.equal(q.idle, true);
});

test('drainAll: resolves immediately if idle', async () => {
  const q = new Queue();
  await q.drainAll(); // should not hang
});

test('drainAll: onDrain option still works', async () => {
  let drained = false;
  const q = new Queue({ onDrain: () => { drained = true; } });
  
  q.push(async () => 1);
  await q.drainAll();
  
  assert.equal(drained, true);
});

test('drainAll: new drainAll after first drain works', async () => {
  const q = new Queue({ concurrency: 1 });
  
  // First batch
  q.push(async () => 1);
  await q.drainAll();
  
  // Second batch
  q.push(async () => 2);
  await q.drainAll();
  
  assert.equal(q.stats().completed, 2);
});
