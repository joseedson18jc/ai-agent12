#!/bin/bash
# ══════════════════════════════════════════════════════════════
# Claude Code Skills — Cross-Platform Global Installer
# Works on: macOS (Mac), Linux, iPad (via web terminal)
# Installs 108 skills, 14 agents, and 34 commands to ~/.claude/
# ══════════════════════════════════════════════════════════════
#
# Quick install (one-liner for any machine):
#   git clone https://github.com/joseedson18jc/ai-agent12.git /tmp/ai-agent12 && bash /tmp/ai-agent12/scripts/install-claude-skills-global.sh
#
# Already cloned:
#   bash scripts/install-claude-skills-global.sh
#
# What it does:
#   1. Detects your OS (macOS / Linux)
#   2. Copies .claude/skills/   → ~/.claude/skills/   (108 skills)
#   3. Copies .claude/agents/   → ~/.claude/agents/   (14 agents)
#   4. Copies .claude/commands/ → ~/.claude/commands/  (34 commands)
#   5. Installs project settings for Skill auto-approval
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
# Support both "bash scripts/install..." and piped curl
if [ -n "${BASH_SOURCE[0]:-}" ] && [ -f "${BASH_SOURCE[0]}" ]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  SOURCE_DIR="$(dirname "$SCRIPT_DIR")"
else
  # Piped from curl — look for /tmp/ai-agent12 or current dir
  if [ -d "/tmp/ai-agent12/.claude" ]; then
    SOURCE_DIR="/tmp/ai-agent12"
  elif [ -d "./.claude" ]; then
    SOURCE_DIR="$(pwd)"
  else
    echo "Error: Cannot find .claude/ directory."
    echo "Clone the repo first: git clone https://github.com/joseedson18jc/ai-agent12.git /tmp/ai-agent12"
    exit 1
  fi
fi

CLAUDE_HOME="${CLAUDE_HOME:-$HOME/.claude}"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  Claude Code Skills — Global Installer                  ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Platform: $PLATFORM                                     "
echo "║  Target:   $CLAUDE_HOME                                  "
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

# ── Copy skills (108) ──
echo "Installing skills..."
cp "$SOURCE_DIR/.claude/skills/"*.md "$CLAUDE_HOME/skills/"
SKILLS=$(find "$CLAUDE_HOME/skills" -name "*.md" | wc -l | tr -d ' ')
echo "  $SKILLS skills installed"

# ── Copy agents (14) ──
echo "Installing agents..."
cp "$SOURCE_DIR/.claude/agents/"*.md "$CLAUDE_HOME/agents/"
AGENTS=$(find "$CLAUDE_HOME/agents" -name "*.md" | wc -l | tr -d ' ')
echo "  $AGENTS agents installed"

# ── Copy commands (34 → slash commands) ──
echo "Installing commands..."
cp "$SOURCE_DIR/.claude/commands/"*.md "$CLAUDE_HOME/commands/"
COMMANDS=$(find "$CLAUDE_HOME/commands" -name "*.md" | wc -l | tr -d ' ')
echo "  $COMMANDS commands installed"

# ── Install/merge settings.json ──
SETTINGS_FILE="$CLAUDE_HOME/settings.json"
if [ ! -f "$SETTINGS_FILE" ]; then
  # No settings yet — create fresh
  cat > "$SETTINGS_FILE" << 'SETTINGS_EOF'
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "allow": ["Skill"]
  }
}
SETTINGS_EOF
  echo "  Created settings.json (Skill auto-approval enabled)"
else
  # Settings exist — check if Skill permission is already there
  if grep -q '"Skill"' "$SETTINGS_FILE" 2>/dev/null; then
    echo "  settings.json already has Skill permission"
  else
    echo "  settings.json exists — add '\"Skill\"' to permissions.allow manually"
  fi
fi

# ── Install CLAUDE.md reference (user-level) ──
if [ ! -f "$CLAUDE_HOME/CLAUDE.md" ]; then
  if [ -f "$SOURCE_DIR/CLAUDE.md" ]; then
    cp "$SOURCE_DIR/CLAUDE.md" "$CLAUDE_HOME/CLAUDE.md"
    echo "  Installed global CLAUDE.md"
  fi
else
  echo "  CLAUDE.md already exists, skipping"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  Installation Complete!                                  ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  Skills:   $SKILLS                                       "
echo "║  Agents:   $AGENTS                                       "
echo "║  Commands: $COMMANDS (available as /slash-commands)       "
echo "╠══════════════════════════════════════════════════════════╣"
echo "║  All skills are now globally available in every          ║"
echo "║  Claude Code session, across all your projects.         ║"
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
