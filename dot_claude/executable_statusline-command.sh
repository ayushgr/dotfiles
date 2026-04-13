#!/bin/sh
# Claude Code status line — mirrors Powerlevel10k lean prompt style
input=$(cat)

# --- Directory ---
cwd=$(echo "$input" | jq -r '.workspace.current_dir // .cwd // ""')
# Abbreviate $HOME to ~
home="$HOME"
short_cwd="${cwd#$home}"
if [ "$short_cwd" != "$cwd" ]; then
  short_cwd="~$short_cwd"
fi

# --- Git branch ---
git_branch=""
if command -v git >/dev/null 2>&1; then
  git_branch=$(git -C "$cwd" --no-optional-locks symbolic-ref --short HEAD 2>/dev/null \
    || git -C "$cwd" --no-optional-locks rev-parse --short HEAD 2>/dev/null)
fi

# --- Model ---
model=$(echo "$input" | jq -r '.model.display_name // ""')

# --- Context usage ---
used_pct=$(echo "$input" | jq -r '.context_window.used_percentage // empty')

# --- Rate limits (Claude.ai subscribers) ---
five_h=$(echo "$input" | jq -r '.rate_limits.five_hour.used_percentage // empty')

# --- Build the line ---
# Colors: use terminal palette colors (ANSI 0-15) so Flexoki Dark's
# own color definitions are respected rather than overriding with RGB values.
# Bold+color (1;3Xm) uses the terminal's bright/bold palette slot,
# which in Flexoki Dark maps to its saturated accent hues.
BLUE='\033[1;34m'    # bold blue  → Flexoki blue accent
RED='\033[1;31m'   # bold red → Flexoki red accent
YELLOW='\033[1;33m'  # bold yellow → Flexoki yellow accent
DIM='\033[2m'        # dim → muted for separators/numbers
RESET='\033[0m'

line=""

# dir
line="${line}$(printf "${BLUE}%s${RESET}" "$short_cwd")"

# git branch
if [ -n "$git_branch" ]; then
  line="${line} $(printf "${RED} %s${RESET}" "$git_branch")"
fi

# model
if [ -n "$model" ]; then
  line="${line}$(printf " ${DIM}|${RESET} ${YELLOW}%s${RESET}" "$model")"
fi

# context
if [ -n "$used_pct" ]; then
  printf_pct=$(printf '%.0f' "$used_pct")
  line="${line}$(printf " ${DIM}| ctx:%s%%${RESET}" "$printf_pct")"
fi

# rate limit
if [ -n "$five_h" ]; then
  printf_5h=$(printf '%.0f' "$five_h")
  line="${line}$(printf " ${DIM}| 5h:%s%%${RESET}" "$printf_5h")"
fi

printf "%b\n" "$line"
