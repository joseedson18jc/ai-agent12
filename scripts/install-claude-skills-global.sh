#!/bin/bash
# ══════════════════════════════════════════════════════════════
# Claude Code Skills — Global Installer
# Installs 108 skills, 14 agents, and 34 commands to ~/.claude/
# so they are available in EVERY Claude Code session automatically.
# ══════════════════════════════════════════════════════════════
#
# Usage:
#   curl -sSL <raw-url>/scripts/install-claude-skills-global.sh | bash
#   # or
#   bash scripts/install-claude-skills-global.sh
#
# What it does:
#   1. Copies .claude/skills/   → ~/.claude/skills/   (108 skills)
#   2. Copies .claude/agents/   → ~/.claude/agents/   (14 agents)
#   3. Copies .claude/commands/ → ~/.claude/commands/  (34 commands as slash commands)
#
# After installation, every new Claude Code session will have access
# to all skills, agents, and /slash-commands globally.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$(dirname "$SCRIPT_DIR")"
CLAUDE_HOME="${CLAUDE_HOME:-$HOME/.claude}"

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  Claude Code Skills — Global Installer                  ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "Installing to: $CLAUDE_HOME"
echo ""

# Verify source exists
if [ ! -d "$SOURCE_DIR/.claude/skills" ]; then
  echo "Error: .claude/skills not found in $SOURCE_DIR"
  echo "Run this script from the ai-agent12 project root."
  exit 1
fi

# Create directories
mkdir -p "$CLAUDE_HOME/skills"
mkdir -p "$CLAUDE_HOME/agents"
mkdir -p "$CLAUDE_HOME/commands"

# Copy skills
echo "Installing skills..."
cp "$SOURCE_DIR/.claude/skills/"*.md "$CLAUDE_HOME/skills/"
SKILLS=$(ls "$CLAUDE_HOME/skills/"*.md 2>/dev/null | wc -l)
echo "  $SKILLS skills installed"

# Copy agents
echo "Installing agents..."
cp "$SOURCE_DIR/.claude/agents/"*.md "$CLAUDE_HOME/agents/"
AGENTS=$(ls "$CLAUDE_HOME/agents/"*.md 2>/dev/null | wc -l)
echo "  $AGENTS agents installed"

# Copy commands (these become /slash-commands automatically)
echo "Installing commands..."
cp "$SOURCE_DIR/.claude/commands/"*.md "$CLAUDE_HOME/commands/"
COMMANDS=$(ls "$CLAUDE_HOME/commands/"*.md 2>/dev/null | wc -l)
echo "  $COMMANDS commands installed"

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
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
echo "Try it: Open any project with Claude Code and type /plan"
