## User Feedback
> "Please add input validation. If someone passes a non-function to push(), it fails silently or throws a cryptic error." — @security_alex

## Proposal
Add validation at push() entry:
- fn must be a function
- opts.priority must be a number
- opts.timeout must be a positive number
- Throw descriptive TypeError on invalid input

## Acceptance Criteria
- [ ] push(nonFunction) throws TypeError
- [ ] push(fn, { priority: "bad" }) throws TypeError
- [ ] Error messages are descriptive
- [ ] All existing tests pass
