## User Feedback
> "I'm building a CLI tool that processes 1000 files in parallel. The concurrency control is perfect, but I wish there was a way to see real-time progress — like a progress bar or event emitter for task completion." — @cli_hunter

## Proposal
Add progress events via EventEmitter:
- queue.on('task:complete', (taskId, result) => {})
- queue.on('task:fail', (taskId, error) => {})
- queue.on('drain', () => {})
- queue.on('progress', (completed, total) => {})

## Acceptance Criteria
- [ ] Queue extends EventEmitter (or wraps it)
- [ ] Events fire for each task lifecycle stage
- [ ] Progress event includes completed/total counts
- [ ] Test coverage for all events
