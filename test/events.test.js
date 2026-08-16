const { test } = require('node:test');
const assert = require('node:assert/strict');
const Queue = require('../src/index');

test('events: task:queued fires on push', async () => {
  const q = new Queue({ concurrency: 1 });
  const queued = [];
  q.on('task:queued', id => queued.push(id));
  
  const { taskId } = q.push(async () => 1);
  await q.drainAll();
  
  assert.ok(queued.includes(taskId));
});

test('events: task:start fires when task begins', async () => {
  const q = new Queue({ concurrency: 1 });
  const started = [];
  q.on('task:start', id => started.push(id));
  
  const { promise } = q.push(async () => 1);
  await promise;
  
  assert.equal(started.length, 1);
});

test('events: task:complete fires with result', async () => {
  const q = new Queue({ concurrency: 1 });
  const completed = [];
  q.on('task:complete', (id, result) => completed.push({ id, result }));
  
  const { taskId, promise } = q.push(async () => 42);
  await promise;
  
  assert.equal(completed.length, 1);
  assert.equal(completed[0].id, taskId);
  assert.equal(completed[0].result, 42);
});

test('events: task:fail fires on error', async () => {
  const q = new Queue({ maxRetries: 0 });
  const failed = [];
  q.on('task:fail', (id, err) => failed.push({ id, err }));
  
  const { promise } = q.push(async () => { throw new Error('boom'); });
  promise.catch(() => {});
  await promise.catch(() => {});
  
  assert.equal(failed.length, 1);
  assert.equal(failed[0].err.message, 'boom');
});

test('events: task:retry fires before retry', async () => {
  const q = new Queue({ maxRetries: 2, retryDelay: 10 });
  const retries = [];
  q.on('task:retry', (id, attempt, err) => retries.push({ id, attempt, err }));
  
  let attempts = 0;
  const { promise } = q.push(async () => {
    attempts++;
    if (attempts < 3) throw new Error('fail');
    return 'ok';
  });
  
  await promise;
  assert.equal(retries.length, 2);
  assert.equal(retries[0].attempt, 1);
  assert.equal(retries[1].attempt, 2);
});

test('events: progress fires with completed/total', async () => {
  const q = new Queue({ concurrency: 1 });
  const progress = [];
  q.on('progress', (completed, total) => progress.push({ completed, total }));
  
  const t1 = q.push(async () => 1);
  const t2 = q.push(async () => 2);
  
  await Promise.all([t1.promise, t2.promise]);
  
  assert.ok(progress.length >= 2);
  assert.equal(progress[progress.length - 1].completed, 2);
  assert.equal(progress[progress.length - 1].total, 2);
});

test('events: drain fires when queue is empty', async () => {
  const q = new Queue({ concurrency: 1 });
  let drained = false;
  q.on('drain', () => { drained = true; });
  
  const { promise } = q.push(async () => 1);
  await promise;
  
  assert.equal(drained, true);
});

test('events: multiple tasks emit correct sequence', async () => {
  const q = new Queue({ concurrency: 2 });
  const events = [];
  q.on('task:complete', id => events.push(`complete:${id}`));
  q.on('drain', () => events.push('drain'));
  
  const t1 = q.push(async () => 'a');
  const t2 = q.push(async () => 'b');
  
  await Promise.all([t1.promise, t2.promise]);
  
  assert.equal(events.filter(e => e.startsWith('complete:')).length, 2);
  assert.ok(events.includes('drain'));
});
