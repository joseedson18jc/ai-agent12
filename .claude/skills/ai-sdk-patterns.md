# AI SDK Patterns
Reusable patterns for Claude/Anthropic SDK: ask, askJSON, summarize, and batching.
## Instructions
- Wrap the Anthropic SDK in helper functions: ask(), askWithSystem(), askJSON(), summarize()
- Use askJSON() for structured output — instruct Claude to return JSON, then auto-parse
- Batch large inputs (chunk arrays into groups of 15-20) to avoid prompt size limits
- Use system prompts to define clear AI roles (curator, reviewer, editor, analyst)
- Implement singleton client pattern — one Anthropic instance, reuse across calls
- Add retry with exponential backoff for API failures (3 attempts default)
- Truncate long inputs to stay within token limits
