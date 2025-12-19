#!/bin/bash

# Test script for SSE streaming endpoint
# Usage: ./test-streaming.sh <session_id>

SESSION_ID=${1:-"test-session-123"}
API_URL="http://localhost:3000"

echo "Testing SSE streaming endpoint..."
echo "Session ID: $SESSION_ID"
echo ""

# First, create a session (you may need to replace with actual itinerary ID)
echo "Step 1: Creating a chat session..."
SESSION_RESPONSE=$(curl -s -X POST "${API_URL}/api/chat/sessions" \
  -H "Content-Type: application/json" \
  -d '{"itineraryId": "test-itinerary-id"}')

echo "Session created: $SESSION_RESPONSE"
CREATED_SESSION_ID=$(echo "$SESSION_RESPONSE" | grep -o '"sessionId":"[^"]*"' | cut -d'"' -f4)

if [ -z "$CREATED_SESSION_ID" ]; then
  echo "Failed to create session. Using provided session ID: $SESSION_ID"
  CREATED_SESSION_ID=$SESSION_ID
else
  echo "Using session ID: $CREATED_SESSION_ID"
fi

echo ""
echo "Step 2: Sending message with streaming..."
echo "---"

# Send a message with streaming
curl -N -X POST "${API_URL}/api/chat/sessions/${CREATED_SESSION_ID}/messages/stream" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello! I want to plan a trip to Tokyo for 5 days."}' 2>&1

echo ""
echo "---"
echo "Stream complete"
