#!/bin/sh
# Switch the color theme everywhere at once. Themes are the palettes in
# .chezmoidata/themes/ of the chezmoi source; see "Themes" in its README.
# Lives in the chezmoi source and is not deployed: run it from there.
# Usage: ./theme.sh [name]   (no name: pick from a list, previewed live)
set -eu

data=$(chezmoi data --format json)
current=$(printf '%s' "$data" | jq -r '.theme')
themes=$(printf '%s' "$data" | jq -r '.themes | keys[]')

name=${1:-}
if [ -z "$name" ]; then
  # Each theme is applied as it is highlighted, by this script calling itself.
  # The current theme is listed first so opening the picker changes nothing,
  # and leaving without choosing (esc) puts it back.
  name=$({ printf '%s\n' "$current"; printf '%s\n' "$themes" | grep -vxF -- "$current"; } \
    | fzf --prompt="theme ($current) > " --bind "focus:execute-silent(sh '$0' {})") || name=$current
fi
if ! printf '%s\n' "$themes" | grep -qxF -- "$name"; then
  echo "theme.sh: unknown theme '$name'. Available:" >&2
  printf '%s\n' "$themes" | sed 's/^/  /' >&2
  exit 1
fi

# The choice is per device: it goes in an untracked file that overrides the
# tracked default in theme.toml (data files merge in name order).
cat > "$(chezmoi source-path)/.chezmoidata/theme_local.toml" <<TOML
# This device's theme: a name from .chezmoidata/themes/. Written by theme.sh,
# not version controlled. Delete it to return to the default in theme.toml.
theme = "$name"
TOML

chezmoi apply --error-on-conflict \
  ~/.config/ghostty/themes/current \
  ~/.config/herdr/config.toml \
  ~/.config/zed/themes/dotfiles.json \
  ~/.claude/themes/dotfiles.json

# Ghostty reloads its config on SIGUSR2; Zed and Claude Code watch their
# themes directories.
pkill -USR2 -x ghostty || true
herdr server reload-config >/dev/null 2>&1 || true
