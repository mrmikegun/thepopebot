#!/bin/bash
# Start Claude Code in tmux, serve via ttyd (interactive runtime only)
# CONTINUE_SESSION: 1 = resume session for this port if session file exists

CLAUDE_ARGS=(claude --dangerously-skip-permissions)
if [ -n "$LLM_MODEL" ]; then
    CLAUDE_ARGS+=(--model "$LLM_MODEL")
fi
if [ -f /home/coding-agent/SYSTEM.md ]; then
    CLAUDE_ARGS+=(--append-system-prompt-file /home/coding-agent/SYSTEM.md)
fi

# Encode cwd the same way Claude Code does (non-alphanumeric → '-')
ENCODED_CWD=$(pwd | sed 's/[^a-zA-Z0-9]/-/g')

SESSION_FILE="/home/coding-agent/.claude-ttyd-sessions/${PORT:-7681}"
if [ "$CONTINUE_SESSION" = "1" ] && [ -f "$SESSION_FILE" ]; then
    SESSION_ID=$(cat "$SESSION_FILE")
    if [ -f "/home/coding-agent/.claude/projects/${ENCODED_CWD}/${SESSION_ID}.jsonl" ]; then
        CLAUDE_ARGS+=(--resume "$SESSION_ID")
    fi
fi

tmux -u new-session -d -s claude -e PORT="${PORT:-7681}" "${CLAUDE_ARGS[@]}"
exec ttyd --writable -p "${PORT:-7681}" tmux attach -t claude
