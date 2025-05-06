#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Checking development environment...${NC}"

# Check Node.js version against .nvmrc
if [ -f .nvmrc ]; then
  REQUIRED_NODE_VERSION=$(cat .nvmrc)
  CURRENT_NODE_VERSION=$(node -v)
  
  echo -e "Required Node.js: ${GREEN}${REQUIRED_NODE_VERSION}${NC}"
  echo -e "Current Node.js:  ${GREEN}${CURRENT_NODE_VERSION}${NC}"
  
  # Extract major version and check that instead of exact match
  REQUIRED_MAJOR=$(echo "${REQUIRED_NODE_VERSION}" | cut -d. -f1)
  CURRENT_MAJOR=$(echo "${CURRENT_NODE_VERSION}" | sed 's/^v//' | cut -d. -f1)
  
  if [[ "${CURRENT_MAJOR}" != "${REQUIRED_MAJOR}" ]]; then
    echo -e "${RED}Node.js major version mismatch!${NC}"
    echo -e "Required: ${REQUIRED_MAJOR}.x, Current: ${CURRENT_MAJOR}.x"
    echo -e "Run: ${YELLOW}nvm use${NC}"
    exit 1
  else
    echo -e "${GREEN}Node.js version ${CURRENT_NODE_VERSION} is compatible with required ${REQUIRED_NODE_VERSION}${NC}"
  fi
fi

echo -e "${GREEN}Environment check passed!${NC}" 