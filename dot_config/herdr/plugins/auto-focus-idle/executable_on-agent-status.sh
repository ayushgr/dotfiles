#!/usr/bin/env bash
# Fires on every pane.agent_status_changed event.
# Switches focus to the pane when an agent goes idle, but only if herdr
# is not already focused on that workspace (to avoid hijacking the cursor
# when the user is already there).

set -euo pipefail

ctx="${HERDR_PLUGIN_CONTEXT_JSON:-}"
[[ -z "$ctx" ]] && exit 0

status=$(printf '%s' "$ctx" | jq -r '.focused_pane_status // empty')
workspace_id=$(printf '%s' "$ctx" | jq -r '.workspace_id // empty')

# Only act when an agent just finished in a background pane (status = done).
# "done" = idle + unseen. Once you visit the pane it becomes "idle".
# Triggering on "idle" would fire *after* you've already been there.
[[ "$status" != "done" ]] && exit 0
[[ -z "$workspace_id" ]] && exit 0

# Check which workspace is currently focused — don't steal focus if already there
focused=$(herdr workspace list 2>/dev/null | jq -r '.result.workspaces[] | select(.focused == true) | .workspace_id' 2>/dev/null || true)
[[ "$focused" == "$workspace_id" ]] && exit 0

# Ring the terminal bell so the pane flashes before we switch
printf '\a'

# Switch to the workspace that has the newly-idle agent
herdr workspace focus "$workspace_id"

# Then focus the specific pane within that workspace.
# The herdr CLI has no "pane focus <id>" command, so we send a raw
# PaneFocus request over the client socket (newline-delimited JSON).
pane_id=$(printf '%s' "$ctx" | jq -r '.focused_pane_id // empty')
if [[ -n "$pane_id" ]]; then
  socket="${HERDR_CLIENT_SOCKET_PATH:-${HERDR_SOCKET_PATH:-$HOME/.config/herdr/herdr-client.sock}}"
  payload=$(jq -cn --arg pid "$pane_id" '{"id":"plugin:pane-focus","method":"pane.focus","params":{"pane_id":$pid}}')
  printf '%s\n' "$payload" | nc -U -q1 "$socket" 2>/dev/null || true
fi
