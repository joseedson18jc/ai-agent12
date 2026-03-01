# Verification Loop
Continuous verification: lint, type-check, test, build in sequence with fail-fast and reporting.
## Instructions
1. Run linter (eslint/prettier) first - fastest feedback
2. Run type checker (tsc --noEmit) - catch type errors
3. Run test suite - validate behavior
4. Run production build - ensure it compiles
- Stop on first failure, report clearly
- Cache results where possible
