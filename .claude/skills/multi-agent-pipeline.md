# Multi-Agent Pipeline
Coordinate specialized AI agents in a staged pipeline with state tracking and error recovery.
## Instructions
- Define clear pipeline stages: research → write → edit → optimize (or similar)
- Each stage uses a specialized agent with its own system prompt and role
- Track state in a persistent store (SQLite/localStorage) so pipelines can resume after failure
- Pass output from one stage as input to the next
- Implement a Coordinator class that manages stage transitions and error handling
- Use a task queue for batch processing multiple items through the pipeline
- Log stage completions and errors for debugging
- Support partial execution: allow running individual stages independently
- Add graceful degradation: skip optional stages when dependencies (API keys, services) are missing
