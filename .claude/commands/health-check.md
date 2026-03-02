# /health-check
Usage: /health-check [--remote <host>]
Run system health checks with AI-powered root cause analysis for anomalies.
## Steps
1. Collect system metrics: CPU, memory, disk, load average, uptime
2. Check thresholds: warning at 80%, critical at 95%
3. If anomalies detected, run AI root cause analysis
4. Suggest remediation actions based on findings
5. Log results for trend analysis
6. For remote hosts: collect metrics via SSH
