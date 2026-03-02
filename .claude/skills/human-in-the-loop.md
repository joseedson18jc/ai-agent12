# Human-in-the-Loop AI
AI suggests actions, human confirms before execution — essential for destructive or external operations.
## Instructions
- Always show AI suggestions before executing them
- Require explicit user confirmation for: sending emails, posting comments, creating PRs, modifying data
- Use --dry-run flags for preview mode (show what would happen without acting)
- Use --apply or --post flags to opt-in to actual execution
- Format AI suggestions clearly: show the action, reasoning, and consequences
- Provide escape hatches: let users modify AI suggestions before confirming
- Log all confirmed actions for audit trails
- Never auto-execute destructive operations without human approval
