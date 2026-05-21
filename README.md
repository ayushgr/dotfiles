# dotfiles

My Dotfiles. Managed with [chezmoi](https://www.chezmoi.io/). Supports macOS and Arch Linux.

## Structural Rules
1. All aliases are set in `.zshrc`
1. All abbreviations are set in `zsh-abbr/private_user-abbreviations`

## Setup Instructions

### macOS
1. Install Homebrew
1. `brew install chezmoi`
1. `chezmoi init https://github.com/ayushgr/dotfiles.git`
1. `chezmoi apply`
1. `./install.sh`
1. `./language_init.sh`

### Arch Linux
1. Install `paru`
1. `paru -S chezmoi`
1. `chezmoi init https://github.com/ayushgr/dotfiles.git`
1. `chezmoi apply`
1. `./install.sh`
1. `./language_init.sh`

## Scripts
- `install.sh` — installs packages and apps (OS-aware: brew on macOS, paru on Arch)
- `language_init.sh` — sets up language toolchains (Rust, etc.)
