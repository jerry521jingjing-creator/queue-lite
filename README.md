# queue-lite

> Zero-dependency, production-ready task queue for Node.js

[![npm](https://img.shields.io/npm/v/queue-lite)](https://npmjs.com/package/queue-lite)
[![Tests](https://github.com/jerry521jingjing-creator/queue-lite/actions/workflows/test.yml/badge.svg)](https://github.com/jerry521jingjing-creator/queue-lite/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Why queue-lite?

- **Zero dependencies** — No Redis, no MongoDB, no external services
- **TypeScript ready** — Full type definitions included
- **Production features** — Retry, timeout, priority, rate limiting, deduplication
- **Event-driven** — EventEmitter integration for monitoring
- **Tiny** — ~5KB, no bloat

## Quick Start

```bash
npm install queue-lite
```

```js
const Queue = require('queue-lite');

const q = new Queue({ concurrency: 3 });

// Push a task
const { taskId, promise } = q.push(async () => {
  const response = await fetch('https://api.example.com/data');
  return response.json();
});

const result = await promise;
console.log(result);
```

## Features

### Concurrency Control
```js
const q = new Queue({ concurrency: 5 }); // max 5 parallel tasks
```

### Priority Tasks
```js
q.push(urgentTask, { priority: 10 }); // runs first
q.push(normalTask, { priority: 0 });  // runs after
```

### Retry with Backoff
```js
const q = new Queue({ maxRetries: 3, retryDelay: 1000 });
```

### Rate Limiting
```js
const q = new Queue({ rateLimit: 10, rateBurst: 5 }); // 10/sec, burst of 5
```

### Task Deduplication
```js
const { promise } = q.push(fn, { dedupKey: 'user-123' });
// Second push with same key is rejected
```

### Cancel Tasks
```js
const { cancel } = q.push(longRunningTask);
cancel(); // removes from queue if pending
```

### Progress Events
```js
q.on('task:complete', (taskId, result) => console.log('Done:', taskId));
q.on('progress', (completed, total) => console.log(`${completed}/${total}`));
q.on('drain', () => console.log('All tasks finished'));
```

### Wait for Completion
```js
await q.drainAll(); // resolves when queue is idle
```

## API Reference

### `new Queue(options)`
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `concurrency` | number | 3 | Max parallel tasks |
| `timeout` | number | 30000 | Task timeout (ms) |
| `maxRetries` | number | 3 | Max retry attempts |
| `retryDelay` | number | 1000 | Delay between retries (ms) |
| `rateLimit` | number | 0 | Tasks per second (0 = unlimited) |
| `rateBurst` | number | rateLimit | Burst capacity |

### `queue.push(fn, options)`
| Option | Type | Description |
|--------|------|-------------|
| `priority` | number | Higher = runs first |
| `timeout` | number | Per-task timeout (ms) |
| `dedupKey` | string | Deduplication key |

Returns: `{ taskId: string, promise: Promise, cancel: () => boolean }`

### Events
| Event | Args | Description |
|-------|------|-------------|
| `task:queued` | taskId | Task added to queue |
| `task:start` | taskId | Task execution started |
| `task:complete` | taskId, result | Task completed successfully |
| `task:fail` | taskId, error | Task failed |
| `task:retry` | taskId, attempt, error | Task being retried |
| `progress` | completed, total | Progress update |
| `drain` | — | Queue is empty |

## Examples

### API Rate Limiter
```js
const q = new Queue({ concurrency: 5, rateLimit: 100 });

app.post('/api/fetch', async (req, res) => {
  const { result } = await q.push(() => fetchExternalAPI(req.body.url));
  res.json(result);
});
```

### Batch Processor
```js
const q = new Queue({ concurrency: 10, rateLimit: 50 });

files.forEach(file => {
  q.push(() => processFile(file), { dedupKey: file.path });
});

await q.drainAll();
console.log('All files processed');
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## License

MIT
