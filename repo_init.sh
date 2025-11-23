#!/bin/bash

# Initialize the repository with git hooks configuration

set -e

echo "Initializing repository..."

# Create .githooks directory if it doesn't exist
if [ ! -d ".githooks" ]; then
    mkdir -p .githooks
    echo "Created .githooks directory"
fi

# Configure git to use .githooks as the hooks path
git config core.hooksPath .githooks
echo "✓ Git hooks path configured to .githooks"

echo "✓ Repository initialization complete!"

