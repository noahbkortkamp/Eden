#!/bin/bash

# Create husky directory
mkdir -p .husky

# Create pre-commit hook
cat > .husky/pre-commit << 'EOL'
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
EOL

# Make the pre-commit hook executable
chmod +x .husky/pre-commit

echo "Husky pre-commit hook has been set up." 