## v1.1.0 Release

### New Features
- **TypeScript definitions** — Full .d.ts with type overloads for all events (#6)
- **Progress events** — EventEmitter integration: task:queued, task:start, task:complete, task:fail, task:retry, progress, drain (#8)
- **Input validation** — push() validates fn is a function, opts are correct types (#7)

### Bug Fixes
- Stats accuracy — completed count updated before resolve() (#2)
- Pause/resume race condition (#2)
- Priority ordering with deferred processing (#1)

### Test Coverage
- 40 tests, all passing
- Event tests, validation tests, integration tests

### Breaking Changes
- push() now returns { taskId, promise, cancel() } instead of bare Promise (#1)

### Upgrade Guide
```js
// Before
const result = await queue.push(fn);

// After
const { promise, taskId, cancel } = queue.push(fn);
const result = await promise;
```
