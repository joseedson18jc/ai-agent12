# /verify
Usage: /verify
Runs the full verification loop: lint, type-check, test, build. Stops on first failure.
## Steps
1. Run linter (eslint/prettier)
2. Run type checker (tsc --noEmit)
3. Run test suite (npm test)
4. Run production build (npm run build)
5. Report pass/fail for each step
