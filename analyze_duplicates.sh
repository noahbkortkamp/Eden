#!/bin/bash

# Duplicate Course Analysis Script
# Finds and analyzes duplicate golf courses based on name + location

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

echo -e "${BLUE}🔍 Golf Course Duplicate Analysis${NC}"
echo "=================================="

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
    exit 1
fi

SUPABASE_URL="$EXPO_PUBLIC_SUPABASE_URL"
SUPABASE_KEY="$EXPO_PUBLIC_SUPABASE_ANON_KEY"

echo -e "\n${CYAN}📊 Current Database Status${NC}"
echo "=========================="

# Get total count
echo -e "${BLUE}📥 Fetching all courses for local analysis...${NC}"

ALL_COURSES=$(curl -s -G "${SUPABASE_URL}/rest/v1/courses" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -H "apikey: ${SUPABASE_KEY}" \
    --data-urlencode "select=id,name,location,town,state,latitude,longitude" \
    --data-urlencode "limit=2000")

if [ ! -z "$ALL_COURSES" ] && [ "$ALL_COURSES" != "null" ]; then
    echo "$ALL_COURSES" > courses_temp.json
    
    echo -e "${PURPLE}🔍 Analyzing courses locally...${NC}"
    
    # Use Python to analyze duplicates
    python3 << 'PYTHON_EOF'
import json
import sys
from collections import defaultdict

try:
    with open('courses_temp.json', 'r') as f:
        courses = json.load(f)
    
    print(f"✅ Loaded {len(courses)} courses")
    
    # Group by name + location combination
    groups = defaultdict(list)
    
    for course in courses:
        name = course.get('name', '').strip()
        location = course.get('location', '').strip()
        town = course.get('town', '').strip()
        state = course.get('state', '').strip()
        
        # Create a key for grouping
        if location:
            key = f"{name}|||{location}"
        elif town and state:
            key = f"{name}|||{town}, {state}"
        else:
            key = f"{name}|||UNKNOWN_LOCATION"
        
        groups[key].append(course)
    
    # Find duplicates
    duplicates = {k: v for k, v in groups.items() if len(v) > 1}
    
    print(f"\n🎯 DUPLICATE ANALYSIS RESULTS:")
    print(f"===============================")
    print(f"Total unique name+location combinations: {len(groups)}")
    print(f"Duplicate groups found: {len(duplicates)}")
    
    if duplicates:
        total_duplicate_courses = sum(len(group) for group in duplicates.values())
        excess_courses = total_duplicate_courses - len(duplicates)
        print(f"Total courses in duplicate groups: {total_duplicate_courses}")
        print(f"Excess courses (could be removed): {excess_courses}")
        
        print(f"\n📋 DUPLICATE DETAILS:")
        print(f"====================")
        
        for i, (key, group) in enumerate(sorted(duplicates.items(), key=lambda x: len(x[1]), reverse=True)[:10]):
            name, location = key.split('|||')
            print(f"\n{i+1}. {name}")
            print(f"   Location: {location}")
            print(f"   Duplicates: {len(group)} courses")
            
            for j, course in enumerate(group):
                geocoded = "🌍" if course.get('latitude') and course.get('longitude') else "📍"
                print(f"   {j+1}. {geocoded} ID: {course['id'][:8]}...")
        
        if len(duplicates) > 10:
            print(f"\n... and {len(duplicates) - 10} more duplicate groups")
    else:
        print("✅ No duplicates found!")

except Exception as e:
    print(f"❌ Error analyzing courses: {e}")
    sys.exit(1)
PYTHON_EOF
        
    # Clean up temp file
    rm -f courses_temp.json
    
else
    echo -e "${RED}❌ Unable to fetch courses${NC}"
    exit 1
fi

echo -e "\n${WHITE}💡 Next Steps:${NC}"
echo "=============="
echo -e "1. ${CYAN}Review the duplicate analysis above${NC}"
echo -e "2. ${YELLOW}Decide which duplicates to keep (geocoded vs non-geocoded?)${NC}"
echo -e "3. ${GREEN}Run a cleanup script to remove excess duplicates${NC}"
echo -e "4. ${BLUE}Re-test the app to ensure functionality${NC}"

echo -e "\n${WHITE}🛠️ Cleanup Options:${NC}"
echo "=================="
echo -e "• Keep the geocoded version when available"
echo -e "• Keep the first inserted version (by creation date)"
echo -e "• Manual review for complex cases"

echo -e "\n${WHITE}✨ Analysis Complete!${NC}" 