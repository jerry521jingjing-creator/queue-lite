# Issue #1: Priority ordering broken when tasks enqueue concurrently

## Description

Tasks with higher priority should execute before lower-priority tasks. Currently, when multiple tasks are enqueued rapidly, the first task starts executing immediately before higher-priority tasks can be inserted.

## Reproduction

```js
const q = new Queue({ concurrency: 1 });
q.push(lowPriorityFn, { priority: 0 });
q.push(highPriorityFn, { priority: 10 });
// Expected: highPriorityFn executes first
// Actual: lowPriorityFn executes first
```

## Root Cause

`push()` calls `_processNext()` immediately after inserting the task, so the first task starts before the second is enqueued.

## Fix Required

Add a microtask delay or batch mechanism so all synchronous `push()` calls complete before processing begins.

## Acceptance Criteria

- [ ] Higher-priority tasks execute before lower-priority tasks
- [ ] Existing 9 passing tests continue to pass
- [ ] New test verifies priority ordering with concurrent enqueue
- [ ] No regression in retry/timeout/concurrency behavior
