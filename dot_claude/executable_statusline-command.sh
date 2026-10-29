#!/bin/bash
# Claude Code status line — mirrors Powerlevel10k lean prompt style
# Output: <dir> <branch> | <model> | ctx:N% | 5h:N%
#
# Every open session runs this on every render, so it uses bash builtins only:
# no jq, no git, no subshells. The shebang is bash, not sh: macOS /bin/sh is a
# shim that execs bash, which would cost a second process launch.

IFS= read -r -d '' json

# Regexes for the JSON fields we need. The model and five_hour objects hold no
# nested objects; context_window holds one level (current_usage).
ws='[[:space:]]*'
str="$ws:$ws\"(([^\"\\\\]|\\\\.)*)\""
num="$ws:$ws([0-9]+)(\\.([0-9]))?[0-9]*([eE]-)?"
flat="$ws:$ws\\{[^{}]*\\}"
nested="$ws:$ws\\{([^{}]|\\{[^{}]*\\})*\\}"

# Unescape a JSON string in $1 into REPLY (\uXXXX escapes are left as is).
unescape() {
  REPLY=${1//\\\\/$'\001'}
  REPLY=${REPLY//\\\"/\"}
  REPLY=${REPLY//\\\//\/}
  REPLY=${REPLY//$'\001'/\\}
}

# Round the used_percentage number in $1 into REPLY, like jq's round.
percent() {
  REPLY=
  if [[ $1 =~ \"used_percentage\"$num ]]; then
    if [ -n "${BASH_REMATCH[4]}" ]; then REPLY=0      # tiny value in e-notation
    elif [ "${BASH_REMATCH[3]:-0}" -ge 5 ]; then REPLY=$((BASH_REMATCH[1] + 1))
    else REPLY=${BASH_REMATCH[1]}
    fi
  fi
}

cwd=
if [[ $json =~ \"current_dir\"$str ]] || [[ $json =~ \"cwd\"$str ]]; then
  unescape "${BASH_REMATCH[1]}"; cwd=$REPLY
fi
model=
if [[ $json =~ \"model\"$flat ]] && [[ ${BASH_REMATCH[0]} =~ \"display_name\"$str ]]; then
  unescape "${BASH_REMATCH[1]}"; model=$REPLY
fi
used_pct=
[[ $json =~ \"context_window\"$nested ]] && percent "${BASH_REMATCH[0]}" && used_pct=$REPLY
five_h=
[[ $json =~ \"five_hour\"$flat ]] && percent "${BASH_REMATCH[0]}" && five_h=$REPLY

# Abbreviate $HOME to ~
case "$cwd" in
  "$HOME"*) short_cwd="~${cwd#"$HOME"}" ;;
  *) short_cwd="$cwd" ;;
esac

# Branch from HEAD, found the way git does: walk up to the nearest .git, which
# is a directory, or in worktrees and submodules a file naming the real gitdir.
# Detached HEAD shows the first 7 characters of the commit.
git_branch=
dir=${cwd:-$PWD}   # like git -C "", which uses the current directory
while :; do
  gitdir=
  if [ -f "$dir/.git/HEAD" ]; then
    gitdir=$dir/.git
  elif [ -f "$dir/.git" ]; then
    read -r gitdir < "$dir/.git"
    gitdir=${gitdir#gitdir: }
    case "$gitdir" in /*) ;; *) gitdir=$dir/$gitdir ;; esac
  fi
  if [ -n "$gitdir" ] && read -r head < "$gitdir/HEAD"; then
    case "$head" in
      "ref: refs/heads/"*) git_branch=${head#ref: refs/heads/} ;;
      "ref: "*) git_branch=${head#ref: refs/} ;;
      *) git_branch=${head:0:7} ;;
    esac
    break
  fi
  case "$dir" in */*) dir=${dir%/*} ;; *) break ;; esac
done

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
