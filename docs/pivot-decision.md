# Strategic Pivot — v1.3.0

## Pivot Decision

**FROM:** Building more queue features (rate limit, dedup, persistence)
**TO:** Building adoption infrastructure (README, CI/CD, npm, docs)

## Rationale

| Before Pivot | After Pivot |
|-------------|-------------|
| "What features should we build?" | "How do we get users?" |
| Rate limiting, dedup, persistence | README, CI/CD, npm publish, examples |
| Internal metrics only | Real user metrics |
| Feature-complete | Adoption-ready |

## New Roadmap

### v1.3.0 — Adoption Release (NOT features)
1. **README overhaul** — Usage examples, API reference, comparison table
2. **GitHub Actions CI** — Test on push, lint, coverage
3. **npm publish** — Make it installable
4. **Contributing guide** — How to add features
5. **Real-world examples** — API server, CLI tool, batch processor

### What We're NOT Building (Anti-Features confirmed)
- ❌ Persistence plugin (nobody asked for it)
- ❌ Dashboard UI (out of scope)
- ❌ Worker threads (too complex for v1.x)
- ❌ Pipeline/chain API (defer to v2.0)

## Success Metric for v1.3.0
- npm installs > 0 within 1 week
- GitHub stars > 0 within 1 month
- At least 1 external issue filed
