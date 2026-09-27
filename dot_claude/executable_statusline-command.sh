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

# Colors: use terminal palette colors (ANSI 0-15) so Flexoki Dark's
# own color definitions are respected rather than overriding with RGB values.
# Bold+color (1;3Xm) uses the terminal's bright/bold palette slot,
# which in Flexoki Dark maps to its saturated accent hues.
BLUE='\033[1;34m'    # bold blue  → Flexoki blue accent
RED='\033[1;31m'     # bold red → Flexoki red accent
YELLOW='\033[1;33m'  # bold yellow → Flexoki yellow accent
DIM='\033[2m'        # dim → muted for separators/numbers
RESET='\033[0m'

line="${BLUE}${short_cwd}${RESET}"
[ -n "$git_branch" ] && line="${line} ${RED} ${git_branch}${RESET}"
[ -n "$model" ]      && line="${line} ${DIM}|${RESET} ${YELLOW}${model}${RESET}"
[ -n "$used_pct" ]   && line="${line} ${DIM}| ctx:${used_pct}%${RESET}"
[ -n "$five_h" ]     && line="${line} ${DIM}| 5h:${five_h}%${RESET}"

printf "%b\n" "$line"
