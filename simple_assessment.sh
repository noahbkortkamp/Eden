#!/bin/bash

# Simple Database Assessment Script
# Using the same API approach that works for geocoding

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
    export SUPABASE_URL="$EXPO_PUBLIC_SUPABASE_URL"
    export SUPABASE_ANON_KEY="$EXPO_PUBLIC_SUPABASE_ANON_KEY"
fi

echo "📊 Database Assessment - Phase 1"
echo "================================"

# Use the same status approach that works for geocoding
echo "🔍 Checking staging courses..."
curl -s -X POST "${SUPABASE_URL}/functions/v1/geocode-existing-courses" \
    -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
    -H "Content-Type: application/json" \
    -d '{"action": "status"}' | jq '.'

echo ""
echo "📋 Sample staging course structure:"
curl -s -X GET "${SUPABASE_URL}/rest/v1/courses_staging?select=*&limit=1" \
    -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
    -H "apikey: ${SUPABASE_ANON_KEY}" | jq '.[0] // "No records found"'

echo ""
echo "📋 Production courses structure:"
curl -s -X GET "${SUPABASE_URL}/rest/v1/courses?select=*&limit=1" \
    -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
    -H "apikey: ${SUPABASE_ANON_KEY}" | jq '.[0] // "No records found"'

echo ""
echo "📋 Sample reviews (to check dependencies):"
curl -s -X GET "${SUPABASE_URL}/rest/v1/reviews?select=*&limit=2" \
    -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
    -H "apikey: ${SUPABASE_ANON_KEY}" | jq '. | length as $count | "Found \($count) reviews"' 