#!/bin/bash
# ══════════════════════════════════════════════════════════════
# Claude Code Skills — Cross-Platform Global Installer
# Works on: macOS (Mac), Linux, iPad (via web terminal)
# Installs 120 skills, 18 agents, 39 commands, hooks to ~/.claude/
# ══════════════════════════════════════════════════════════════
#
# Quick install (one-liner for any machine):
#   git clone https://github.com/joseedson18jc/ai-agent12.git /tmp/ai-agent12 && bash /tmp/ai-agent12/scripts/install-claude-skills-global.sh
#
# Already cloned:
#   bash scripts/install-claude-skills-global.sh
#
# What it does:
#   1. Detects your OS (macOS / Linux / iPad)
#   2. Copies .claude/skills/   → ~/.claude/skills/   (120 skills)
#   3. Copies .claude/agents/   → ~/.claude/agents/   (18 agents)
#   4. Copies .claude/commands/ → ~/.claude/commands/  (39 commands)
#   5. Copies .claude/hooks/    → ~/.claude/hooks/     (session-start + stop hooks)
#   6. Installs settings.json with Skill permissions and hooks
#   7. Installs global CLAUDE.md with full inventory
#
# After installation, every new Claude Code session will have access
# to all skills, agents, and /slash-commands globally — on any device.

set -euo pipefail

# ── Detect OS ──
OS="$(uname -s)"
case "$OS" in
  Darwin) PLATFORM="macOS" ;;
  Linux)  PLATFORM="Linux" ;;
  *)      PLATFORM="$OS" ;;
esac

# ── Resolve paths ──
if [ -n "${BASH_SOURCE[0]:-}" ] && [ -f "${BASH_SOURCE[0]}" ]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  SOURCE_DIR="$(dirname "$SCRIPT_DIR")"
elif [ -d "/tmp/ai-agent12/.claude" ]; then
  SOURCE_DIR="/tmp/ai-agent12"
elif [ -d "./.claude" ]; then
  SOURCE_DIR="$(pwd)"
else
  echo "Error: Cannot find .claude/ directory."
  echo "Clone the repo first: git clone https://github.com/joseedson18jc/ai-agent12.git /tmp/ai-agent12"
  exit 1
fi

CLAUDE_HOME="${CLAUDE_HOME:-$HOME/.claude}"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  Claude Code — Full Environment Installer                ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Platform: $PLATFORM"
echo "║  Source:   $SOURCE_DIR"
echo "║  Target:   $CLAUDE_HOME"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# ── Verify source ──
if [ ! -d "$SOURCE_DIR/.claude/skills" ]; then
  echo "Error: .claude/skills not found in $SOURCE_DIR"
  exit 1
fi

# ── Create directories ──
mkdir -p "$CLAUDE_HOME/skills"
mkdir -p "$CLAUDE_HOME/agents"
mkdir -p "$CLAUDE_HOME/commands"
mkdir -p "$CLAUDE_HOME/hooks"

# ── Copy skills (flat .md files) ──
echo "Installing skills..."
cp "$SOURCE_DIR/.claude/skills/"*.md "$CLAUDE_HOME/skills/" 2>/dev/null || true

# ── Copy skills (directory-based skills like session-start-hook/) ──
for dir in "$SOURCE_DIR/.claude/skills"/*/; do
  if [ -d "$dir" ]; then
    dirname=$(basename "$dir")
    mkdir -p "$CLAUDE_HOME/skills/$dirname"
    cp -r "$dir"* "$CLAUDE_HOME/skills/$dirname/"
  fi
done
SKILLS=$(find "$CLAUDE_HOME/skills" -name "*.md" | wc -l | tr -d ' ')
echo "  $SKILLS skills installed"

# ── Copy agents ──
echo "Installing agents..."
cp "$SOURCE_DIR/.claude/agents/"*.md "$CLAUDE_HOME/agents/"
AGENTS=$(find "$CLAUDE_HOME/agents" -name "*.md" | wc -l | tr -d ' ')
echo "  $AGENTS agents installed"

# ── Copy commands (→ slash commands) ──
echo "Installing commands..."
cp "$SOURCE_DIR/.claude/commands/"*.md "$CLAUDE_HOME/commands/"
COMMANDS=$(find "$CLAUDE_HOME/commands" -name "*.md" | wc -l | tr -d ' ')
echo "  $COMMANDS commands installed"

# ── Copy hooks ──
echo "Installing hooks..."
if [ -d "$SOURCE_DIR/.claude/hooks" ]; then
  cp "$SOURCE_DIR/.claude/hooks/"*.sh "$CLAUDE_HOME/hooks/" 2>/dev/null || true
  chmod +x "$CLAUDE_HOME/hooks/"*.sh 2>/dev/null || true
  HOOKS=$(find "$CLAUDE_HOME/hooks" -name "*.sh" | wc -l | tr -d ' ')
  echo "  $HOOKS hooks installed"
else
  echo "  No hooks to install"
fi

# ── Install/merge settings.json ──
SETTINGS_FILE="$CLAUDE_HOME/settings.json"
if [ ! -f "$SETTINGS_FILE" ]; then
  cat > "$SETTINGS_FILE" << 'SETTINGS_EOF'
{
    "$schema": "https://json.schemastore.org/claude-code-settings.json",
    "hooks": {
        "Stop": [
            {
                "matcher": "",
                "hooks": [
                    {
                        "type": "command",
                        "command": "~/.claude/hooks/stop-hook-git-check.sh"
                    }
                ]
            }
        ]
    },
    "permissions": {
        "allow": ["Skill"]
    }
}
SETTINGS_EOF
  echo "  Created settings.json (Skill auto-approval + Stop hook)"
else
  if grep -q '"Skill"' "$SETTINGS_FILE" 2>/dev/null; then
    echo "  settings.json already configured"
  else
    echo "  settings.json exists — add '\"Skill\"' to permissions.allow manually"
  fi
fi

# ── Install CLAUDE.md ──
CLAUDE_MD="$CLAUDE_HOME/CLAUDE.md"
cat > "$CLAUDE_MD" << 'CLAUDEMD_EOF'
# Global Claude Code Skills

This environment has 120 production-ready skills, 18 specialized agents, and 39 slash commands installed globally.

## Quick Reference

### Slash Commands (type / to see all)
`/plan` `/tdd` `/verify` `/code-review` `/security-scan` `/build-fix` `/e2e` `/refactor-clean` `/update-docs` `/orchestrate` `/multi-execute` `/checkpoint` `/skill-create` `/evolve` `/extract-data` `/content-create` `/github-triage` `/health-check`

### Agents (available in ~/.claude/agents/)
planner, architect, chief-of-staff, code-reviewer, security-reviewer, database-reviewer, tdd-guide, e2e-runner, build-error-resolver, refactor-cleaner, doc-updater, go-reviewer, go-build-resolver, python-reviewer, update-scout, content-pipeline, data-extractor, github-automator

### Skill Categories (120 skills in ~/.claude/skills/)
- **Testing**: TDD, unit testing, integration testing, e2e testing, snapshot testing, load testing
- **Code Quality**: coding standards, linting, refactoring patterns, code review
- **Security**: security scan, security review, dependency audit, vulnerability analysis
- **DevOps**: CI/CD, Docker, Kubernetes, infrastructure-as-code, monitoring, self-healing systems, graceful degradation
- **API**: API design, REST, GraphQL, WebSocket, API documentation, NL-to-API
- **Database**: migrations, query optimization, schema design, ClickHouse
- **Frontend**: React, responsive design, accessibility, CSS architecture
- **Backend**: backend patterns, microservices, event-driven architecture
- **AI/ML**: prompt engineering, RAG pipeline, AI model fine-tuning, LLM pipeline, AI SDK patterns, hybrid analysis, multi-agent pipeline
- **Business**: business automation, workflow optimization, cost analysis
- **Content**: technical writing, documentation, article writing, changelog
- **Data**: data visualization, CSV processing, SQL query builder, structured data extraction, PDF/Excel reports
- **Frameworks**: Next.js, Supabase, Go, Python patterns
- **Languages**: Go review, Go build, Python review
- **Creative**: algorithmic art, canvas design, brand guidelines
- **Collaboration**: human-in-the-loop, GitHub automation

## How It Works
- **Skills** in `~/.claude/skills/` provide domain knowledge and instructions
- **Commands** in `~/.claude/commands/` register as `/slash-commands` automatically
- **Agents** in `~/.claude/agents/` define specialized roles for complex tasks
- All are loaded automatically in every Claude Code session across all projects

## Portability
Run `./scripts/install-claude-skills-global.sh` from the ai-agent12 repo to install everything on any new device.
CLAUDEMD_EOF
echo "  Updated global CLAUDE.md"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  Installation Complete!                                  ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Skills:   $SKILLS"
echo "║  Agents:   $AGENTS"
echo "║  Commands: $COMMANDS (available as /slash-commands)"
echo "║  Hooks:    SessionStart + Stop (git commit check)"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Everything is now globally available in every Claude    ║"
echo "║  Code session, across all your projects.                ║"
echo "║                                                          ║"
echo "║  Works on: Mac, Linux, iPad (web), any Claude Code env  ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "Try it: Open any project with Claude Code and type /plan"

# ── Cleanup temp clone if applicable ──
if [ "$SOURCE_DIR" = "/tmp/ai-agent12" ]; then
  echo ""
  echo "Cleaning up temp clone..."
  rm -rf /tmp/ai-agent12
  echo "Done."
fi
