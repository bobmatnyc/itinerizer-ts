#!/bin/bash
# Batch import PDFs for testing
# Usage: ./scripts/batch-import.sh [count]

COUNT=${1:-25}
IMPORT_DIR="/Users/masa/Projects/itinerizer-ts/data/imports"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Batch Import: Processing $COUNT PDFs${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Create temp file list
TMPFILE=$(mktemp)
find "$IMPORT_DIR" -maxdepth 1 -name "*.pdf" -type f | head -$COUNT > "$TMPFILE"

TOTAL=$(wc -l < "$TMPFILE" | tr -d ' ')
echo "Found $TOTAL PDF files"
echo ""

SUCCESS=0
FAILED=0
NUM=0

while IFS= read -r PDF; do
    ((NUM++))
    FILENAME=$(basename "$PDF")

    echo -e "${BLUE}[$NUM/$TOTAL]${NC} $FILENAME"

    # Run import and capture output
    OUTPUT=$(node dist/index.js import file "$PDF" 2>&1)

    if echo "$OUTPUT" | grep -q "Itinerary parsed successfully"; then
        # Extract segment count
        SEGS=$(echo "$OUTPUT" | grep -oE "[0-9]+ segments?" | head -1 || echo "? segments")
        echo -e "${GREEN}  ✓ Imported ($SEGS)${NC}"
        ((SUCCESS++))
    else
        ERROR=$(echo "$OUTPUT" | grep -iE "(error|failed|rate)" | head -1 || echo "Unknown error")
        echo -e "${RED}  ✗ Failed: $ERROR${NC}"
        ((FAILED++))

        # If rate limited, wait longer
        if echo "$OUTPUT" | grep -qi "rate"; then
            echo "  Waiting 30s for rate limit..."
            sleep 30
        fi
    fi

    # Delay between imports
    sleep 2

done < "$TMPFILE"

rm -f "$TMPFILE"

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Import Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Success: $SUCCESS${NC}"
echo -e "${RED}Failed:  $FAILED${NC}"
echo -e "Total:   $TOTAL"
echo ""

# Show final itinerary list
echo -e "${BLUE}All Itineraries:${NC}"
node dist/index.js itinerary list 2>&1
