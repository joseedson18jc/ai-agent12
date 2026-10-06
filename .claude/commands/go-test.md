# /go-test
Usage: /go-test [package] [flags]
Runs Go tests with coverage, race detection, and benchmarks.
## Steps
1. Run tests with -race -cover flags
2. Generate coverage report
3. Run benchmarks if requested
4. Report failures with context
5. Suggest fixes for failing tests
