## User Feedback
> "Love the simplicity! But I need TypeScript definitions. Can't use this in production without type safety." — @devops_mike

## Proposal
Add index.d.ts with full type definitions for:
- Queue class
- push() return type (taskId, promise, cancel)
- stats() return type
- Options type
- drainAll() type

## Acceptance Criteria
- [ ] index.d.ts covers all public API
- [ ] TypeScript compiler validates definitions
- [ ] Examples in README for TS usage
