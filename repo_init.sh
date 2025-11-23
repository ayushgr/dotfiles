#!/bin/bash

# Initialize the repository

set -e

echo "Initializing repository..."

# Configure git to use .githooks as the hooks path
git config core.hooksPath .githooks
echo "✓ Git hooks path configured to .githooks"

echo "✓ Repository initialization complete!"
