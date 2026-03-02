#!/bin/bash
# ══════════════════════════════════════════════════════════════
# Claude Code Environment Sync
# Bidirectional sync between project .claude/ and global ~/.claude/
# Run from any device to make all skills/agents/commands available
# ══════════════════════════════════════════════════════════════
#
# Usage:
#   bash scripts/sync-claude-env.sh           # project → global (default)
#   bash scripts/sync-claude-env.sh --pull    # global → project
#   bash scripts/sync-claude-env.sh --status  # show diff report
#
# Works on: macOS, Linux, iPad (web terminal), any Claude Code env

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_CLAUDE="$PROJECT_DIR/.claude"
GLOBAL_CLAUDE="${CLAUDE_HOME:-$HOME/.claude}"
MODE="${1:---push}"

count_items() {
  local dir="$1"
  find "$dir" -name "*.md" 2>/dev/null | wc -l | tr -d ' '
}

case "$MODE" in
  --status)
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║  Claude Code Environment — Sync Status                   ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo ""
    echo "Project ($PROJECT_CLAUDE):"
    echo "  Skills:   $(count_items "$PROJECT_CLAUDE/skills")"
    echo "  Agents:   $(count_items "$PROJECT_CLAUDE/agents")"
    echo "  Commands: $(count_items "$PROJECT_CLAUDE/commands")"
    echo ""
    echo "Global ($GLOBAL_CLAUDE):"
    echo "  Skills:   $(count_items "$GLOBAL_CLAUDE/skills")"
    echo "  Agents:   $(count_items "$GLOBAL_CLAUDE/agents")"
    echo "  Commands: $(count_items "$GLOBAL_CLAUDE/commands")"
    echo ""

    # Show differences
    echo "Differences:"
    DIFF_FOUND=false

    ONLY_PROJECT=$(comm -23 <(find "$PROJECT_CLAUDE/skills" -name "*.md" -exec basename {} \; 2>/dev/null | sort) <(find "$GLOBAL_CLAUDE/skills" -name "*.md" -exec basename {} \; 2>/dev/null | sort))
    ONLY_GLOBAL=$(comm -13 <(find "$PROJECT_CLAUDE/skills" -name "*.md" -exec basename {} \; 2>/dev/null | sort) <(find "$GLOBAL_CLAUDE/skills" -name "*.md" -exec basename {} \; 2>/dev/null | sort))

    if [ -n "$ONLY_PROJECT" ]; then
      echo "  Skills only in project: $ONLY_PROJECT"
      DIFF_FOUND=true
    fi
    if [ -n "$ONLY_GLOBAL" ]; then
      echo "  Skills only in global:  $ONLY_GLOBAL"
      DIFF_FOUND=true
    fi

    if [ "$DIFF_FOUND" = false ]; then
      echo "  Everything is in sync!"
    fi
    ;;

  --pull)
    echo "Pulling global → project..."
    mkdir -p "$PROJECT_CLAUDE/skills" "$PROJECT_CLAUDE/agents" "$PROJECT_CLAUDE/commands"

    cp "$GLOBAL_CLAUDE/skills/"*.md "$PROJECT_CLAUDE/skills/" 2>/dev/null || true
    # Copy directory-based skills
    for dir in "$GLOBAL_CLAUDE/skills"/*/; do
      [ -d "$dir" ] && cp -r "$dir" "$PROJECT_CLAUDE/skills/"
    done
    cp "$GLOBAL_CLAUDE/agents/"*.md "$PROJECT_CLAUDE/agents/" 2>/dev/null || true
    cp "$GLOBAL_CLAUDE/commands/"*.md "$PROJECT_CLAUDE/commands/" 2>/dev/null || true

    echo "  Skills:   $(count_items "$PROJECT_CLAUDE/skills")"
    echo "  Agents:   $(count_items "$PROJECT_CLAUDE/agents")"
    echo "  Commands: $(count_items "$PROJECT_CLAUDE/commands")"
    echo "Done! Project updated from global."
    ;;

  --push|*)
    echo "Pushing project → global..."
    mkdir -p "$GLOBAL_CLAUDE/skills" "$GLOBAL_CLAUDE/agents" "$GLOBAL_CLAUDE/commands" "$GLOBAL_CLAUDE/hooks"

    cp "$PROJECT_CLAUDE/skills/"*.md "$GLOBAL_CLAUDE/skills/" 2>/dev/null || true
    # Copy directory-based skills
    for dir in "$PROJECT_CLAUDE/skills"/*/; do
      if [ -d "$dir" ]; then
        dirname=$(basename "$dir")
        mkdir -p "$GLOBAL_CLAUDE/skills/$dirname"
        cp -r "$dir"* "$GLOBAL_CLAUDE/skills/$dirname/"
      fi
    done
    cp "$PROJECT_CLAUDE/agents/"*.md "$GLOBAL_CLAUDE/agents/" 2>/dev/null || true
    cp "$PROJECT_CLAUDE/commands/"*.md "$GLOBAL_CLAUDE/commands/" 2>/dev/null || true

    # Sync hooks
    if [ -d "$PROJECT_CLAUDE/hooks" ]; then
      cp "$PROJECT_CLAUDE/hooks/"*.sh "$GLOBAL_CLAUDE/hooks/" 2>/dev/null || true
      chmod +x "$GLOBAL_CLAUDE/hooks/"*.sh 2>/dev/null || true
    fi

    echo "  Skills:   $(count_items "$GLOBAL_CLAUDE/skills")"
    echo "  Agents:   $(count_items "$GLOBAL_CLAUDE/agents")"
    echo "  Commands: $(count_items "$GLOBAL_CLAUDE/commands")"
    echo "Done! Global environment updated from project."
    echo ""
    echo "Every Claude Code session on this device now has access to everything."
    ;;
esac
