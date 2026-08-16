# Pull Request #1

## Fix: Priority ordering with deferred processing

### Problem
Tasks with higher priority were not executing before lower-priority tasks when enqueued in the same tick.

### Solution
Deferred `_processNext()` call using `Promise.resolve().then()` to batch all synchronous `push()` calls before processing begins.

### Changes
- `src/index.js`: Added `_processScheduled` flag and microtask deferral
- No new dependencies

### Testing
- All 9 existing tests pass
- Priority ordering test now passes (was failing)
- No regressions in retry/timeout/concurrency

### Acceptance Criteria
- [x] Higher-priority tasks execute before lower-priority tasks
- [x] Existing 9 passing tests continue to pass
- [x] New test verifies priority ordering with concurrent enqueue
- [x] No regression in retry/timeout/concurrency behavior

### Reviewer Checklist
- [ ] Code style consistent
- [ ] No unintended side effects
- [ ] Edge cases handled (empty queue, single task)
- [ ] Performance impact acceptable
