const { test } = require('node:test');
const assert = require('node:assert/strict');
const Queue = require('../src/index');

test('push returns taskId, promise, cancel', () => {
  const q = new Queue();
  const result = q.push(async () => 1);
  
  assert.ok(typeof result.taskId === 'string');
  assert.ok(result.taskId.startsWith('task_'));
  assert.ok(typeof result.promise.then === 'function');
  assert.ok(typeof result.cancel === 'function');
});

test('taskIds are unique', () => {
  const q = new Queue();
  const ids = new Set();
  for (let i = 0; i < 100; i++) {
    const { taskId } = q.push(async () => i);
    ids.add(taskId);
  }
  assert.equal(ids.size, 100);
});

test('cancel removes pending task from queue', async () => {
  const q = new Queue({ concurrency: 1 });
  
  // Fill the concurrency slot
  const blocker = q.push(async () => {
    await new Promise(r => setTimeout(r, 100));
    return 'blocker';
  });
  
  // This task will be pending
  const { promise, cancel } = q.push(async () => 'should not run');
  
  const cancelled = cancel();
  assert.equal(cancelled, true);
  
  await assert.rejects(promise, { message: 'Task cancelled' });
  
  // Wait for blocker to finish
  await blocker.promise;
  assert.equal(q.stats().completed, 1); // only blocker completed
});

test('cancel returns false for already-running task', async () => {
  const q = new Queue({ concurrency: 1 });
  
  const { promise, cancel } = q.push(async () => {
    await new Promise(r => setTimeout(r, 50));
    return 'done';
  });
  
  // Wait for task to start running
  await new Promise(r => setTimeout(r, 10));
  
  const cancelled = cancel(); // can't cancel running task
  assert.equal(cancelled, false);
  
  const result = await promise;
  assert.equal(result, 'done');
});

test('cancel returns false for already-cancelled task', async () => {
  const q = new Queue({ concurrency: 1 });
  
  // Fill concurrency
  const blocker = q.push(async () => new Promise(r => setTimeout(r, 100)));
  
  const { promise, cancel } = q.push(async () => 'x');
  
  cancel(); // first cancel
  assert.equal(cancel(), false); // second cancel returns false
  
  // Catch the rejection so it doesn't leak
  promise.catch(() => {});
  
  await blocker.promise;
});

test('push after pause returns immediately with rejected promise', () => {
  const q = new Queue();
  q.pause();
  
  const { taskId, promise } = q.push(async () => 1);
  assert.ok(taskId);
  assert.rejects(promise, { message: 'Queue is paused' });
});
