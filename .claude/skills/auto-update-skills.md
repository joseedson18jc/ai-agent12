# Auto-Update Skills Ecosystem
Automatically discover, evaluate, and integrate new Claude Code skills, agents, and commands from the community.

## Instructions
- Scan source repositories for new/updated skills weekly:
  - anthropics/skills (official Anthropic skills)
  - affaan-m/everything-claude-code (ECC ecosystem)
  - karanb192/awesome-claude-skills (community curated)
  - GitHub trending repos tagged "claude-code", "claude-skills", "claude-agent"
- For each discovered skill, evaluate:
  - Relevance: does it solve a real workflow gap?
  - Quality: does it have clear instructions and actionable steps?
  - Overlap: does it duplicate an existing skill?
  - Security: does it introduce unsafe patterns?
- Score candidates: HIGH (must-add), MEDIUM (nice-to-have), LOW (skip)
- For HIGH candidates:
  1. Create .claude/skills/<name>.md with # Title, description, ## Instructions
  2. Add entry to src/data/claudeSkills.ts with status: 'verified'
  3. Create Supabase migration if adding new categories
  4. Update CLAUDE.md skill counts and category listings
- For new agents: create .claude/agents/<name>.md with Role, Capabilities, Instructions
- For new commands: create .claude/commands/<name>.md with Usage, Steps
- After updates:
  1. Run tsc --noEmit to verify TypeScript
  2. Run vite build to verify production build
  3. Sync updated files to ~/.claude/ for global access
  4. Commit with message: "weekly-update: add N skills, M agents, K commands"
- Generate a changelog entry in CHANGELOG.md with what was added/updated
- Track skill ecosystem health metrics:
  - Total count by type (skills, agents, commands)
  - Coverage gaps by category
  - Stale skills that haven't been updated in 90+ days
