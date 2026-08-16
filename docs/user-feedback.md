# User Feedback (simulated from GitHub Issues / Discord / Twitter)

## Feedback #1 — @devops_mike
> "Love the simplicity! But I need TypeScript definitions. Can't use this in production without type safety."
> — GitHub Issue #6 (hypothetical)

## Feedback #2 — @backend_sarah
> "The queue works great for in-memory tasks. But when my server restarts, all pending tasks are lost. Any plan for persistence?"
> — Discord #queue-lite channel

## Feedback #3 — @cli_hunter
> "I'm building a CLI tool that processes 1000 files in parallel. The concurrency control is perfect, but I wish there was a way to see real-time progress — like a progress bar or event emitter for task completion."
> — Twitter @cli_hunter

## Feedback #4 — @security_alex
> "Please add input validation. If someone passes a non-function to push(), it fails silently or throws a cryptic error."
> — GitHub Issue #7 (hypothetical)

## Feedback #5 — @perf_ninja
> "Benchmarked against bull and bee-queue. queue-lite is 3x faster for simple cases. Would love to see official benchmarks in the README."
> — Reddit r/node

## Feedback #6 — @api_designer
> "The new { taskId, promise, cancel() } API is awkward. Why not make push() return a Task object with .result, .cancel(), .status properties?"
> — GitHub Discussion #8 (hypothetical)

## Feedback #7 — @doc_writer
> "README is minimal. Need: API reference, examples for common patterns (rate limiting, batch processing, pipeline), and contributing guide."
> — GitHub Issue #9 (hypothetical)
