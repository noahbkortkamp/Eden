#!/bin/bash

# PRECISE Duplicate Cleanup - Only Exact Name + Location Matches
# Does NOT flag numbered courses at same resort as duplicates

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

echo -e "${RED}🎯 PRECISE Duplicate Cleanup - Exact Matches Only${NC}"
echo "=================================================="

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

echo -e "\n${BLUE}📥 Fetching ALL courses using pagination...${NC}"

# Fetch ALL courses using pagination
ALL_COURSES="[]"
OFFSET=0
LIMIT=1000
TOTAL_FETCHED=0

while true; do
    echo -e "${CYAN}Fetching batch: offset=$OFFSET, limit=$LIMIT${NC}"
    
    BATCH=$(curl -s -G "${SUPABASE_URL}/rest/v1/courses" \
        -H "Authorization: Bearer ${SUPABASE_KEY}" \
        -H "apikey: ${SUPABASE_KEY}" \
        -H "Range: $OFFSET-$((OFFSET + LIMIT - 1))" \
        --data-urlencode "select=id,name,location,town,state,latitude,longitude,created_at" \
        --data-urlencode "order=created_at.asc")
    
    if [ -z "$BATCH" ] || [ "$BATCH" = "[]" ] || [ "$BATCH" = "null" ]; then
        echo -e "${YELLOW}No more courses found at offset $OFFSET${NC}"
        break
    fi
    
    BATCH_COUNT=$(echo "$BATCH" | jq 'length')
    echo -e "${GREEN}✅ Fetched $BATCH_COUNT courses${NC}"
    
    # Merge with existing data
    ALL_COURSES=$(echo "$ALL_COURSES $BATCH" | jq -s 'add')
    TOTAL_FETCHED=$((TOTAL_FETCHED + BATCH_COUNT))
    
    # If we got less than the limit, we're done
    if [ "$BATCH_COUNT" -lt "$LIMIT" ]; then
        echo -e "${GREEN}✅ Reached end of data${NC}"
        break
    fi
    
    OFFSET=$((OFFSET + LIMIT))
    
    # Safety check to avoid infinite loops
    if [ "$OFFSET" -gt 2000 ]; then
        echo -e "${YELLOW}⚠️ Safety limit reached at offset $OFFSET${NC}"
        break
    fi
done

echo "$ALL_COURSES" > courses_precise.json
echo -e "${GREEN}✅ Total courses fetched: $TOTAL_FETCHED${NC}"

echo -e "\n${PURPLE}🎯 PRECISE duplicate analysis - Exact name + location only...${NC}"

# Precise duplicate analysis
python3 << 'PYTHON_EOF'
import json
import sys
from collections import defaultdict

try:
    with open('courses_precise.json', 'r') as f:
        courses = json.load(f)
    
    print(f"✅ Loaded {len(courses)} courses for analysis")
    
    # PRECISE Strategy: Only exact name + exact location matches
    print(f"\n🎯 PRECISE DUPLICATE DETECTION")
    print(f"==============================")
    print(f"Rule: EXACT same name + EXACT same location")
    print(f"Excludes: Numbered courses at same resort (e.g., Pinehurst No. 2 vs No. 4)")
    
    groups = defaultdict(list)
    
    for course in courses:
        name = course.get('name', '').strip()
        location = course.get('location', '').strip()
        town = course.get('town', '').strip()
        state = course.get('state', '').strip()
        
        # Create precise key: exact name + exact location
        if location:
            key = f"{name}|||{location}"
        elif town and state:
            key = f"{name}|||{town}, {state}"
        else:
            # Skip courses without clear location
            continue
        
        groups[key].append(course)
    
    # Find TRUE duplicates (exact same name + location)
    precise_duplicates = {k: v for k, v in groups.items() if len(v) > 1}
    
    if precise_duplicates:
        total_duplicates = sum(len(group) for group in precise_duplicates.values())
        excess_courses = total_duplicates - len(precise_duplicates)
        
        print(f"\n📊 PRECISE DUPLICATE RESULTS:")
        print(f"=============================")
        print(f"Duplicate groups found: {len(precise_duplicates)}")
        print(f"Total courses in duplicates: {total_duplicates}")
        print(f"Excess courses to remove: {excess_courses}")
        
        print(f"\n📋 DUPLICATE DETAILS:")
        print(f"=====================")
        
        cleanup_plan = []
        
        for i, (key, group) in enumerate(sorted(precise_duplicates.items(), key=lambda x: len(x[1]), reverse=True)):
            name, location = key.split('|||')
            print(f"\n{i+1}. {name}")
            print(f"   Location: {location}")
            print(f"   Duplicates: {len(group)} courses")
            
            # Sort by preference: geocoded first, then by creation date
            def sort_preference(course):
                has_location = bool(course.get('latitude') and course.get('longitude'))
                created_at = course.get('created_at', '1970-01-01T00:00:00Z')
                return (not has_location, created_at)
            
            sorted_group = sorted(group, key=sort_preference)
            keep_course = sorted_group[0]
            delete_courses = sorted_group[1:]
            
            # Show what we're keeping vs deleting
            geocoded_symbol = "🌍" if keep_course.get('latitude') and keep_course.get('longitude') else "📍"
            created = keep_course.get('created_at', 'unknown')[:10]
            print(f"   KEEP: {geocoded_symbol} {keep_course['id']} (created: {created})")
            
            for course in delete_courses:
                delete_symbol = "🌍" if course.get('latitude') and course.get('longitude') else "📍"
                created = course.get('created_at', 'unknown')[:10]
                print(f"   DELETE: {delete_symbol} {course['id']} (created: {created})")
                cleanup_plan.append(course['id'])
        
        print(f"\n💾 CLEANUP PLAN SUMMARY:")
        print(f"========================")
        print(f"Courses to delete: {len(cleanup_plan)}")
        print(f"Courses to keep: {len(courses) - len(cleanup_plan)}")
        print(f"Final unique courses: {len(groups)}")
        
        # Save cleanup plan
        with open('precise_cleanup.json', 'w') as f:
            json.dump({
                'courses_to_delete': cleanup_plan,
                'total_before': len(courses),
                'total_after': len(courses) - len(cleanup_plan),
                'duplicates_removed': len(cleanup_plan),
                'unique_courses': len(groups),
                'strategy': 'precise_exact_matches_only'
            }, f, indent=2)
        
        print(f"💾 Precise cleanup plan saved to precise_cleanup.json")
        
    else:
        print("✅ No precise duplicates found!")
        print("All courses have unique name+location combinations")

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
PYTHON_EOF

# Clean up temp file
rm -f courses_precise.json

echo -e "\n${WHITE}✨ Precise Analysis Complete!${NC}"

if [ -f precise_cleanup.json ]; then
    TOTAL_TO_DELETE=$(jq -r '.duplicates_removed' precise_cleanup.json)
    FINAL_UNIQUE=$(jq -r '.unique_courses' precise_cleanup.json)
    
    if [ "$TOTAL_TO_DELETE" -gt 0 ]; then
        echo -e "\n${YELLOW}⚠️ Found $TOTAL_TO_DELETE TRUE duplicates to remove${NC}"
        echo -e "${GREEN}✅ This will result in $FINAL_UNIQUE unique courses${NC}"
        echo ""
        
        if [ "$1" = "CONFIRM_DELETE_PRECISE_DUPLICATES" ]; then
            CONFIRMATION="CONFIRM_DELETE_PRECISE_DUPLICATES"
            echo -e "Auto-confirmed: ${GREEN}$CONFIRMATION${NC}"
        else
            read -p "Type 'CONFIRM_DELETE_PRECISE_DUPLICATES' to proceed: " CONFIRMATION
        fi
        
        if [ "$CONFIRMATION" = "CONFIRM_DELETE_PRECISE_DUPLICATES" ]; then
            echo -e "\n${RED}🗑️ Starting precise duplicate cleanup...${NC}"
            
            # Read the cleanup plan
            COURSES_TO_DELETE=$(jq -r '.courses_to_delete[]' precise_cleanup.json)
            
            deleted_count=0
            error_count=0
            
            for course_id in $COURSES_TO_DELETE; do
                echo -e "${CYAN}Deleting duplicate: $course_id${NC}"
                
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
            
            echo -e "\n${WHITE}🎉 Precise Cleanup Complete!${NC}"
            echo "=============================="
            echo -e "Duplicates deleted: ${GREEN}$deleted_count${NC}"
            echo -e "Errors: ${RED}$error_count${NC}"
            echo -e "Expected: ${YELLOW}$TOTAL_TO_DELETE${NC}"
            
            # Clean up temp files
            rm -f precise_cleanup.json
            
            echo -e "\n${GREEN}🏌️ Your database now has clean, unique courses!${NC}"
            echo -e "${BLUE}✅ Pinehurst No. 2, 4, 5, 6, 7, 8, 9, 10 are all preserved as separate courses${NC}"
            echo -e "${BLUE}✅ Only TRUE duplicates (same name + same location) were removed${NC}"
            
        else
            echo -e "${YELLOW}❌ Cleanup cancelled${NC}"
            echo -e "${BLUE}💡 Cleanup plan saved in precise_cleanup.json for review${NC}"
        fi
    else
        echo -e "\n${GREEN}✅ No TRUE duplicates found!${NC}"
        echo -e "${BLUE}All courses have unique name+location combinations${NC}"
    fi
fi

echo -e "\n${WHITE}✨ Precise Cleanup Complete!${NC}" 