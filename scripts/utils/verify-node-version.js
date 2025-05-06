// Simple script to verify correct Node.js version
const semver = require('semver');

// Read required version from .nvmrc
const fs = require('fs');
const requiredVersion = fs.readFileSync('.nvmrc', 'utf8').trim();
const requiredMajor = semver.major(requiredVersion);

// Check current version
const currentVersion = process.version;
const currentMajor = semver.major(currentVersion);

// Only check major version match
if (currentMajor !== requiredMajor) {
  console.error('\x1b[31mError: Incorrect Node.js version\x1b[0m');
  console.error(`You are using Node.js ${currentVersion}, but this project requires Node.js ${requiredMajor}.x`);
  console.error('\nTo fix this, run:');
  console.error('\x1b[33m  nvm use\x1b[0m');
  process.exit(1);
}

console.log(`\x1b[32mNode.js version ${currentVersion} is compatible (required major version: ${requiredMajor})\x1b[0m`); 