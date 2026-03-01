# Testing Anti-Patterns
Identifies common testing mistakes and poor isolation patterns to avoid.
## Instructions
- Flag shared mutable state between tests — isolate with setup/teardown
- Test behavior, not implementation details — assert outputs, not internals
- Minimize mocking: only mock external dependencies, not the code under test
- Eliminate non-deterministic (flaky) tests — fix or quarantine immediately
- Ensure tests run independently in any order — no hidden dependencies
- Never permanently skip tests — fix or delete them
- Avoid testing private methods directly — test through public API
- Keep tests fast: mock I/O, use in-memory databases for unit tests
