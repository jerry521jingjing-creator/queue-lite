# Why I Built queue-lite: A Zero-Dependency Task Queue for Node.js

## The Problem

Every Node.js project that needs to run tasks in parallel ends up with the same choice:

1. **Bull/BullMQ** — Powerful, but requires Redis. Overkill for 90% of use cases.
2. **p-queue** — Great for promises, but no retry, no timeout, no rate limiting.
3. **Roll your own** — Everyone does it, everyone gets it wrong.

There's a gap: a queue that's **zero-config**, **production-ready**, and **doesn't need Redis**.

## What queue-lite Does

```js
const Queue = require('queue-lite');

const q = new Queue({
  concurrency: 5,      // max 5 parallel tasks
  rateLimit: 100,      // 100 tasks/second
  maxRetries: 3,       // retry failed tasks
  timeout: 10000,      // 10s timeout per task
});

// Push tasks
const { taskId, promise, cancel } = q.push(async () => {
  const result = await fetch('https://api.example.com/data');
  return result.json();
});

// Monitor progress
q.on('task:complete', (id, result) => console.log('Done:', id));
q.on('progress', (done, total) => console.log(`${done}/${total}`));

// Wait for all
await q.drainAll();
```

## Key Features

| Feature | queue-lite | p-queue | BullMQ |
|---------|-----------|---------|--------|
| Zero dependencies | ✅ | ✅ | ❌ (Redis) |
| TypeScript | ✅ | ✅ | ✅ |
| Rate limiting | ✅ | ❌ | ✅ |
| Task deduplication | ✅ | ❌ | ❌ |
| Retry with backoff | ✅ | ❌ | ✅ |
| Priority queue | ✅ | ✅ | ✅ |
| Cancel tasks | ✅ | ✅ | ✅ |
| Bundle size | ~5KB | ~3KB | 200KB+ |

## When to Use queue-lite

- API rate limiting
- Batch file processing
- Background job processing
- Webhook handling
- Anywhere you need "run N things in parallel"

## When NOT to Use queue-lite

- You need persistence (use BullMQ)
- You need a dashboard (use BullMQ)
- You need distributed workers (use BullMQ)

## Installation

```bash
npm install queue-lite
```

## Try It

```bash
git clone https://github.com/jerry521jingjing-creator/queue-lite.git
cd queue-lite
npm test
```

## Links

- [GitHub](https://github.com/jerry521jingjing-creator/queue-lite)
- [npm](https://npmjs.com/package/queue-lite) (coming soon)
- [API Reference](https://github.com/jerry521jingjing-creator/queue-lite#api-reference)

---

*If you try queue-lite, I'd love to hear your feedback. Open an issue or start a discussion on GitHub.*
