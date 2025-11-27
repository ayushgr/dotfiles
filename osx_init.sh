# Install homebrew
# ...

# Install chezmoi
brew install chezmoi

# run chezmoi

# Install devtools
brew install hl
brew install rg
brew install jq

# install firemono nerd font for terminal

# Install terminal
brew install --cask iterm2
# Specify the preferences directory
defaults write com.googlecode.iterm2.plist PrefsCustomFolder -string "~/.config/iterm2config"
# Tell iTerm2 to use the custom preferences in the directory
defaults write com.googlecode.iterm2.plist LoadPrefsFromCustomFolder -bool true

# Install zsh items
brew install antidote