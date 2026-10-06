# Natural Language to API
Convert natural language commands into structured API calls using AI.
## Instructions
- Use askJSON() to translate user intent into API parameters (endpoint, method, body)
- Provide the AI with available API endpoints and their schemas as context
- Validate generated API calls against known schemas before execution
- Support conversational REPL mode for interactive command sessions
- Cache device/entity lists to reduce API calls
- Handle ambiguous commands by asking for clarification
- Always confirm destructive API calls before execution
- Map common natural language patterns to specific API domains and services
