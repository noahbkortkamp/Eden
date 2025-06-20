#!/bin/bash

# Simple Golf Course Geocoding Script
# Quick way to process courses or check status

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
    export SUPABASE_URL="$EXPO_PUBLIC_SUPABASE_URL"
    export SUPABASE_ANON_KEY="$EXPO_PUBLIC_SUPABASE_ANON_KEY"
fi

# Check if we have the required variables
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    echo "❌ Missing Supabase credentials in .env file"
    exit 1
fi

# Default action is status
ACTION=${1:-status}
BATCH_SIZE=${2:-30}

case $ACTION in
    "status")
        echo "📊 Checking current geocoding status..."
        curl -s -X POST "${SUPABASE_URL}/functions/v1/geocode-existing-courses" \
            -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
            -H "Content-Type: application/json" \
            -d '{"action": "status"}' | jq '.'
        ;;
    "batch")
        echo "🔄 Processing one batch of $BATCH_SIZE courses..."
        curl -s -X POST "${SUPABASE_URL}/functions/v1/geocode-existing-courses" \
            -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
            -H "Content-Type: application/json" \
            -d "{\"action\": \"geocode_batch\", \"batchSize\": $BATCH_SIZE}" | jq '.'
        ;;
    "auto")
        echo "🤖 Starting automated processing..."
        curl -s -X POST "${SUPABASE_URL}/functions/v1/geocode-existing-courses" \
            -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
            -H "Content-Type: application/json" \
            -d "{\"action\": \"auto_geocode_all\", \"batchSize\": $BATCH_SIZE, \"maxBatches\": 50}" | jq '.'
        ;;
    *)
        echo "Usage: $0 [status|batch|auto] [batch_size]"
        echo ""
        echo "Examples:"
        echo "  $0                    # Check status"
        echo "  $0 status            # Check status"
        echo "  $0 batch 25          # Process one batch of 25 courses"
        echo "  $0 auto 30           # Auto-process all remaining with batches of 30"
        exit 1
        ;;
esac 