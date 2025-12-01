# Install homebrew - Assuming installed outside of script
# /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
# Install chezmoi - Assuming installed outside of script
# brew install chezmoi

# Install terminal utilities
brew install eza # Improved ls
brew install bat # Improved cat
brew install hl # Log parsing and viewing
brew install rg # ripgrep
brew install jq # json parsing
brew install procs # alternative to ps # TODO - Setup Dotfiles + Alias
brew install zoxide # better cd replacement # TODO - Setup Doftiles + Alias
brew install ripgrep # better grep replacement # TODO - Setup Dotfiles + Alias
brew install fd # better find replacement # TODO - Setup Dotfiles + Alias
brew install fzf # fuzzy finder # TODO - Setup Dotfiles + Alias
brew install bottom # Improved Activity Monitor # TODO - Setup Dotfiles + Alias

# Install terminal apps
brew install gh # github

# Install fonts, zsh, terminal
brew install font-fira-mono-nerd-font # Font
brew install antidote # Zsh Plugin Manager - Oh-My-Zsh but faster and simpler
brew install --cask iterm2 # Terminal App
# Specify the preferences directory
defaults write com.googlecode.iterm2.plist PrefsCustomFolder -string "~/.config/iterm2config"
# Tell iTerm2 to use the custom preferences in the directory
defaults write com.googlecode.iterm2.plist LoadPrefsFromCustomFolder -bool true

# Install Applications
brew install --cask claude-code
# Todo Alt-Tab + Config
# Todo Flux
# Todo Superwhisper
# Todo Slack
# Todo VSCode OR Cursor
brew install --cask raycast # TODO - Setup ConfigFiles

# Manual Installs
brew install --cask bettertouchtool # Do Auth + Load Default.bttpreset
# BetterTouchTool -> Do Email Auth/Login
# Magic Switch -> Download File Again

# Manual OSX Settings - If using Aerospace
# Desktop and Dock -> Mission Control -> Displays Have Separate Spaces -> Off
# Disable Window Opening Animation -> From https://nikitabobko.github.io/AeroSpace/goodies#highlight-focused-windows-with-colored-borders
defaults write -g NSAutomaticWindowAnimationsEnabled -bool false

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
# Consider https://github.com/boyter/scc/ - Code Counter + Analyzer
# Consider https://github.com/sachaos/viddy - watch alternative
# Consider https://github.com/mikefarah/yq - YAML + More Parser
# Consider https://github.com/dathere/qsv - CSV + More Parser
# Consider https://github.com/sharkdp/hyperfine - Cli Benchmarking Tool
# Consider https://atuin.sh/ - Advanced Shell History Search 
# Consider difftastic - Advanced diff viewer
# Consider jless - json viewer with mouse folding

# Consider Omarchy Items. Notably Hotkeys
# https://learn.omacom.io/2/the-omarchy-manual
# https://learn.omacom.io/2/the-omarchy-manual/53/hotkeys

