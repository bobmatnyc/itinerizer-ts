#!/bin/bash
# Quick test of the eval script with minimal configuration

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Run evaluation for trip-designer only with just the two models
npm run eval -- --agent trip-designer --no-judge

echo ""
echo "Test complete! Check tests/eval/results/ for output."
