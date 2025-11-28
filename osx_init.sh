# Install homebrew - Assuming installed outside of script

# Install chezmoi - Assuming installed outside of script
# brew install chezmoi

# Fonts
brew install font-fira-mono-nerd-font

# Install devtools
brew install eza # Improved ls
brew install bat # Improved cat
brew install hl # Log parsing and viewing
brew install rg # ripgrep
brew install jq # json parsing

# Install terminal
brew install --cask iterm2
# Specify the preferences directory
defaults write com.googlecode.iterm2.plist PrefsCustomFolder -string "~/.config/iterm2config"
# Tell iTerm2 to use the custom preferences in the directory
defaults write com.googlecode.iterm2.plist LoadPrefsFromCustomFolder -bool true

# Install zsh and terminal items
brew install antidote

# Consider new Tools -> https://github.com/johnalanwoods/maintained-modern-unix
# Consider atuin https://atuin.sh/
# Consider bottom https://formulae.brew.sh/formula/bottom
# Consider difftastic
# zoxide - modern cd
# fd - find alternative
# rg - ripgrep (grep)
# fzf - fuzzy finder
# jless - json viewer with mouse folding
# dra - download and install release assets
# lazygit - git TUI
# lazydocker - docker TUI
# yazi - file manager with image preview
# zellij - better tmux / screen

# Install Applications
brew install --cask claude-code
brew install amphetamine
# Todo Alt-Tab + Config
# Todo Rectangle + Config
# Todo Raycast + Config
# Todo Flux
# Todo Dropbox
# Todo Superwhisper
# Todo Magic Switch
