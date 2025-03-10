#!/bin/bash

# Create .vscode directory
mkdir -p .vscode

# Create settings.json
cat > .vscode/settings.json << 'EOL'
{
  "jest.enable": true,
  "jest.autoRun": "off",
  "jest.showCoverageOnLoad": false,
  "jest.pathToJest": "npm test --",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "files.exclude": {
    "coverage/": false
  },
  "search.exclude": {
    "coverage/": true
  }
}
EOL

# Create VS Code extensions recommendations
cat > .vscode/extensions.json << 'EOL'
{
  "recommendations": [
    "orta.vscode-jest",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "formulahendry.auto-rename-tag",
    "ms-vscode.test-adapter-converter",
    "ryanluker.vscode-coverage-gutters",
    "yoavbls.pretty-ts-errors"
  ]
}
EOL

echo "VS Code settings and extension recommendations have been set up." 