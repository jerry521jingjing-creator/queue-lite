# Roadmap — queue-lite v1.1.0

## Analysis of User Feedback

| Feedback | Priority | Impact | Effort |
|----------|----------|--------|--------|
| TypeScript definitions | 🔴 High | All TS users | Medium |
| Input validation | 🔴 High | Prevents silent bugs | Low |
| Progress events | 🟠 Medium | CLI/automation users | Medium |
| Documentation | 🟠 Medium | All users | Medium |
| Task object API | 🟡 Low | API ergonomics | High |
| Persistence | 🟡 Low | Production use | High |
| Benchmarks | 🟢 Nice | Marketing | Low |

## v1.1.0 Release Plan

### Must Have (ship blockers)
1. **TypeScript definitions** — Feedback #1
2. **Input validation** — Feedback #4
3. **Progress events** — Feedback #3

### Should Have
4. **Documentation overhaul** — Feedback #7
5. **Benchmarks in README** — Feedback #5

### Won't Have (v1.2.0+)
6. Task object API redesign — Feedback #6 (breaking change, defer to v2.0)
7. Persistence — Feedback #2 (complex, separate release)

## Issue Plan

| Issue | Title | Type | Priority | PR Target |
|-------|-------|------|----------|-----------|
| #10 | Add TypeScript definitions (.d.ts) | feature | P0 | PR #6 |
| #11 | Add input validation to push() | bugfix | P0 | PR #7 |
| #12 | Add task progress events | feature | P1 | PR #8 |
| #13 | Documentation overhaul | docs | P1 | PR #9 |
| #14 | Add benchmarks to README | docs | P2 | PR #10 |
