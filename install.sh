#!/usr/bin/env bash
set -euo pipefail

# Install homebrew - Assuming installed outside of script
# /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
# Install chezmoi - Assuming installed outside of script
# brew install chezmoi

### OSX Settings and Manual Actions
# MAYBE-TODO - Figure out osx script command. Defaults is complex. Likely not worth the time
# OSX Settings -> Enable Secondary Click
# OSX Settings -> Change fn key to ctrl
# OSX Settings -> Keyboard -> Shortcuts -> Services -> Text -> Disable Super+C Chinese
# Make Dock Smaller + Autohide + On the Left
# Finder -> Add Home Dir to Favorites
# Menu Bar -> Always show volume

# Disable Window Opening Animation -> From https://nikitabobko.github.io/AeroSpace/goodies#highlight-focused-windows-with-colored-borders
defaults write -g NSAutomaticWindowAnimationsEnabled -bool false

# Terminal utilities
brew install eza          # Improved ls
brew install bat          # Improved cat
brew install hl           # Log parsing and viewing
brew install ripgrep      # Better grep replacement
brew install jq           # JSON parsing
brew install fd           # Better find replacement
brew install zoxide       # Better cd replacement
brew install procs        # Alternative to ps
brew install fzf          # Fuzzy finder
brew install bottom       # Improved Activity Monitor
brew install hyperfine    # Command benchmarking (e.g. `hyperfine 'zsh -i -c exit'`)
brew install git-delta    # Syntax-highlighted git diffs (GIT_PAGER in .zprofile)

# Terminal apps
brew install gh           # GitHub CLI

# Terminal core - fonts, zsh, terminal app
brew install font-fira-mono-nerd-font
brew install antidote     # Zsh plugin manager. `antidote update` updates plugins (incl. oh-my-zsh lib); `brew upgrade` updates antidote
brew install --cask ghostty@tip

# Applications
brew install --cask flux-app
brew install --cask jordanbaird-ice  # Menu bar manager
brew install --cask tablepro # RDBMS Query Tool

brew install --cask alt-tab
# After settings changes, re-export, then `chezmoi re-add` to sync it back
# May have to still change Animation Setting to 0 false false
# defaults export com.lwouis.alt-tab-macos ~/.config/imports/com.lwouis.alt-tab-macos.plist
defaults import com.lwouis.alt-tab-macos ~/.config/imports/com.lwouis.alt-tab-macos.plist

brew install --cask raycast
# Raycast -> Settings -> Advanced -> Import ~/.config/imports/raycast.rayconfig

# Todo VSCode OR Cursor

### Manual Installs

# Magic Switch -> Download File Again

brew install --cask handy

brew install --cask slack
# Slack -> Initialize Logins + Nocturne Theme

###########################################################################
# If needed per device
# brew install --cask amphetamine
# brew install --cask dropbox
# brew install --cask vlc
# brew install --cask mpv

# Herdr - terminal multiplexer + agent runtime
if ! command -v herdr &>/dev/null; then
  curl -fsSL https://herdr.dev/install.sh | sh
fi

# Herdr plugins
herdr plugin link ~/.config/herdr/plugins/auto-focus-idle 2>/dev/null || true

#####################################################################
# Consider new Tools
# https://github.com/johnalanwoods/maintained-modern-unix
# https://github.com/rothgar/awesome-tuis
#   lazygit
#   lazydocker
#   yazi
# https://github.com/agarrharr/awesome-cli-apps
# https://github.com/toolleeo/awesome-cli-apps-in-a-csv

# Consider CleanshotX OR Shottr - Improved Screenshots
#   Nothing has dotfile based settings. Skipping for Now as of December 2025
# Consider https://github.com/boyter/scc/ - Code Counter + Analyzer
# Consider https://github.com/sachaos/viddy - watch alternative
# Consider https://github.com/mikefarah/yq - YAML + More Parser
# Consider https://github.com/dathere/qsv - CSV + More Parser
# Consider https://github.com/sharkdp/hyperfine - Cli Benchmarking Tool
# Consider https://atuin.sh/ - Advanced Shell History Search
# Consider difftastic - Advanced diff viewer
# Consider jless - json viewer with mouse folding
# Consider https://github.com/mikker/LeaderKey - Complex Shortcuts
#   Deciding to push RayCast to its Limits

# Consider Omarchy Items. Notably Hotkeys
# https://learn.omacom.io/2/the-omarchy-manual
# https://learn.omacom.io/2/the-omarchy-manual/53/hotkeys

# Consider Other Peoples Dotfiles for Inspiration
# https://github.com/mathiasbynens/dotfiles/tree/main
# https://github.com/gianlucatruda/dotfiles
