#!/bin/bash
# Start development server with environment variables
cd /Users/masa/Projects/itinerizer-ts/viewer-svelte
set -a
source .env 2>/dev/null || true
source .env.local 2>/dev/null || true
set +a
exec npm run dev
