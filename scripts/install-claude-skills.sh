#!/bin/bash
# ══════════════════════════════════════════════════════════════
# Claude Code Skills Installer
# Installs 120 skills, 18 agents, and 39 commands into any project
# ══════════════════════════════════════════════════════════════
#
# Usage:
#   curl -sSL <raw-url>/scripts/install-claude-skills.sh | bash
#   # or
#   bash scripts/install-claude-skills.sh [target-directory]
#
# This copies the .claude/ directory and CLAUDE.md to the target project.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$(dirname "$SCRIPT_DIR")"
TARGET_DIR="${1:-.}"

# Resolve to absolute path
TARGET_DIR="$(cd "$TARGET_DIR" && pwd)"

echo "Installing Claude Code skills to: $TARGET_DIR"
echo ""

# Copy .claude directory
if [ -d "$SOURCE_DIR/.claude" ]; then
  mkdir -p "$TARGET_DIR/.claude"
  cp -r "$SOURCE_DIR/.claude/skills" "$TARGET_DIR/.claude/"
  cp -r "$SOURCE_DIR/.claude/agents" "$TARGET_DIR/.claude/"
  cp -r "$SOURCE_DIR/.claude/commands" "$TARGET_DIR/.claude/"
  if [ -d "$SOURCE_DIR/.claude/hooks" ]; then
    cp -r "$SOURCE_DIR/.claude/hooks" "$TARGET_DIR/.claude/"
    chmod +x "$TARGET_DIR/.claude/hooks/"*.sh 2>/dev/null || true
  fi
else
  echo "Error: .claude directory not found in $SOURCE_DIR"
  exit 1
fi

# Copy CLAUDE.md (only if it doesn't exist)
if [ ! -f "$TARGET_DIR/CLAUDE.md" ]; then
  cp "$SOURCE_DIR/CLAUDE.md" "$TARGET_DIR/CLAUDE.md"
  echo "Created CLAUDE.md"
else
  echo "CLAUDE.md already exists, skipping (merge manually if needed)"
fi

# Count installed items
SKILLS=$(ls "$TARGET_DIR/.claude/skills/" 2>/dev/null | wc -l)
AGENTS=$(ls "$TARGET_DIR/.claude/agents/" 2>/dev/null | wc -l)
COMMANDS=$(ls "$TARGET_DIR/.claude/commands/" 2>/dev/null | wc -l)

echo ""
echo "Installation complete!"
echo "  Skills:   $SKILLS"
echo "  Agents:   $AGENTS"
echo "  Commands: $COMMANDS"
echo ""
echo "All skills are now available in your Claude Code sessions."
echo "Run '/skill-stocktake' to verify installation."
