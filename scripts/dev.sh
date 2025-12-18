#!/bin/bash
# Development script - Build and launch itinerary viewer

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Building...${NC}"
npm run build

echo -e "${GREEN}Build complete!${NC}"
echo -e "${BLUE}Launching viewer...${NC}"

# Generate gallery and open in browser
node dist/index.js view-all --open

echo -e "${GREEN}Done!${NC}"
