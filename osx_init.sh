# Install homebrew - Assuming installed outside of script
# /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
# Install chezmoi - Assuming installed outside of script
# brew install chezmoi

### OSX Settings and Manual Actions

# OSX Settings -> Keyboard -> Shortcuts -> Services -> Text -> Disable Super+C Chinese # TODO - Figure out osx script command

# Disable Window Opening Animation -> From https://nikitabobko.github.io/AeroSpace/goodies#highlight-focused-windows-with-colored-borders
defaults write -g NSAutomaticWindowAnimationsEnabled -bool false

# Install terminal utilities
brew install eza # Improved ls
brew install bat # Improved cat
brew install hl # Log parsing and viewing
brew install rg # ripgrep
brew install jq # json parsing
brew install fd # better find replacement
brew install zoxide # better cd replacement
brew install ripgrep # better grep replacement
brew install procs # alternative to ps
brew install fzf # fuzzy finder
brew install bottom # Improved Activity Monitor

# Install terminal apps
brew install gh # github

# Install Terminal Core - fonts, zsh, terminal app
brew install font-fira-mono-nerd-font # Font
brew install antidote # Zsh Plugin Manager - Oh-My-Zsh but faster and simpler
brew install --cask ghostty@tip # Ghostty Preleases

# Install Applications
brew install --cask claude-code
# Todo Alt-Tab + Config
# Todo Flux
# Todo Superwhisper/VoiceInk
# Todo Slack
# Todo VSCode OR Cursor
brew install --cask raycast # TODO - Setup ConfigFiles

# Manual Installs
brew install --cask bettertouchtool # Do Auth + Load Default.bttpreset
# BTT Inspiration -> https://old.reddit.com/r/MacOS/comments/1cytw1p/whats_your_bettertouchtool_setup/
# BetterTouchTool -> Do Email Auth/Login
# Magic Switch -> Download File Again

#####################################################################

# If needed per device
# brew install --cask amphetamine
# brew install --cask dropbox
# brew install --cask vlc
# brew install --cask mpv

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
