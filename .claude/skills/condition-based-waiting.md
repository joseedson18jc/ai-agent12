# Condition-Based Waiting
Async testing patterns with proper wait conditions instead of arbitrary delays.
## Instructions
- NEVER use sleep() or fixed delays in tests
- Wait for specific DOM elements, network responses, or state changes
- Use polling with timeout for custom conditions
- Prefer framework waitFor/waitUntil helpers
- Set reasonable timeouts with clear error messages
