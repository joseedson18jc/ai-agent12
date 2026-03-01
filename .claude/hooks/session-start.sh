#!/bin/bash
# ══════════════════════════════════════════════════════════════
# SessionStart Hook — Auto-verify skills are loaded
# Runs automatically when a Claude Code session begins.
# ══════════════════════════════════════════════════════════════

PROJECT_DIR="$(pwd)"
CLAUDE_DIR="$PROJECT_DIR/.claude"

# Count what's available in this project
SKILLS=0
AGENTS=0
COMMANDS=0

if [ -d "$CLAUDE_DIR/skills" ]; then
  SKILLS=$(find "$CLAUDE_DIR/skills" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
fi

if [ -d "$CLAUDE_DIR/agents" ]; then
  AGENTS=$(find "$CLAUDE_DIR/agents" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
fi

if [ -d "$CLAUDE_DIR/commands" ]; then
  COMMANDS=$(find "$CLAUDE_DIR/commands" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
fi

echo "Skills: $SKILLS | Agents: $AGENTS | Commands: $COMMANDS"
