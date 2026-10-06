# Graceful Degradation
Design systems that continue working when optional dependencies or services are unavailable.
## Instructions
- Check for required vs optional dependencies at startup
- When optional API keys are missing, skip dependent stages and log a warning
- When external services are unreachable, fall back to cached data or local alternatives
- Design multi-stage pipelines so each stage can be skipped independently
- Provide clear user feedback about what was skipped and why
- Use feature flags or environment variables to enable/disable capabilities
- Ensure core functionality works without any optional features
- Test degraded modes explicitly — verify the app works with each optional feature disabled
