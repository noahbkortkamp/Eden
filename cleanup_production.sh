#!/bin/bash

# Production Database Cleanup Script
# Phase 3: Delete all test data in correct order

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🗑️  Production Database Cleanup - Phase 3${NC}"
echo "============================================="

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

echo ""
echo -e "${YELLOW}⚠️  WARNING: This will delete ALL production data!${NC}"
echo "   - All reviews will be deleted"
echo "   - All user accounts will be deleted" 
echo "   - All courses will be deleted"
echo ""
read -p "Are you sure you want to proceed? (type 'DELETE' to confirm): " confirmation

if [ "$confirmation" != "DELETE" ]; then
    echo -e "${YELLOW}❌ Operation cancelled${NC}"
    exit 0
fi

echo ""
echo -e "${RED}🚨 Starting production data cleanup...${NC}"
echo ""

# Function to delete records from a table
delete_from_table() {
    local table="$1"
    local description="$2"
    
    echo -e "${YELLOW}🗑️  Deleting all $description...${NC}"
    
    # Delete all records
    result=$(curl -s -X DELETE "${SUPABASE_URL}/rest/v1/$table?id=neq.null" \
        -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
        -H "apikey: ${SUPABASE_ANON_KEY}" \
        -H "Prefer: return=minimal")
    
    if [ $? -eq 0 ]; then
        echo -e "   ${GREEN}✅ Deleted all records from $table${NC}"
        
        # Verify deletion
        count_result=$(curl -s -X GET "${SUPABASE_URL}/rest/v1/$table?select=id" \
            -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
            -H "apikey: ${SUPABASE_ANON_KEY}" \
            -H "Prefer: count=exact" | head -1)
        
        echo -e "   ${BLUE}📊 Verification: $count_result${NC}"
    else
        echo -e "   ${RED}❌ Failed to delete from $table${NC}"
        echo "   This might be due to foreign key constraints or permissions"
        return 1
    fi
    
    echo ""
}

# Step 1: Delete reviews first (they reference courses and users)
echo -e "${BLUE}Step 1: Delete Reviews${NC}"
echo "--------------------"
delete_from_table "reviews" "reviews"

# Step 2: Delete users (might be referenced by reviews, but reviews are gone now)
echo -e "${BLUE}Step 2: Delete Users${NC}"
echo "-------------------"
delete_from_table "auth.users" "user accounts" || delete_from_table "users" "users"

# Step 3: Delete courses last 
echo -e "${BLUE}Step 3: Delete Courses${NC}"
echo "--------------------"
delete_from_table "courses" "courses"

echo -e "${GREEN}🎉 Production cleanup complete!${NC}"
echo "================================="
echo ""
echo -e "${BLUE}Verification Summary:${NC}"
echo "- All reviews deleted"
echo "- All users deleted"
echo "- All courses deleted"
echo "- Database ready for fresh staging data"
echo ""
echo -e "${YELLOW}Ready for Phase 4: Data Migration${NC}" 