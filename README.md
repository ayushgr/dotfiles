# dotfiles

My Dotfiles.

# Structural Rules
1. All aliases are set in .zshrc
1. All abbreviations are set in zsh-abbr/private_user-abbreviations

## Setup Instructions
1. Install Homebrew
1. brew install chezmoi
1. chezmoi init https://github.com/ayushgr/dotfiles.git
1. chezmoi cd
1. ./repo_init.sh
1. ./osx_init.sh
1. ./language_init.sh
1. chezmoi apply
