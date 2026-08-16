const { test } = require('node:test');
const assert = require('node:assert/strict');
const Queue = require('../src/index');

// R015: Error path tests
test('error: push with non-function throws TypeError', () => {
  const q = new Queue();
  assert.throws(() => q.push('bad'), TypeError);
  assert.throws(() => q.push(123), TypeError);
  assert.throws(() => q.push(null), TypeError);
  assert.throws(() => q.push(undefined), TypeError);
});

test('error: invalid priority throws TypeError', () => {
  const q = new Queue();
  assert.throws(() => q.push(async () => 1, { priority: 'high' }), TypeError);
});

test('error: invalid timeout throws TypeError', () => {
  const q = new Queue();
  assert.throws(() => q.push(async () => 1, { timeout: -1 }), TypeError);
  assert.throws(() => q.push(async () => 1, { timeout: 'fast' }), TypeError);
});

test('error: invalid dedupKey throws TypeError', () => {
  const q = new Queue();
  assert.throws(() => q.push(async () => 1, { dedupKey: 123 }), TypeError);
});

// R016: Null/undefined input tests
test('null safety: push with null fn throws', () => {
  const q = new Queue();
  assert.throws(() => q.push(null), TypeError);
});

test('null safety: opts defaults to empty object', () => {
  const q = new Queue();
  const { taskId } = q.push(async () => 1);
  assert.ok(taskId);
});

test('null safety: push with undefined opts works', () => {
  const q = new Queue();
  const { taskId } = q.push(async () => 1, undefined);
  assert.ok(taskId);
});

// R017: Concurrency stress test
test('concurrency: high load maintains limits', async () => {
  const q = new Queue({ concurrency: 3 });
  let running = 0;
  let maxRunning = 0;
  
  const tasks = Array.from({ length: 50 }, (_, i) => 
    q.push(async () => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await new Promise(r => setTimeout(r, 5));
      running--;
      return i;
    })
  );
  
  await q.drainAll();
  assert.ok(maxRunning <= 3, `Max running was ${maxRunning}`);
  assert.equal(q.stats().completed, 50);
});

test('concurrency: rapid push/pull cycle', async () => {
  const q = new Queue({ concurrency: 2 });
  
  for (let i = 0; i < 20; i++) {
    q.push(async () => i).promise.catch(() => {});
  }
  
  await q.drainAll();
  assert.ok(q.stats().completed + q.stats().rateLimited === 20);
});

// R004: Error handling tests
test('error handling: callback error does not crash queue', async () => {
  const q = new Queue({ maxRetries: 0 });
  const errors = [];
  
  q.on('task:fail', (id, err) => errors.push(err.message));
  
  const t1 = q.push(async () => { throw new Error('fail1'); });
  const t2 = q.push(async () => 'ok');
  
  t1.promise.catch(() => {});
  await t2.promise;
  
  // Wait for async event emission
  await new Promise(r => setTimeout(r, 100));
  
  assert.equal(errors.length, 1);
  assert.equal(errors[0], 'fail1');
});

test('error handling: timeout does not crash queue', async () => {
  const q = new Queue({ timeout: 50, maxRetries: 0 });
  
  const t1 = q.push(async () => new Promise(r => setTimeout(r, 200)));
  const t2 = q.push(async () => 'ok');
  
  t1.promise.catch(() => {});
  await t2.promise;
  await new Promise(r => setTimeout(r, 60)); // wait for timeout
  
  assert.equal(q.stats().failed, 1);
  assert.equal(q.stats().completed, 1);
});
