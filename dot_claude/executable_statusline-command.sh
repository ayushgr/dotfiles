#!/bin/sh
# Claude Code status line — mirrors Powerlevel10k lean prompt style
# Output: <dir> <branch> | <model> | ctx:N% | 5h:N%

# Extract every field in one jq call. Fields are joined with the ASCII unit
# separator (not tab) so empty fields survive `read` instead of collapsing.
US=$(printf '\037')
IFS="$US" read -r cwd model used_pct five_h <<EOF
$(jq -r --arg us "$US" '[
  .workspace.current_dir // .cwd // "",
  .model.display_name // "",
  (.context_window.used_percentage | if . then round else "" end),
  (.rate_limits.five_hour.used_percentage | if . then round else "" end)
] | map(tostring) | join($us)')
EOF

# Abbreviate $HOME to ~
case "$cwd" in
  "$HOME"*) short_cwd="~${cwd#"$HOME"}" ;;
  *) short_cwd="$cwd" ;;
esac

git_branch=$(git -C "$cwd" --no-optional-locks symbolic-ref --short HEAD 2>/dev/null \
  || git -C "$cwd" --no-optional-locks rev-parse --short HEAD 2>/dev/null)

# Colors: ANSI palette slots only (no RGB), so the status line follows
# whichever theme the terminal is using.
FAINT='\033[90m'     # palette 8 → parent directories
WHITE='\033[37m'     # palette 7 → muted text, readable in light and dark themes
GREEN='\033[32m'
YELLOW='\033[33m'
RED='\033[31m'
DIM='\033[2m'        # dim → muted for separators/numbers
RESET='\033[0m'

# Parent directories faint, the current directory in muted text.
case "$short_cwd" in
  /)   parent=""; leaf="/" ;;
  */*) parent="${short_cwd%/*}/"; leaf="${short_cwd##*/}" ;;
  *)   parent=""; leaf="$short_cwd" ;;
esac

# Context usage stays dim until it is worth noticing.
ctx_color=$DIM
if [ -n "$used_pct" ]; then
  if [ "$used_pct" -ge 90 ]; then ctx_color=$RED
  elif [ "$used_pct" -ge 70 ]; then ctx_color=$YELLOW
  fi
fi

line="${FAINT}${parent}${RESET}${WHITE}${leaf}${RESET}"
[ -n "$git_branch" ] && line="${line} ${GREEN} ${git_branch}${RESET}"
[ -n "$model" ]      && line="${line} ${DIM}|${RESET} ${YELLOW}${model}${RESET}"
[ -n "$used_pct" ]   && line="${line} ${DIM}|${RESET} ${ctx_color}ctx:${used_pct}%${RESET}"
[ -n "$five_h" ]     && line="${line} ${DIM}| 5h:${five_h}%${RESET}"

printf "%b\n" "$line"
