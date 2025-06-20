#!/bin/bash

# Duplicate Course Cleanup Script
# Removes duplicate golf courses based on smart rules

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

echo -e "${RED}🧹 Golf Course Duplicate Cleanup${NC}"
echo "================================="

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo -e "${GREEN}✅ Environment variables loaded${NC}"
else
    echo -e "${RED}❌ .env file not found${NC}"
    exit 1
fi

SUPABASE_URL="$EXPO_PUBLIC_SUPABASE_URL"
SUPABASE_KEY="$EXPO_PUBLIC_SUPABASE_ANON_KEY"

echo -e "\n${BLUE}📥 Fetching ALL courses (with higher limit)...${NC}"

# Try to get ALL courses with a much higher limit
ALL_COURSES=$(curl -s -G "${SUPABASE_URL}/rest/v1/courses" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -H "apikey: ${SUPABASE_KEY}" \
    --data-urlencode "select=id,name,location,town,state,latitude,longitude,created_at" \
    --data-urlencode "limit=1500" \
    --data-urlencode "order=created_at.asc")

if [ ! -z "$ALL_COURSES" ] && [ "$ALL_COURSES" != "null" ]; then
    echo "$ALL_COURSES" > courses_cleanup.json
    
    echo -e "${PURPLE}🔍 Analyzing duplicates and creating cleanup plan...${NC}"
    
    # Create cleanup plan using Python
    python3 << 'PYTHON_EOF'
import json
import sys
from collections import defaultdict
from datetime import datetime

try:
    with open('courses_cleanup.json', 'r') as f:
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
    
    # Find duplicates and create cleanup plan
    duplicates = {k: v for k, v in groups.items() if len(v) > 1}
    cleanup_plan = []
    
    print(f"\n🎯 CLEANUP ANALYSIS:")
    print(f"===================")
    print(f"Total courses: {len(courses)}")
    print(f"Unique courses: {len(groups)}")
    print(f"Duplicate groups: {len(duplicates)}")
    
    if duplicates:
        total_to_remove = 0
        
        for key, group in duplicates.items():
            name, location = key.split('|||')
            
            # Sort courses by preference:
            # 1. Geocoded courses first (have lat/lng)
            # 2. Then by creation date (older first - original data)
            def sort_preference(course):
                has_location = bool(course.get('latitude') and course.get('longitude'))
                created_at = course.get('created_at', '1970-01-01T00:00:00Z')
                # Return tuple: (geocoded_score, date) - geocoded first, older first
                return (not has_location, created_at)
            
            sorted_group = sorted(group, key=sort_preference)
            
            # Keep the first (best) course, mark others for deletion
            keep_course = sorted_group[0]
            delete_courses = sorted_group[1:]
            
            geocoded_symbol = "🌍" if keep_course.get('latitude') and keep_course.get('longitude') else "📍"
            
            print(f"\n📍 {name} ({location})")
            print(f"   KEEP: {geocoded_symbol} {keep_course['id']}")
            
            for course in delete_courses:
                delete_symbol = "🌍" if course.get('latitude') and course.get('longitude') else "📍"
                print(f"   DELETE: {delete_symbol} {course['id']}")
                cleanup_plan.append(course['id'])
                total_to_remove += 1
        
        print(f"\n📊 CLEANUP SUMMARY:")
        print(f"==================")
        print(f"Courses to delete: {total_to_remove}")
        print(f"Courses to keep: {len(courses) - total_to_remove}")
        
        # Save cleanup plan
        with open('cleanup_plan.json', 'w') as f:
            json.dump({
                'courses_to_delete': cleanup_plan,
                'total_before': len(courses),
                'total_after': len(courses) - total_to_remove,
                'duplicates_removed': total_to_remove
            }, f, indent=2)
        
        print(f"💾 Cleanup plan saved to cleanup_plan.json")
        
    else:
        print("✅ No duplicates found!")

except Exception as e:
    print(f"❌ Error analyzing courses: {e}")
    sys.exit(1)
PYTHON_EOF

    if [ -f cleanup_plan.json ]; then
        echo -e "\n${YELLOW}⚠️  Ready to execute cleanup?${NC}"
        echo -e "${WHITE}This will permanently delete duplicate courses!${NC}"
        echo ""
        
        if [ "$1" = "CONFIRM_DELETE_DUPLICATES" ]; then
            CONFIRMATION="CONFIRM_DELETE_DUPLICATES"
            echo -e "Auto-confirmed: ${GREEN}$CONFIRMATION${NC}"
        else
            read -p "Type 'CONFIRM_DELETE_DUPLICATES' to proceed: " CONFIRMATION
        fi
        
        if [ "$CONFIRMATION" = "CONFIRM_DELETE_DUPLICATES" ]; then
            echo -e "\n${RED}🗑️  Starting duplicate cleanup...${NC}"
            
            # Read the cleanup plan
            COURSES_TO_DELETE=$(jq -r '.courses_to_delete[]' cleanup_plan.json)
            TOTAL_TO_DELETE=$(jq -r '.duplicates_removed' cleanup_plan.json)
            
            deleted_count=0
            error_count=0
            
            for course_id in $COURSES_TO_DELETE; do
                echo -e "${CYAN}Deleting course: $course_id${NC}"
                
                DELETE_RESULT=$(curl -s -X DELETE "${SUPABASE_URL}/rest/v1/courses?id=eq.$course_id" \
                    -H "Authorization: Bearer ${SUPABASE_KEY}" \
                    -H "apikey: ${SUPABASE_KEY}")
                
                if [ $? -eq 0 ]; then
                    ((deleted_count++))
                    echo -e "${GREEN}✅ Deleted${NC}"
                else
                    ((error_count++))
                    echo -e "${RED}❌ Failed${NC}"
                fi
                
                # Brief pause to avoid rate limiting
                sleep 0.1
            done
            
            echo -e "\n${WHITE}🎉 Cleanup Complete!${NC}"
            echo "====================="
            echo -e "Courses deleted: ${GREEN}$deleted_count${NC}"
            echo -e "Errors: ${RED}$error_count${NC}"
            echo -e "Expected: ${YELLOW}$TOTAL_TO_DELETE${NC}"
            
            # Clean up temp files
            rm -f courses_cleanup.json cleanup_plan.json
            
        else
            echo -e "${YELLOW}❌ Cleanup cancelled${NC}"
            echo -e "${BLUE}💡 Cleanup plan saved in cleanup_plan.json for review${NC}"
        fi
    fi
    
else
    echo -e "${RED}❌ Unable to fetch courses${NC}"
    exit 1
fi

echo -e "\n${WHITE}✨ Cleanup Complete!${NC}" 