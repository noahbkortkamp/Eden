#!/bin/bash

# Database Cleanup via Edge Function
# Uses service role to bypass RLS

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Load environment variables
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
    export SUPABASE_URL="$EXPO_PUBLIC_SUPABASE_URL"
    export SUPABASE_ANON_KEY="$EXPO_PUBLIC_SUPABASE_ANON_KEY"
fi

echo -e "${BLUE}🗑️  Database Cleanup via Edge Function${NC}"
echo "======================================"

# Check current status
echo -e "${YELLOW}📊 Checking current database status...${NC}"
status_result=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/cleanup-database" \
    -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
    -H "Content-Type: application/json" \
    -d '{"action": "status"}' 2>/dev/null)

if [ $? -eq 0 ] && [ ! -z "$status_result" ]; then
    echo "$status_result" | jq '.'
    
    courses=$(echo "$status_result" | jq -r '.currentCourses // 0')
    reviews=$(echo "$status_result" | jq -r '.currentReviews // 0')
    review_tags=$(echo "$status_result" | jq -r '.currentReviewTags // 0')
    saved_courses=$(echo "$status_result" | jq -r '.currentSavedCourses // 0')
    
    echo ""
    echo -e "${GREEN}Current State:${NC}"
    echo "  Courses: $courses"
    echo "  Reviews: $reviews"
    echo "  Review Tags: $review_tags"
    echo "  Saved Courses: $saved_courses"
    echo ""
    
    if [ "$courses" -eq 0 ] && [ "$reviews" -eq 0 ] && [ "$review_tags" -eq 0 ] && [ "$saved_courses" -eq 0 ]; then
        echo -e "${GREEN}✅ Database is already clean!${NC}"
        exit 0
    fi
else
    echo -e "${RED}❌ Failed to get database status${NC}"
    exit 1
fi

# Confirm cleanup
echo -e "${RED}⚠️  WARNING: This will delete ALL production data!${NC}"
echo "  - All $review_tags review tags will be deleted"
echo "  - All $reviews reviews will be deleted"
echo "  - All $saved_courses saved courses will be deleted"
echo "  - All $courses courses will be deleted"
echo ""
read -p "Are you sure? Type 'CONFIRM_DELETE_ALL_DATA' to proceed: " confirmation

if [ "$confirmation" != "CONFIRM_DELETE_ALL_DATA" ]; then
    echo -e "${YELLOW}❌ Operation cancelled${NC}"
    exit 0
fi

# Execute cleanup
echo ""
echo -e "${RED}🚨 Starting database cleanup...${NC}"
cleanup_result=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/cleanup-database" \
    -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
    -H "Content-Type: application/json" \
    -d '{"action": "cleanup_all", "confirmationToken": "CONFIRM_DELETE_ALL_DATA"}' 2>/dev/null)

if [ $? -eq 0 ] && [ ! -z "$cleanup_result" ]; then
    echo -e "${GREEN}✅ Cleanup completed!${NC}"
    echo ""
    echo -e "${BLUE}Results:${NC}"
    echo "$cleanup_result" | jq '.'
    
    # Check final verification
    remaining_courses=$(echo "$cleanup_result" | jq -r '.verification.remainingCourses // 0')
    remaining_reviews=$(echo "$cleanup_result" | jq -r '.verification.remainingReviews // 0')
    remaining_review_tags=$(echo "$cleanup_result" | jq -r '.verification.remainingReviewTags // 0')
    remaining_saved_courses=$(echo "$cleanup_result" | jq -r '.verification.remainingSavedCourses // 0')
    
    echo ""
    if [ "$remaining_courses" -eq 0 ] && [ "$remaining_reviews" -eq 0 ] && [ "$remaining_review_tags" -eq 0 ] && [ "$remaining_saved_courses" -eq 0 ]; then
        echo -e "${GREEN}🎉 Database successfully cleaned!${NC}"
        echo "Ready for Phase 4: Data Migration"
    else
        echo -e "${YELLOW}⚠️  Partial cleanup: $remaining_courses courses, $remaining_reviews reviews, $remaining_review_tags review_tags, $remaining_saved_courses saved_courses remaining${NC}"
    fi
else
    echo -e "${RED}❌ Cleanup failed${NC}"
    echo "Response: $cleanup_result"
    exit 1
fi 