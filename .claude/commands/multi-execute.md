# /multi-execute
Usage: /multi-execute [plan-id]
Executes a multi-agent plan using git worktrees for isolation.
## Steps
1. Create worktrees for each agent
2. Launch agents in parallel
3. Monitor progress and handle failures
4. Merge results back to main branch
5. Run verification on merged result
