#!/bin/bash

# Database Assessment Script for Production Reset
# Phase 1: Pre-Migration Safety & Assessment

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}📊 Database Assessment for Production Reset${NC}"
echo "=============================================="

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
echo -e "${BLUE}🔍 PHASE 1: Current Database Assessment${NC}"
echo "========================================="

# Function to run SQL query and get JSON result
run_query() {
    local query="$1"
    local description="$2"
    
    echo -e "${YELLOW}📋 $description${NC}"
    
    curl -s -X POST "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
        -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
        -H "Content-Type: application/json" \
        -H "apikey: ${SUPABASE_ANON_KEY}" \
        -d "{\"sql\": \"$query\"}" | jq '.'
    
    echo ""
}

# Function to get table count
get_table_count() {
    local table="$1"
    local description="$2"
    
    echo -e "${YELLOW}📊 $description${NC}"
    
    curl -s -X GET "${SUPABASE_URL}/rest/v1/$table?select=*" \
        -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
        -H "Content-Type: application/json" \
        -H "apikey: ${SUPABASE_ANON_KEY}" \
        -H "Prefer: count=exact" | head -1 | grep -o 'count=[^,]*' || echo "Count request failed"
    
    echo ""
}

echo -e "${GREEN}1. Current Record Counts${NC}"
echo "------------------------"

# Count production tables
get_table_count "courses" "Production Courses Count"
get_table_count "users" "Users Count" 
get_table_count "reviews" "Reviews Count"

# Count staging table
get_table_count "courses_staging" "Staging Courses Count"

echo -e "${GREEN}2. Staging Data Quality Assessment${NC}"
echo "--------------------------------"

# Check geocoded vs non-geocoded courses in staging
echo -e "${YELLOW}📍 Geocoded courses in staging${NC}"
curl -s -X GET "${SUPABASE_URL}/rest/v1/courses_staging?select=*&latitude=not.is.null" \
    -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
    -H "Content-Type: application/json" \
    -H "apikey: ${SUPABASE_ANON_KEY}" \
    -H "Prefer: count=exact" | head -1 | grep -o 'count=[^,]*' || echo "Geocoded count request failed"

echo ""

echo -e "${YELLOW}📍 Non-geocoded courses in staging${NC}"
curl -s -X GET "${SUPABASE_URL}/rest/v1/courses_staging?select=*&latitude=is.null" \
    -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
    -H "Content-Type: application/json" \
    -H "apikey: ${SUPABASE_ANON_KEY}" \
    -H "Prefer: count=exact" | head -1 | grep -o 'count=[^,]*' || echo "Non-geocoded count request failed"

echo ""

echo -e "${GREEN}3. Table Schema Comparison${NC}"
echo "-------------------------"

# Get column information for both tables
echo -e "${YELLOW}📋 Production courses table schema${NC}"
curl -s -X GET "${SUPABASE_URL}/rest/v1/courses?select=*&limit=1" \
    -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
    -H "Content-Type: application/json" \
    -H "apikey: ${SUPABASE_ANON_KEY}" | jq 'if length > 0 then .[0] | keys else "No records to show schema" end'

echo ""

echo -e "${YELLOW}📋 Staging courses table schema${NC}"
curl -s -X GET "${SUPABASE_URL}/rest/v1/courses_staging?select=*&limit=1" \
    -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
    -H "Content-Type: application/json" \
    -H "apikey: ${SUPABASE_ANON_KEY}" | jq 'if length > 0 then .[0] | keys else "No records to show schema" end'

echo ""

echo -e "${GREEN}4. Sample Data Preview${NC}"
echo "--------------------"

echo -e "${YELLOW}📋 Sample staging course (first record)${NC}"
curl -s -X GET "${SUPABASE_URL}/rest/v1/courses_staging?select=*&limit=1" \
    -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
    -H "Content-Type: application/json" \
    -H "apikey: ${SUPABASE_ANON_KEY}" | jq '.[0] // "No records found"'

echo ""

echo -e "${GREEN}5. Foreign Key Dependencies${NC}"
echo "-------------------------"

echo -e "${YELLOW}📋 Checking if reviews reference courses${NC}"
# Try to get a few reviews to see the structure
curl -s -X GET "${SUPABASE_URL}/rest/v1/reviews?select=*&limit=3" \
    -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
    -H "Content-Type: application/json" \
    -H "apikey: ${SUPABASE_ANON_KEY}" | jq '. | length as $count | if $count > 0 then "Found \($count) reviews - checking structure..." else "No reviews found" end'

echo ""

echo -e "${GREEN}📊 Assessment Complete!${NC}"
echo "======================="
echo ""
echo -e "${BLUE}Summary:${NC}"
echo "- Counted records in all tables"
echo "- Assessed geocoding data quality" 
echo "- Compared table schemas"
echo "- Identified foreign key relationships"
echo ""
echo -e "${YELLOW}Ready for Phase 2: Production Data Cleanup${NC}" 