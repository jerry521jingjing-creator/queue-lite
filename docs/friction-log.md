# Friction Points — Experiment #016

## FP-004: push() throws synchronously on rate limit

**Severity:** High
**Found in:** file-watcher-cli.js
**Error:**
```
Error: Rate limit exceeded
    at Queue.push (src/index.js:100:17)
```

**Problem:** `push()` throws synchronously when rate limit is exceeded, instead of returning a rejected promise. This breaks the normal flow:

```js
// User expects this to work:
const { promise } = q.push(fn);
promise.catch(handleError);

// But push() throws before returning:
const { promise } = q.push(fn); // CRASH here
```

**Root Cause:** Rate limit check happens before promise creation, so it throws instead of rejecting.

**Fix:** Move rate limit check after promise creation, or catch the throw in the caller.

**Impact:** Any code that calls push() without try/catch will crash on rate limit.
