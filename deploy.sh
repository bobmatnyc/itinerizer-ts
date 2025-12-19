#!/bin/bash
set -e

# Vercel Deployment Script for itinerizer-ts
# This script deploys the SvelteKit viewer-svelte app from the project root

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "======================================"
echo "Vercel Deployment for itinerizer-ts"
echo "======================================"
echo ""

# Check if we're in the right directory
if [ ! -d "viewer-svelte" ]; then
  echo "ERROR: viewer-svelte directory not found!"
  echo "This script must be run from the project root."
  exit 1
fi

# Check if vercel.json exists
if [ ! -f "vercel.json" ]; then
  echo "ERROR: vercel.json not found!"
  exit 1
fi

echo "Project structure verified ✓"
echo ""

# Parse deployment type
DEPLOY_TYPE="preview"
if [ "$1" == "--prod" ] || [ "$1" == "-p" ]; then
  DEPLOY_TYPE="production"
fi

echo "Deployment Type: $DEPLOY_TYPE"
echo ""

# Show current configuration
echo "Current Configuration:"
echo "----------------------"
cat vercel.json
echo ""
echo "----------------------"
echo ""

# Confirm deployment
if [ "$DEPLOY_TYPE" == "production" ]; then
  read -p "Deploy to PRODUCTION? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
  fi
fi

# Execute deployment
echo "Deploying..."
echo ""

if [ "$DEPLOY_TYPE" == "production" ]; then
  vercel --prod
else
  vercel
fi

echo ""
echo "======================================"
echo "Deployment Complete!"
echo "======================================"
