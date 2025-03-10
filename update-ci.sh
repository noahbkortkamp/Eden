#!/bin/bash
cat > .github/workflows/ci.yml << 'EOL'
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: "18"
        cache: "npm"
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run tests with coverage
      run: npm run test:ci
      
    - name: Build
      run: npm run build:web
      
    - name: Lint
      run: npm run lint
      
    - name: Upload coverage reports
      uses: actions/upload-artifact@v3
      with:
        name: coverage-report
        path: coverage/
EOL

echo "CI workflow file updated successfully." 