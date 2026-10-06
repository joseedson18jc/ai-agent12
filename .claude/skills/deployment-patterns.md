# Deployment Patterns
Blue-green, canary, rolling updates, rollbacks, health checks.
## Instructions
- Use blue-green for zero-downtime deploys
- Canary release to 5-10% traffic first
- Configure health checks with readiness/liveness probes
- Automate rollback on error rate increase
- Keep at least 2 previous versions for rollback
