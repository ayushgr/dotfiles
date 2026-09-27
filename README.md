# dotfiles

My Dotfiles. Managed with [chezmoi](https://www.chezmoi.io/). macOS only.

## Structural Rules
1. All aliases are set in `.zshrc`
1. All abbreviations are set in `zsh-abbr/private_user-abbreviations`

## Setup Instructions

1. Install Homebrew
1. `brew install chezmoi`
1. `chezmoi init https://github.com/ayushgr/dotfiles.git`
1. `chezmoi apply`
1. `./install.sh`

## Scripts
- `install.sh` — installs packages and apps via Homebrew
