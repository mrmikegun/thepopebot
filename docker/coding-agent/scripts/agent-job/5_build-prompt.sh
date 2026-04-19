#!/bin/bash
# Set up job metadata, log directory, system prompt, and build task prompt

cd /home/coding-agent/workspace

# Extract job ID from branch if not set
if [ -z "$AGENT_JOB_ID" ] && [[ "$BRANCH" == agent-job/* ]]; then
    export AGENT_JOB_ID="${BRANCH#agent-job/}"
fi

# Setup logs directory
LOG_DIR="/home/coding-agent/workspace/logs/${AGENT_JOB_ID}"
mkdir -p "$LOG_DIR"
export LOG_DIR

# Read job metadata from config file
CONFIG_FILE="logs/${AGENT_JOB_ID}/agent-job.config.json"
if [ -f "$CONFIG_FILE" ]; then
    [ -z "$AGENT_JOB_TITLE" ] && export AGENT_JOB_TITLE=$(jq -r '.title // empty' "$CONFIG_FILE")
    [ -z "$AGENT_JOB_DESCRIPTION" ] && export AGENT_JOB_DESCRIPTION=$(jq -r '.job // empty' "$CONFIG_FILE")

    # Read pre-rendered system prompt from config (rendered by EH with full template resolution)
    CONFIG_SYSTEM_PROMPT=$(jq -r '.system_prompt // empty' "$CONFIG_FILE")
    if [ -n "$CONFIG_SYSTEM_PROMPT" ]; then
        echo "$CONFIG_SYSTEM_PROMPT" > /home/coding-agent/SYSTEM.md
        echo "$CONFIG_SYSTEM_PROMPT" > "${LOG_DIR}/system-prompt.md"
    fi
fi

# Fallback: if no pre-rendered system prompt, write whatever we have to the log
if [ ! -f /home/coding-agent/SYSTEM.md ] && [ -f "agent-job/SYSTEM.md" ]; then
    # Raw template — datetime only (skills/includes not resolved)
    FALLBACK=$(cat "agent-job/SYSTEM.md" | sed "s/{{datetime}}/$(date -u +"%Y-%m-%dT%H:%M:%SZ")/g")
    echo "$FALLBACK" > /home/coding-agent/SYSTEM.md
    echo "$FALLBACK" > "${LOG_DIR}/system-prompt.md"
fi

# Build the prompt from description
export PROMPT="

# Your Job

${AGENT_JOB_DESCRIPTION}"
