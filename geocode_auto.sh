#!/bin/bash

# Fully Automated Golf Course Geocoding Script
# Processes all remaining courses without user interaction

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🤖 Fully Automated Golf Course Geocoding${NC}"
echo "==========================================="

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
    export SUPABASE_URL="$EXPO_PUBLIC_SUPABASE_URL"
    export SUPABASE_ANON_KEY="$EXPO_PUBLIC_SUPABASE_ANON_KEY"
    echo -e "${GREEN}✅ Environment variables loaded${NC}"
else
    echo -e "${RED}❌ .env file not found${NC}"
    exit 1
fi

# Verify credentials
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    echo -e "${RED}❌ Missing Supabase credentials${NC}"
    exit 1
fi

# Configuration
BATCH_SIZE=30
MAX_BATCHES=50

echo -e "${BLUE}📊 Configuration:${NC}"
echo "   Batch size: $BATCH_SIZE courses per batch"
echo "   Max batches: $MAX_BATCHES batches"
echo ""

# Get initial status
echo -e "${BLUE}📊 Getting initial status...${NC}"
initial_status=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/geocode-existing-courses" \
    -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
    -H "Content-Type: application/json" \
    -d '{"action": "status"}')

if [ $? -eq 0 ] && [ ! -z "$initial_status" ]; then
    total_courses=$(echo "$initial_status" | jq -r '.totalCourses // 0')
    initial_geocoded=$(echo "$initial_status" | jq -r '.geocodedCourses // 0')
    initial_remaining=$(echo "$initial_status" | jq -r '.ungeocodedCourses // 0')
    
    echo -e "${GREEN}📈 Current Status:${NC}"
    echo "   Total courses: $total_courses"
    echo "   Already geocoded: $initial_geocoded"
    echo "   Remaining: $initial_remaining"
    echo ""
    
    if [ "$initial_remaining" -eq 0 ]; then
        echo -e "${GREEN}🎉 All courses are already geocoded!${NC}"
        exit 0
    fi
    
    # Calculate estimates
    estimated_batches=$(( (initial_remaining + BATCH_SIZE - 1) / BATCH_SIZE ))
    estimated_minutes=$(( estimated_batches * 2 ))  # ~2 minutes per batch
    
    echo -e "${BLUE}⏱️  Estimated time: ~${estimated_minutes} minutes${NC}"
    echo "   (${estimated_batches} batches needed)"
    echo ""
else
    echo -e "${RED}❌ Failed to get status${NC}"
    exit 1
fi

# Start automated processing
echo -e "${GREEN}🚀 Starting automated processing...${NC}"
echo "   Processing $initial_remaining courses in batches of $BATCH_SIZE"
echo "   You can stop anytime with Ctrl+C"
echo ""

start_time=$(date +%s)
batch_count=0
total_processed=0
total_successful=0
total_errors=0

while [ $batch_count -lt $MAX_BATCHES ]; do
    batch_count=$((batch_count + 1))
    
    # Check remaining courses
    current_status=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/geocode-existing-courses" \
        -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
        -H "Content-Type: application/json" \
        -d '{"action": "status"}')
    
    remaining=$(echo "$current_status" | jq -r '.ungeocodedCourses // 0')
    
    if [ "$remaining" -eq 0 ]; then
        echo -e "${GREEN}🎉 All courses have been geocoded!${NC}"
        break
    fi
    
    echo -e "${YELLOW}🔄 Batch $batch_count - Processing next $BATCH_SIZE courses...${NC}"
    echo "   Courses remaining: $remaining"
    
    # Process batch
    result=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/geocode-existing-courses" \
        -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
        -H "Content-Type: application/json" \
        -d "{\"action\": \"geocode_batch\", \"batchSize\": $BATCH_SIZE}")
    
    if [ $? -eq 0 ] && [ ! -z "$result" ]; then
        batch_processed=$(echo "$result" | jq -r '.totalProcessed // 0')
        batch_successful=$(echo "$result" | jq -r '.successfulGeocoding // 0')
        batch_errors=$(echo "$result" | jq -r '.errors // 0')
        
        total_processed=$((total_processed + batch_processed))
        total_successful=$((total_successful + batch_successful))
        total_errors=$((total_errors + batch_errors))
        
        echo -e "   ${GREEN}✅ Processed: $batch_processed${NC}"
        echo -e "   ${GREEN}🎯 Successful: $batch_successful${NC}"
        echo -e "   ${RED}❌ Errors: $batch_errors${NC}"
        
        if [ "$batch_processed" -eq 0 ]; then
            echo -e "${YELLOW}⚠️  No courses processed - stopping${NC}"
            break
        fi
    else
        echo -e "   ${RED}❌ Batch failed${NC}"
        break
    fi
    
    # Show running totals
    current_time=$(date +%s)
    elapsed=$((current_time - start_time))
    elapsed_minutes=$((elapsed / 60))
    
    echo -e "${BLUE}📊 Running totals (${elapsed_minutes}m elapsed):${NC}"
    echo "   Total processed: $total_processed"
    echo "   Total successful: $total_successful" 
    echo "   Total errors: $total_errors"
    echo ""
    
    # Brief pause between batches
    if [ $batch_count -lt $MAX_BATCHES ] && [ "$remaining" -gt "$batch_processed" ]; then
        echo -e "${BLUE}⏱️  Waiting 3 seconds...${NC}"
        sleep 3
    fi
done

# Final results
end_time=$(date +%s)
total_elapsed=$((end_time - start_time))
total_minutes=$((total_elapsed / 60))

echo ""
echo -e "${GREEN}🏁 Automated processing complete!${NC}"
echo "======================================="

# Get final status
final_status=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/geocode-existing-courses" \
    -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
    -H "Content-Type: application/json" \
    -d '{"action": "status"}')

if [ ! -z "$final_status" ]; then
    final_geocoded=$(echo "$final_status" | jq -r '.geocodedCourses // 0')
    final_remaining=$(echo "$final_status" | jq -r '.ungeocodedCourses // 0')
    
    echo -e "${BLUE}📊 Final Results:${NC}"
    echo "   Time elapsed: ${total_minutes} minutes"
    echo "   Batches processed: $batch_count"
    echo "   Courses processed this session: $total_processed"
    echo "   Successful geocoding this session: $total_successful"
    echo "   Errors this session: $total_errors"
    echo ""
    echo "   Total geocoded: $final_geocoded / $total_courses"
    echo "   Remaining: $final_remaining"
    
    if [ "$total_courses" -gt 0 ]; then
        success_rate=$((final_geocoded * 100 / total_courses))
        session_rate=$((total_successful * 100 / total_processed))
        echo "   Overall success rate: ${success_rate}%"
        echo "   This session success rate: ${session_rate}%"
    fi
    
    if [ "$final_remaining" -gt 0 ]; then
        echo ""
        echo -e "${YELLOW}💡 Note: $final_remaining courses still need geocoding.${NC}"
        echo "   You can run this script again to continue."
        echo "   Some courses may not be found in OpenStreetMap."
    else
        echo ""
        echo -e "${GREEN}🎉 All courses have been successfully geocoded!${NC}"
    fi
fi

echo ""
echo -e "${GREEN}✨ Geocoding automation complete!${NC}" 