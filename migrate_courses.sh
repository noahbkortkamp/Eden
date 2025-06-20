#!/bin/bash

# Course Migration Script - Phase 4
# Migrates courses from staging to production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

echo -e "${BLUE}📦 Course Migration - Phase 4${NC}"
echo "================================"

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo -e "${GREEN}✅ Environment variables loaded${NC}"
else
    echo -e "${RED}❌ .env file not found${NC}"
    exit 1
fi

# Check required environment variables
if [ -z "$EXPO_PUBLIC_SUPABASE_URL" ] || [ -z "$EXPO_PUBLIC_SUPABASE_ANON_KEY" ]; then
    echo -e "${RED}❌ Required environment variables not set${NC}"
    echo "Please ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set in .env"
    exit 1
fi

SUPABASE_URL="$EXPO_PUBLIC_SUPABASE_URL"
SUPABASE_KEY="$EXPO_PUBLIC_SUPABASE_ANON_KEY"
FUNCTION_URL="${SUPABASE_URL}/functions/v1/migrate-courses"

# Function to check migration status
check_status() {
    echo -e "\n${CYAN}🔍 Pre-Migration Status Check${NC}"
    echo "=============================="
    echo -e "${BLUE}📊 Checking staging and production status...${NC}"
    
    RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
        -H "Authorization: Bearer $SUPABASE_KEY" \
        -H "Content-Type: application/json" \
        -d '{"action": "status"}')
    
    echo "$RESPONSE" | python3 -m json.tool
    
    # Parse the response for summary
    STAGING_TOTAL=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['staging']['totalCourses'])" 2>/dev/null || echo "0")
    STAGING_GEOCODED=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['staging']['geocoded'])" 2>/dev/null || echo "0")
    STAGING_NON_GEOCODED=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['staging']['nonGeocoded'])" 2>/dev/null || echo "0")
    
    PRODUCTION_TOTAL=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['production']['totalCourses'])" 2>/dev/null || echo "0")
    PRODUCTION_GEOCODED=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['production']['geocoded'])" 2>/dev/null || echo "0")
    
    READY_TO_MIGRATE=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['readyToMigrate'])" 2>/dev/null || echo "false")
    
    echo -e "\n${WHITE}📈 Migration Summary:${NC}"
    echo -e "  Staging courses: ${YELLOW}$STAGING_TOTAL${NC}"
    echo -e "    - Geocoded: ${GREEN}$STAGING_GEOCODED${NC}"
    echo -e "    - Non-geocoded: ${YELLOW}$STAGING_NON_GEOCODED${NC}"
    echo ""
    echo -e "  Production courses: ${YELLOW}$PRODUCTION_TOTAL${NC}"
    echo -e "    - Geocoded: ${GREEN}$PRODUCTION_GEOCODED${NC}"
    echo ""
    
    if [ "$READY_TO_MIGRATE" = "true" ]; then
        echo -e "${GREEN}✅ Ready to migrate!${NC}"
    else
        echo -e "${YELLOW}⚠️  Production database not empty${NC}"
        echo -e "${WHITE}   Migration can still proceed, but will add to existing data${NC}"
    fi
}

# Function to migrate all courses
migrate_all() {
    echo -e "\n${PURPLE}📋 Migration Plan${NC}"
    echo "================"
    echo -e "${WHITE}What will happen:${NC}"
    echo -e "  1. Copy all $STAGING_TOTAL courses from staging to production"
    echo -e "  2. Preserve $STAGING_GEOCODED geocoded courses (lat/lng data)"
    echo -e "  3. Map staging fields → production fields:"
    echo -e "     • town, state, country → new production columns"
    echo -e "     • location field = 'town, state' (combined)"
    echo -e "     • par, yardage, price_level → NULL"
    echo -e "     • average_rating = 0.0, total_ratings = 0"
    echo -e "  4. Process in batches of 100 courses"
    echo ""
    echo -e "${YELLOW}⚠️  Ready to start migration?${NC}"
    echo -e "  This will migrate $STAGING_TOTAL courses to production"
    echo -e "  Estimated time: ~2-3 minutes"
    echo ""
    
    if [ -z "$1" ]; then
        read -p "Type 'CONFIRM_MIGRATE_ALL_COURSES' to proceed: " CONFIRMATION
    else
        CONFIRMATION="$1"
        echo -e "Type 'CONFIRM_MIGRATE_ALL_COURSES' to proceed: ${GREEN}$CONFIRMATION${NC}"
    fi
    
    if [ "$CONFIRMATION" != "CONFIRM_MIGRATE_ALL_COURSES" ]; then
        echo -e "${RED}❌ Migration cancelled${NC}"
        exit 1
    fi
    
    echo -e "\n${GREEN}🚀 Starting course migration...${NC}"
    echo "=============================="
    
    START_TIME=$(date +%s)
    
    RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
        -H "Authorization: Bearer $SUPABASE_KEY" \
        -H "Content-Type: application/json" \
        -d '{"action": "migrate_all", "confirmationToken": "CONFIRM_MIGRATE_ALL_COURSES"}')
    
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    echo -e "${GREEN}✅ Migration completed!${NC}"
    echo ""
    echo -e "${CYAN}📊 Migration Results:${NC}"
    echo "$RESPONSE" | python3 -m json.tool
    
    # Parse results for summary
    TOTAL_PROCESSED=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['results']['totalCourses'])" 2>/dev/null || echo "0")
    BATCHES_PROCESSED=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['results']['batchesProcessed'])" 2>/dev/null || echo "0")
    SUCCESSFUL_INSERTS=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['results']['successfulInserts'])" 2>/dev/null || echo "0")
    ERROR_COUNT=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data['results']['errors']))" 2>/dev/null || echo "0")
    
    FINAL_TOTAL=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['verification']['finalCourseCount'])" 2>/dev/null || echo "0")
    FINAL_GEOCODED=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['verification']['finalGeocodedCount'])" 2>/dev/null || echo "0")
    FINAL_NON_GEOCODED=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['verification']['finalNonGeocodedCount'])" 2>/dev/null || echo "0")
    
    echo -e "\n${WHITE}🎉 Migration Summary${NC}"
    echo "==================="
    echo -e "  Time elapsed: ${CYAN}$DURATION seconds${NC}"
    echo -e "  Batches processed: ${YELLOW}$BATCHES_PROCESSED${NC}"
    echo -e "  Courses processed: ${YELLOW}$TOTAL_PROCESSED${NC}"
    echo -e "  Successful inserts: ${GREEN}$SUCCESSFUL_INSERTS${NC}"
    echo -e "  Errors: ${RED}$ERROR_COUNT${NC}"
    echo ""
    echo -e "${PURPLE}📈 Final Production Database:${NC}"
    echo -e "  Total courses: ${YELLOW}$FINAL_TOTAL${NC}"
    echo -e "  Geocoded courses: ${GREEN}$FINAL_GEOCODED${NC}"
    echo -e "  Non-geocoded courses: ${YELLOW}$FINAL_NON_GEOCODED${NC}"
    
    if [ "$ERROR_COUNT" -eq 0 ]; then
        echo -e "\n${GREEN}🎉 Perfect migration! All courses successfully migrated.${NC}"
        
        echo -e "\n${CYAN}🚀 Next Steps:${NC}"
        echo -e "  ${GREEN}✅${NC} Production database ready with $FINAL_TOTAL courses"
        echo -e "  ${GREEN}✅${NC} $FINAL_GEOCODED courses have precise location data"
        echo -e "  🔄 Continue geocoding the remaining $FINAL_NON_GEOCODED courses"
        echo -e "  📱 Test app functionality with new course data"
    else
        echo -e "\n${YELLOW}⚠️  Migration completed with some issues:${NC}"
        echo -e "  - $ERROR_COUNT batches had errors"
        echo -e "  - Check the detailed results above"
    fi
    
    echo -e "\n${WHITE}✨ Phase 4 Migration Complete!${NC}"
}

# Function to migrate remaining courses (1001-1353)
migrate_remaining() {
    echo -e "\n${PURPLE}📋 REMAINING Courses Migration Plan${NC}"
    echo "==================================="
    echo -e "${WHITE}What will happen:${NC}"
    echo -e "  1. Copy remaining courses from staging (1001-1353)"
    echo -e "  2. This will add the missing ~353 courses"
    echo -e "  3. Preserve any additional geocoded courses"
    echo -e "  4. Process in batches of 100 courses"
    echo ""
    echo -e "${YELLOW}⚠️  Ready to migrate REMAINING courses?${NC}"
    echo -e "  This will add the missing courses to production"
    echo -e "  Estimated time: ~1-2 minutes"
    echo ""
    
    if [ -z "$1" ]; then
        read -p "Type 'CONFIRM_MIGRATE_REMAINING_COURSES' to proceed: " CONFIRMATION
    else
        CONFIRMATION="$1"
        echo -e "Type 'CONFIRM_MIGRATE_REMAINING_COURSES' to proceed: ${GREEN}$CONFIRMATION${NC}"
    fi
    
    if [ "$CONFIRMATION" != "CONFIRM_MIGRATE_REMAINING_COURSES" ]; then
        echo -e "${RED}❌ Migration cancelled${NC}"
        exit 1
    fi
    
    echo -e "\n${GREEN}🚀 Starting REMAINING course migration...${NC}"
    echo "========================================"
    
    START_TIME=$(date +%s)
    
    RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
        -H "Authorization: Bearer $SUPABASE_KEY" \
        -H "Content-Type: application/json" \
        -d '{"action": "migrate_remaining", "confirmationToken": "CONFIRM_MIGRATE_REMAINING_COURSES"}')
    
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    echo -e "${GREEN}✅ REMAINING migration completed!${NC}"
    echo ""
    echo -e "${CYAN}📊 Migration Results:${NC}"
    echo "$RESPONSE" | python3 -m json.tool
    
    # Parse results for summary
    TOTAL_PROCESSED=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['results']['totalCourses'])" 2>/dev/null || echo "0")
    BATCHES_PROCESSED=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['results']['batchesProcessed'])" 2>/dev/null || echo "0")
    SUCCESSFUL_INSERTS=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['results']['successfulInserts'])" 2>/dev/null || echo "0")
    ERROR_COUNT=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(len(data['results']['errors']))" 2>/dev/null || echo "0")
    
    FINAL_TOTAL=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['verification']['finalCourseCount'])" 2>/dev/null || echo "0")
    FINAL_GEOCODED=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['verification']['finalGeocodedCount'])" 2>/dev/null || echo "0")
    FINAL_NON_GEOCODED=$(echo "$RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['verification']['finalNonGeocodedCount'])" 2>/dev/null || echo "0")
    
    echo -e "\n${WHITE}🎉 REMAINING Migration Summary${NC}"
    echo "=============================="
    echo -e "  Time elapsed: ${CYAN}$DURATION seconds${NC}"
    echo -e "  Batches processed: ${YELLOW}$BATCHES_PROCESSED${NC}"
    echo -e "  Courses processed: ${YELLOW}$TOTAL_PROCESSED${NC}"
    echo -e "  Successful inserts: ${GREEN}$SUCCESSFUL_INSERTS${NC}"
    echo -e "  Errors: ${RED}$ERROR_COUNT${NC}"
    echo ""
    echo -e "${PURPLE}📈 Final Production Database:${NC}"
    echo -e "  Total courses: ${YELLOW}$FINAL_TOTAL${NC}"
    echo -e "  Geocoded courses: ${GREEN}$FINAL_GEOCODED${NC}"
    echo -e "  Non-geocoded courses: ${YELLOW}$FINAL_NON_GEOCODED${NC}"
    
    if [ "$ERROR_COUNT" -eq 0 ]; then
        echo -e "\n${GREEN}🎉 Perfect! All remaining courses successfully migrated.${NC}"
        
        echo -e "\n${CYAN}🚀 Next Steps:${NC}"
        echo -e "  ${GREEN}✅${NC} Production database now has ALL $FINAL_TOTAL courses!"
        echo -e "  ${GREEN}✅${NC} $FINAL_GEOCODED courses have precise location data"
        echo -e "  🔄 Continue geocoding the remaining $FINAL_NON_GEOCODED courses"
        echo -e "  📱 Test app functionality with complete course data"
    else
        echo -e "\n${YELLOW}⚠️  Migration completed with some issues:${NC}"
        echo -e "  - $ERROR_COUNT batches had errors"
        echo -e "  - Check the detailed results above"
    fi
    
    echo -e "\n${WHITE}✨ REMAINING Courses Migration Complete!${NC}"
}

# Main script logic
case "${1:-status}" in
    "status")
        check_status
        ;;
    "migrate")
        check_status
        migrate_all "$2"
        ;;
    "remaining")
        check_status
        migrate_remaining "$2"
        ;;
    *)
        echo -e "${RED}❌ Unknown action: $1${NC}"
        echo -e "${WHITE}Usage:${NC}"
        echo "  $0 status                    # Check current status"
        echo "  $0 migrate [CONFIRMATION]    # Migrate all courses (first 1000)"
        echo "  $0 remaining [CONFIRMATION]  # Migrate remaining courses (1001-1353)"
        echo ""
        echo -e "${WHITE}Examples:${NC}"
        echo "  $0 status"
        echo "  $0 migrate"
        echo "  $0 migrate CONFIRM_MIGRATE_ALL_COURSES"
        echo "  $0 remaining"
        echo "  $0 remaining CONFIRM_MIGRATE_REMAINING_COURSES"
        exit 1
        ;;
esac 