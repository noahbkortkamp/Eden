#!/bin/bash

# Golf Course Geocoding Script
# This script will automatically process all remaining courses in batches

# Get environment variables
source .env

# Configuration
BATCH_SIZE=25  # Smaller batch size to avoid timeouts
MAX_BATCHES=50  # Maximum number of batches to run
DELAY_BETWEEN_BATCHES=5  # Seconds to wait between batches

echo "🚀 Starting automated golf course geocoding process..."
echo "📊 Batch size: $BATCH_SIZE courses"
echo "⏱️  Delay between batches: $DELAY_BETWEEN_BATCHES seconds"
echo "🔄 Maximum batches: $MAX_BATCHES"
echo ""

# Function to get current status
get_status() {
    curl -s -X POST "${SUPABASE_URL}/functions/v1/geocode-existing-courses" \
        -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
        -H "Content-Type: application/json" \
        -d '{"action": "status"}'
}

# Function to process a single batch
process_batch() {
    local batch_num=$1
    echo "🔄 Processing batch $batch_num..."
    
    local result=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/geocode-existing-courses" \
        -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
        -H "Content-Type: application/json" \
        -d "{\"action\": \"geocode_batch\", \"batchSize\": $BATCH_SIZE}")
    
    # Extract key metrics from the result
    local total_processed=$(echo "$result" | grep -o '"totalProcessed":[^,]*' | cut -d':' -f2)
    local successful=$(echo "$result" | grep -o '"successfulGeocoding":[^,]*' | cut -d':' -f2)
    local errors=$(echo "$result" | grep -o '"errors":[^,]*' | cut -d':' -f2)
    
    echo "   ✅ Processed: $total_processed courses"
    echo "   🎯 Successful: $successful geocoded"
    echo "   ❌ Errors: $errors courses"
    echo ""
    
    return $total_processed
}

# Get initial status
echo "📊 Getting initial status..."
initial_status=$(get_status)
total_courses=$(echo "$initial_status" | grep -o '"totalCourses":[^,]*' | cut -d':' -f2)
initial_ungecoded=$(echo "$initial_status" | grep -o '"ungeocodedCourses":[^,]*' | cut -d':' -f2)
initial_geocoded=$(echo "$initial_status" | grep -o '"geocodedCourses":[^,]*' | cut -d':' -f2)

echo "📈 Initial Status:"
echo "   Total courses: $total_courses"
echo "   Already geocoded: $initial_geocoded"
echo "   Remaining to geocode: $initial_ungecoded"
echo ""

if [ "$initial_ungecoded" -eq 0 ]; then
    echo "🎉 All courses are already geocoded!"
    exit 0
fi

# Process batches
batch_count=0
total_processed_overall=0

while [ $batch_count -lt $MAX_BATCHES ]; do
    batch_count=$((batch_count + 1))
    
    # Check if there are still courses to process
    current_status=$(get_status)
    remaining=$(echo "$current_status" | grep -o '"ungeocodedCourses":[^,]*' | cut -d':' -f2)
    
    if [ "$remaining" -eq 0 ]; then
        echo "🎉 All courses have been geocoded!"
        break
    fi
    
    echo "📊 Courses remaining: $remaining"
    process_batch $batch_count
    batch_processed=$?
    
    if [ $batch_processed -eq 0 ]; then
        echo "⚠️  No courses were processed in this batch. Stopping."
        break
    fi
    
    total_processed_overall=$((total_processed_overall + batch_processed))
    
    # Wait between batches (except for the last iteration)
    if [ $batch_count -lt $MAX_BATCHES ]; then
        echo "⏱️  Waiting $DELAY_BETWEEN_BATCHES seconds before next batch..."
        sleep $DELAY_BETWEEN_BATCHES
    fi
done

# Final status
echo ""
echo "🏁 Geocoding process complete!"
echo "📊 Final Status:"
final_status=$(get_status)
final_geocoded=$(echo "$final_status" | grep -o '"geocodedCourses":[^,]*' | cut -d':' -f2)
final_remaining=$(echo "$final_status" | grep -o '"ungeocodedCourses":[^,]*' | cut -d':' -f2)

echo "   Total batches processed: $batch_count"
echo "   Total courses processed in this session: $total_processed_overall"
echo "   Final geocoded courses: $final_geocoded"
echo "   Final remaining courses: $final_remaining"
echo "   Success rate: $(( (final_geocoded * 100) / total_courses ))%"

if [ "$final_remaining" -gt 0 ]; then
    echo ""
    echo "💡 Note: $final_remaining courses still need geocoding."
    echo "   You can run this script again to continue processing."
    echo "   Some courses may not be found in OpenStreetMap and will need manual review."
fi 