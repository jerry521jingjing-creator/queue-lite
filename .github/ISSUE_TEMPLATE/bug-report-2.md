# Issue #2: Race condition between pause() and resume()

## Description

When `pause()` and `resume()` are called rapidly, tasks can be lost or executed out of order.

## Reproduction

```js
const q = new Queue({ concurrency: 1 });
q.pause();
q.push(task1); // rejected
q.resume();
q.push(task2); // should execute
// Sometimes task2 is lost
```

## Root Cause

`resume()` calls `_processNext()` synchronously, but the deferred processing from `push()` may fire after resume, causing duplicate or missed processing.

## Acceptance Criteria

- [ ] pause() correctly rejects pending tasks
- [ ] resume() correctly processes queued tasks
- [ ] Rapid pause/resume cycles don't lose tasks
- [ ] All existing tests pass
