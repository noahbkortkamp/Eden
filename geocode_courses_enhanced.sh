#!/bin/bash

# Enhanced Golf Course Geocoding Script
# Automatically processes all remaining courses using OpenStreetMap

# Colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Enhanced Golf Course Geocoding Script${NC}"
echo "=========================================="

# Load environment variables from .env file
if [ -f .env ]; then
    # Export variables for this script, handling both EXPO_PUBLIC_ prefixed and non-prefixed
    export $(grep -v '^#' .env | xargs)
    
    # Map EXPO_PUBLIC_ variables to the expected names
    if [ ! -z "$EXPO_PUBLIC_SUPABASE_URL" ]; then
        export SUPABASE_URL="$EXPO_PUBLIC_SUPABASE_URL"
    fi
    if [ ! -z "$EXPO_PUBLIC_SUPABASE_ANON_KEY" ]; then
        export SUPABASE_ANON_KEY="$EXPO_PUBLIC_SUPABASE_ANON_KEY"
    fi
    
    echo -e "${GREEN}✅ Environment variables loaded${NC}"
else
    echo -e "${RED}❌ .env file not found${NC}"
    exit 1
fi

# Verify required variables
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    echo -e "${RED}❌ Missing required environment variables${NC}"
    echo "Required: SUPABASE_URL, SUPABASE_ANON_KEY"
    exit 1
fi

# Configuration
BATCH_SIZE=25  # Courses per batch (adjusted for stability)
MAX_BATCHES=60  # Increased to handle more courses
DELAY_BETWEEN_BATCHES=3  # Seconds between batches
API_DELAY=1000  # Milliseconds between API calls (handled by Edge Function)

echo -e "${BLUE}📊 Configuration:${NC}"
echo "   Batch size: $BATCH_SIZE courses"
echo "   Max batches: $MAX_BATCHES"
echo "   Delay between batches: ${DELAY_BETWEEN_BATCHES}s"
echo ""

# Function to get current status
get_status() {
    curl -s -X POST "${SUPABASE_URL}/functions/v1/geocode-existing-courses" \
        -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
        -H "Content-Type: application/json" \
        -d '{"action": "status"}' 2>/dev/null
}

# Function to process a single batch
process_batch() {
    local batch_num=$1
    echo -e "${YELLOW}🔄 Processing batch $batch_num...${NC}"
    
    local result=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/geocode-existing-courses" \
        -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
        -H "Content-Type: application/json" \
        -d "{\"action\": \"geocode_batch\", \"batchSize\": $BATCH_SIZE}" 2>/dev/null)
    
    if [ $? -eq 0 ] && [ ! -z "$result" ]; then
        # Extract metrics using jq
        local total_processed=$(echo "$result" | jq -r '.totalProcessed // 0' 2>/dev/null)
        local successful=$(echo "$result" | jq -r '.successfulGeocoding // 0' 2>/dev/null)
        local errors=$(echo "$result" | jq -r '.errors // 0' 2>/dev/null)
        
        echo -e "   ${GREEN}✅ Processed: $total_processed courses${NC}"
        echo -e "   ${GREEN}🎯 Successful: $successful geocoded${NC}"
        echo -e "   ${RED}❌ Errors: $errors courses${NC}"
        echo ""
        
        echo "$total_processed"
    else
        echo -e "   ${RED}❌ API call failed${NC}"
        echo "0"
    fi
}

# Function to use the automated full processing
process_all_automated() {
    echo -e "${BLUE}🤖 Starting automated full processing...${NC}"
    
    local result=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/geocode-existing-courses" \
        -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
        -H "Content-Type: application/json" \
        -d "{\"action\": \"auto_geocode_all\", \"batchSize\": $BATCH_SIZE, \"maxBatches\": $MAX_BATCHES}" 2>/dev/null)
    
    if [ $? -eq 0 ] && [ ! -z "$result" ]; then
        echo -e "${GREEN}✅ Automated processing completed!${NC}"
        echo ""
        echo -e "${BLUE}📊 Results Summary:${NC}"
        
        # Parse and display results
        local batches_processed=$(echo "$result" | jq -r '.batchesProcessed // 0' 2>/dev/null)
        local total_processed=$(echo "$result" | jq -r '.totalProcessed // 0' 2>/dev/null)
        local total_successful=$(echo "$result" | jq -r '.totalSuccessful // 0' 2>/dev/null)
        local total_errors=$(echo "$result" | jq -r '.totalErrors // 0' 2>/dev/null)
        
        echo "   Batches processed: $batches_processed"
        echo "   Total courses processed: $total_processed"
        echo "   Successfully geocoded: $total_successful"
        echo "   Errors encountered: $total_errors"
        
        # Final status
        if [ ! -z "$(echo "$result" | jq -r '.finalStatus' 2>/dev/null)" ]; then
            local final_total=$(echo "$result" | jq -r '.finalStatus.totalCourses // 0' 2>/dev/null)
            local final_geocoded=$(echo "$result" | jq -r '.finalStatus.geocoded // 0' 2>/dev/null)
            local final_remaining=$(echo "$result" | jq -r '.finalStatus.remaining // 0' 2>/dev/null)
            
            echo ""
            echo -e "${BLUE}📈 Final Status:${NC}"
            echo "   Total courses: $final_total"
            echo "   Geocoded: $final_geocoded"
            echo "   Remaining: $final_remaining"
            
            if [ "$final_remaining" -gt 0 ]; then
                local success_rate=$((final_geocoded * 100 / final_total))
                echo "   Success rate: ${success_rate}%"
                echo ""
                echo -e "${YELLOW}💡 Note: $final_remaining courses still need geocoding.${NC}"
                echo "   Some courses may not be found in OpenStreetMap."
                echo "   You can run this script again to continue processing."
            else
                echo -e "${GREEN}🎉 All courses have been geocoded!${NC}"
            fi
        fi
        
        return 0
    else
        echo -e "${RED}❌ Automated processing failed${NC}"
        return 1
    fi
}

# Get initial status
echo -e "${BLUE}📊 Getting current status...${NC}"
initial_status=$(get_status)

if [ $? -eq 0 ] && [ ! -z "$initial_status" ]; then
    total_courses=$(echo "$initial_status" | jq -r '.totalCourses // 0' 2>/dev/null)
    initial_geocoded=$(echo "$initial_status" | jq -r '.geocodedCourses // 0' 2>/dev/null)
    initial_remaining=$(echo "$initial_status" | jq -r '.ungeocodedCourses // 0' 2>/dev/null)
    
    echo -e "${GREEN}📈 Current Status:${NC}"
    echo "   Total courses: $total_courses"
    echo "   Already geocoded: $initial_geocoded"
    echo "   Remaining to geocode: $initial_remaining"
    echo ""
    
    if [ "$initial_remaining" -eq 0 ]; then
        echo -e "${GREEN}🎉 All courses are already geocoded!${NC}"
        exit 0
    fi
    
    # Calculate estimated time
    estimated_batches=$(( (initial_remaining + BATCH_SIZE - 1) / BATCH_SIZE ))
    estimated_minutes=$(( estimated_batches * (BATCH_SIZE + DELAY_BETWEEN_BATCHES) / 60 ))
    
    echo -e "${BLUE}⏱️  Estimated processing time: ~${estimated_minutes} minutes${NC}"
    echo "   (${estimated_batches} batches at ${BATCH_SIZE} courses per batch)"
    echo ""
    
    # Ask user for processing preference
    echo -e "${YELLOW}Choose processing method:${NC}"
    echo "1) Automated full processing (recommended)"
    echo "2) Manual batch-by-batch processing"
    echo "3) Just show status and exit"
    read -p "Enter choice (1-3): " choice
    
    case $choice in
        1)
            process_all_automated
            ;;
        2)
            # Manual batch processing (original logic)
            batch_count=0
            total_processed_overall=0
            
            while [ $batch_count -lt $MAX_BATCHES ]; do
                batch_count=$((batch_count + 1))
                
                # Check remaining courses
                current_status=$(get_status)
                remaining=$(echo "$current_status" | jq -r '.ungeocodedCourses // 0' 2>/dev/null)
                
                if [ "$remaining" -eq 0 ]; then
                    echo -e "${GREEN}🎉 All courses have been geocoded!${NC}"
                    break
                fi
                
                echo -e "${BLUE}📊 Courses remaining: $remaining${NC}"
                batch_processed=$(process_batch $batch_count)
                
                if [ "$batch_processed" -eq 0 ]; then
                    echo -e "${YELLOW}⚠️  No courses were processed in this batch. Stopping.${NC}"
                    break
                fi
                
                total_processed_overall=$((total_processed_overall + batch_processed))
                
                # Wait between batches
                if [ $batch_count -lt $MAX_BATCHES ] && [ "$remaining" -gt "$batch_processed" ]; then
                    echo -e "${BLUE}⏱️  Waiting $DELAY_BETWEEN_BATCHES seconds before next batch...${NC}"
                    sleep $DELAY_BETWEEN_BATCHES
                fi
            done
            
            # Final status for manual processing
            echo ""
            echo -e "${GREEN}🏁 Manual processing complete!${NC}"
            final_status=$(get_status)
            if [ ! -z "$final_status" ]; then
                final_geocoded=$(echo "$final_status" | jq -r '.geocodedCourses // 0' 2>/dev/null)
                final_remaining=$(echo "$final_status" | jq -r '.ungeocodedCourses // 0' 2>/dev/null)
                
                echo -e "${BLUE}📊 Final Status:${NC}"
                echo "   Batches processed: $batch_count"
                echo "   Courses processed this session: $total_processed_overall"
                echo "   Total geocoded: $final_geocoded"
                echo "   Remaining: $final_remaining"
                
                if [ "$total_courses" -gt 0 ]; then
                    success_rate=$((final_geocoded * 100 / total_courses))
                    echo "   Overall success rate: ${success_rate}%"
                fi
            fi
            ;;
        3)
            echo -e "${BLUE}📊 Status check complete. Exiting.${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Invalid choice. Exiting.${NC}"
            exit 1
            ;;
    esac
    
else
    echo -e "${RED}❌ Failed to get initial status from Supabase${NC}"
    echo "Please check your Supabase URL and API key in .env"
    exit 1
fi

echo ""
echo -e "${GREEN}✨ Geocoding script completed!${NC}" 