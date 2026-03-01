# /auto-update
Usage: /auto-update [--full | --scan-only | --category <name>]
Discover, evaluate, and integrate new skills, agents, and commands from the community.

## Steps
1. **Inventory current state**: Count existing skills, agents, commands and list categories
2. **Scan sources** for new content:
   - Fetch https://github.com/anthropics/skills for official updates
   - Fetch https://github.com/affaan-m/everything-claude-code for ECC updates
   - Fetch https://github.com/karanb192/awesome-claude-skills for community additions
   - Search GitHub for repos tagged "claude-code" or "claude-skills" updated in the last 7 days
3. **Diff against current**: Identify skills/agents/commands that are new or updated
4. **Evaluate candidates**: Score each as HIGH / MEDIUM / LOW based on relevance, quality, overlap, and security
5. **Report findings**: Show a table of candidates with scores and recommendations
6. If `--scan-only`, stop here. Otherwise continue:
7. **Integrate HIGH candidates**:
   - Create .md files in .claude/skills/, .claude/agents/, or .claude/commands/
   - Add entries to src/data/claudeSkills.ts, claudeAgents.ts, or claudeCommands.ts
   - Update CLAUDE.md with new counts and listings
8. **Verify**: Run `tsc --noEmit` and `vite build`
9. **Sync globally**: Copy new files to ~/.claude/ for cross-project access
10. **Report**: Show summary of what was added, updated, or skipped
