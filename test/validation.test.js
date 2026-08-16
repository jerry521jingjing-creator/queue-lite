const { test } = require('node:test');
const assert = require('node:assert/strict');
const Queue = require('../src/index');

test('validation: throws on non-function', () => {
  const q = new Queue();
  assert.throws(() => q.push('not a function'), TypeError);
  assert.throws(() => q.push(123), TypeError);
  assert.throws(() => q.push(null), TypeError);
  assert.throws(() => q.push(undefined), TypeError);
});

test('validation: throws on invalid priority type', () => {
  const q = new Queue();
  assert.throws(() => q.push(async () => 1, { priority: 'high' }), TypeError);
  assert.throws(() => q.push(async () => 1, { priority: true }), TypeError);
});

test('validation: throws on invalid timeout', () => {
  const q = new Queue();
  assert.throws(() => q.push(async () => 1, { timeout: -1 }), TypeError);
  assert.throws(() => q.push(async () => 1, { timeout: 0 }), TypeError);
  assert.throws(() => q.push(async () => 1, { timeout: 'fast' }), TypeError);
});

test('validation: accepts valid inputs', () => {
  const q = new Queue();
  // Should not throw
  const { taskId } = q.push(async () => 1, { priority: 5, timeout: 1000 });
  assert.ok(taskId);
});

test('validation: accepts null opts (uses defaults)', () => {
  const q = new Queue();
  const { taskId } = q.push(async () => 1);
  assert.ok(taskId);
});

test('validation: error messages are descriptive', () => {
  const q = new Queue();
  try {
    q.push('bad');
  } catch (e) {
    assert.ok(e.message.includes('function'));
    assert.ok(e.message.includes('string'));
  }
});
