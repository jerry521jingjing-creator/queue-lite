# Engineering Strategy — queue-lite

## Strategic Analysis

### Current State (v1.1.0)
- 0 dependencies, 40 tests, full TypeScript
- Core features: concurrency, retry, timeout, priority, events
- Single file, ~230 LOC
- 100% in-memory

### Market Position

| Competitor | Persistence | TS | Deps | Bundle |
|-----------|-------------|-----|------|--------|
| BullMQ | Redis | ✅ | 3 | 200KB+ |
| p-queue | ❌ | ✅ | 0 | 3KB |
| bee-queue | Redis | ❌ | 2 | 50KB |
| **queue-lite** | ❌ | ✅ | 0 | 5KB |

### Strategic Decision: "Zero-Config Power"

**Core thesis:** Be the queue that works immediately with zero setup, but scales to production with optional backends.

**NOT competing with BullMQ** on Redis/monitoring. Instead, own the "zero-config" niche.

## Architecture Decisions

### ADR-001: Plugin-based Backend System
- **Decision:** Add optional persistence via plugins, not built-in
- **Rationale:** Keep core zero-dep, let users add Redis/file/MongoDB as needed
- **Consequences:** Core stays small, ecosystem grows via plugins

### ADR-002: Rate Limiting as First-Class Feature
- **Decision:** Add rate limiting (tasks/second) to core
- **Rationale:** Most requested feature in task queues, easy to implement, high value
- **Consequences:** Small API addition, significant user value

### ADR-003: Task Deduplication
- **Decision:** Add optional task dedup by key
- **Rationale:** Prevents duplicate work in distributed systems
- **Consequences:** Minor API addition, major reliability improvement

### ADR-004: NO Pipeline/Chain API (v2.0)
- **Decision:** Defer pipeline/chain to v2.0
- **Rationale:** Complex to implement correctly, low demand for lightweight queue
- **Consequences:** Keeps v1.x simple, v2.0 can be breaking change

### ADR-005: NO Worker Thread Support (v2.0)
- **Decision:** Defer worker threads to v2.0
- **Rationale:** Requires significant architecture change, most users use process-based workers
- **Consequences:** v1.x stays single-process, v2.0 adds worker support

## Roadmap (Autonomous)

### v1.2.0 — Rate Limiting + Dedup (Next Release)
- Rate limiting (tasks/second, burst)
- Task deduplication by key
- Task timeout per-task (already exists, verify)

### v1.3.0 — Persistence Plugin + Metrics
- Plugin interface for persistence
- File-based persistence plugin (built-in)
- Metrics: throughput, latency, error rate

### v2.0.0 — Breaking Changes
- Pipeline/chain API
- Worker thread support
- New task result API

## Anti-Features (Won't Build)

1. **Built-in Redis** — Let plugins handle this
2. **Dashboard UI** — Out of scope for core library
3. **Job scheduling (cron)** — Different use case
4. **Priority queues with >1000 levels** — Unnecessary complexity
