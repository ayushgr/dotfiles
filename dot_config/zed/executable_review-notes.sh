#!/bin/zsh
# Review notes for a coding agent that runs outside Zed.
# Run by the Zed tasks in tasks.json, which pass the cursor context as ZED_* variables.
#
#   review-notes.sh add    append a note on the current line or selection
#   review-notes.sh copy   copy a prompt that points the agent at the notes file

root=${ZED_WORKTREE_ROOT:-$PWD}
name=.review-notes.md
notes=$root/$name

# Keep the notes file out of git without touching the repo's .gitignore.
ignore_notes() {
  local exclude
  exclude=$(git -C "$root" rev-parse --path-format=absolute --git-path info/exclude 2>/dev/null) || return 0
  grep -qxF "$name" "$exclude" 2>/dev/null && return 0
  mkdir -p "${exclude:h}"
  print -r -- "$name" >> "$exclude"
}

add() {
  if [[ -z $ZED_RELATIVE_FILE || -z $ZED_ROW ]]; then
    print -u2 "No file under the cursor."
    return 1
  fi

  # The key binding copies the selection (or the cursor's line) before running this.
  # Zed's own variables are unusable on removed lines in a diff view: no selected
  # text and a wrong row. The clipboard always holds what is on screen.
  local code=$(pbpaste)
  [[ -z $code ]] && code=${ZED_SELECTED_TEXT:-$(sed -n "${ZED_ROW}p" "$ZED_FILE" 2>/dev/null)}
  code=${code%$'\n'}
  local -a code_lines=("${(@f)code}")
  local start=$ZED_ROW
  local end=$(( start + ${#code_lines} - 1 ))

  local location
  if [[ $(sed -n "${start},${end}p" "$ZED_FILE" 2>/dev/null) == *"$code"* ]]; then
    location=$ZED_RELATIVE_FILE:$start
    (( end > start )) && location+=-$end
    [[ -n $ZED_SYMBOL ]] && location+=" ($ZED_SYMBOL)"
  else
    # Not in the file at that row, so this is the old side of a diff. Zed's row is
    # wrong there, so find the text in the last commit, if it appears exactly once.
    location="$ZED_RELATIVE_FILE, old version of the code"
    local head=$(git -C "$root" show "HEAD:./$ZED_RELATIVE_FILE" 2>/dev/null)
    if [[ $head == *"$code"* && ${head#*"$code"} != *"$code"* ]]; then
      local before=${head%%"$code"*}
      local newlines=${before//[^$'\n']/}
      start=$(( ${#newlines} + 1 ))
      end=$(( start + ${#code_lines} - 1 ))
      location+=", line"
      (( end > start )) && location+="s $start-$end" || location+=" $start"
      location+=" in the last commit"
    fi
  fi

  # Piped input is for testing.
  print -r -- "$location"
  local comment=
  if [[ -t 0 ]]; then
    vared -p 'Note: ' comment
  else
    read -r comment
  fi
  if [[ -z ${comment// /} ]]; then
    print "Empty note, nothing saved."
    return 0
  fi

  ignore_notes
  {
    print -r -- "## $location"
    print
    print -r -- '````'${ZED_RELATIVE_FILE:e}
    print -r -- "$code"
    print -r -- '````'
    print
    print -r -- "$comment"
    print
  } >> "$notes"
}

copy() {
  if [[ ! -s $notes ]]; then
    print -u2 "No review notes in $notes"
    return 1
  fi
  local count=$(grep -c '^## ' "$notes")
  print -rn -- "Address my review notes in $notes. Each note has a file location, the code it refers to and my comment. When you have addressed all of them, empty that file." | pbcopy
  print "Copied a prompt for $count note(s)."
}

case $1 in
  add) add ;;
  copy) copy ;;
  *) print -u2 "usage: review-notes.sh add|copy"; exit 2 ;;
esac
