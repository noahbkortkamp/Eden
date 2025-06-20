#!/bin/bash

# Comprehensive Duplicate Analysis - Full Database
# Uses pagination to analyze ALL courses for duplicates

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

echo -e "${RED}🔍 COMPREHENSIVE Duplicate Analysis - FULL DATABASE${NC}"
echo "======================================================="

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

echo "$ALL_COURSES" > all_courses_full.json
echo -e "${GREEN}✅ Total courses fetched: $TOTAL_FETCHED${NC}"

echo -e "\n${PURPLE}🔍 Comprehensive duplicate analysis...${NC}"

# Comprehensive duplicate analysis
python3 << 'PYTHON_EOF'
import json
import sys
from collections import defaultdict

try:
    with open('all_courses_full.json', 'r') as f:
        courses = json.load(f)
    
    print(f"✅ Loaded {len(courses)} courses for analysis")
    
    # Multiple grouping strategies to catch all types of duplicates
    
    # Strategy 1: Exact name + location match
    print(f"\n🎯 STRATEGY 1: Exact name + location duplicates")
    print(f"==============================================")
    
    groups1 = defaultdict(list)
    for course in courses:
        name = course.get('name', '').strip()
        location = course.get('location', '').strip()
        town = course.get('town', '').strip()
        state = course.get('state', '').strip()
        
        if location:
            key = f"{name}|||{location}"
        elif town and state:
            key = f"{name}|||{town}, {state}"
        else:
            key = f"{name}|||UNKNOWN"
        
        groups1[key].append(course)
    
    duplicates1 = {k: v for k, v in groups1.items() if len(v) > 1}
    
    if duplicates1:
        total_dups1 = sum(len(group) for group in duplicates1.values())
        excess1 = total_dups1 - len(duplicates1)
        print(f"Found {len(duplicates1)} duplicate groups ({total_dups1} courses, {excess1} excess)")
        
        for key, group in sorted(duplicates1.items(), key=lambda x: len(x[1]), reverse=True)[:15]:
            name, location = key.split('|||')
            print(f"  📍 {name} ({location}) - {len(group)} duplicates")
            for course in group:
                geocoded = "🌍" if course.get('latitude') and course.get('longitude') else "📍"
                created = course.get('created_at', 'unknown')[:10]
                print(f"    {geocoded} {course['id'][:8]}... (created: {created})")
    else:
        print("✅ No exact duplicates found")
    
    # Strategy 2: Name-only duplicates (same name, different/missing location)
    print(f"\n🎯 STRATEGY 2: Same name, different locations")
    print(f"==============================================")
    
    name_groups = defaultdict(list)
    for course in courses:
        name = course.get('name', '').strip().lower()
        if name:
            name_groups[name].append(course)
    
    name_duplicates = {k: v for k, v in name_groups.items() if len(v) > 1}
    
    # Filter to only show ones that might be actual duplicates (same name, similar location)
    suspicious_name_dups = {}
    for name, group in name_duplicates.items():
        # Group by location within same name
        location_subgroups = defaultdict(list)
        for course in group:
            location = course.get('location', '').strip()
            town = course.get('town', '').strip()
            state = course.get('state', '').strip()
            
            if location:
                loc_key = location
            elif town and state:
                loc_key = f"{town}, {state}"
            else:
                loc_key = "UNKNOWN"
            
            location_subgroups[loc_key].append(course)
        
        # Only flag if there are location subgroups with multiple courses
        has_real_dups = any(len(subgroup) > 1 for subgroup in location_subgroups.values())
        if has_real_dups:
            suspicious_name_dups[name] = (group, location_subgroups)
    
    if suspicious_name_dups:
        print(f"Found {len(suspicious_name_dups)} courses with name-based duplicates:")
        for name, (group, subgroups) in list(suspicious_name_dups.items())[:10]:
            print(f"  🏌️ {name.title()} ({len(group)} total courses)")
            for location, subgroup in subgroups.items():
                if len(subgroup) > 1:
                    print(f"    📍 {location}: {len(subgroup)} duplicates")
                    for course in subgroup:
                        geocoded = "🌍" if course.get('latitude') and course.get('longitude') else "📍"
                        print(f"      {geocoded} {course['id'][:8]}...")
    else:
        print("✅ No suspicious name duplicates found")
    
    # Strategy 3: Similar coordinates (geocoded duplicates)
    print(f"\n🎯 STRATEGY 3: Similar coordinates (location duplicates)")
    print(f"=======================================================")
    
    geocoded_courses = [c for c in courses if c.get('latitude') and c.get('longitude')]
    print(f"Analyzing {len(geocoded_courses)} geocoded courses...")
    
    coord_duplicates = []
    for i, course1 in enumerate(geocoded_courses):
        for j, course2 in enumerate(geocoded_courses[i+1:], i+1):
            lat1, lon1 = float(course1['latitude']), float(course1['longitude'])
            lat2, lon2 = float(course2['latitude']), float(course2['longitude'])
            
            # Calculate simple distance (very rough)
            lat_diff = abs(lat1 - lat2)
            lon_diff = abs(lon1 - lon2)
            
            # If coordinates are very close (within ~0.001 degrees ≈ 100m)
            if lat_diff < 0.001 and lon_diff < 0.001:
                coord_duplicates.append((course1, course2, lat_diff, lon_diff))
    
    if coord_duplicates:
        print(f"Found {len(coord_duplicates)} coordinate-based duplicates:")
        for course1, course2, lat_diff, lon_diff in coord_duplicates[:10]:
            print(f"  🌍 {course1['name']} vs {course2['name']}")
            print(f"    Coords: ({course1['latitude']}, {course1['longitude']}) vs ({course2['latitude']}, {course2['longitude']})")
            print(f"    Distance: ~{max(lat_diff, lon_diff)*111:.1f}km")
            print(f"    IDs: {course1['id'][:8]}... vs {course2['id'][:8]}...")
    else:
        print("✅ No coordinate duplicates found")
    
    # Summary
    print(f"\n📊 COMPREHENSIVE DUPLICATE SUMMARY")
    print(f"===================================")
    print(f"Total courses analyzed: {len(courses)}")
    print(f"Exact duplicates: {len(duplicates1)} groups ({sum(len(g) for g in duplicates1.values())} courses)")
    print(f"Name-based suspicious: {len(suspicious_name_dups)} cases")
    print(f"Coordinate duplicates: {len(coord_duplicates)} pairs")
    
    # Create comprehensive cleanup plan
    all_duplicates_to_remove = []
    
    # From exact duplicates - keep best version of each
    for key, group in duplicates1.items():
        def sort_preference(course):
            has_location = bool(course.get('latitude') and course.get('longitude'))
            created_at = course.get('created_at', '1970-01-01T00:00:00Z')
            return (not has_location, created_at)
        
        sorted_group = sorted(group, key=sort_preference)
        # Keep first, remove rest
        for course in sorted_group[1:]:
            all_duplicates_to_remove.append(course['id'])
    
    print(f"\n💾 COMPREHENSIVE CLEANUP PLAN")
    print(f"=============================")
    print(f"Courses to remove: {len(all_duplicates_to_remove)}")
    
    if all_duplicates_to_remove:
        with open('comprehensive_cleanup.json', 'w') as f:
            json.dump({
                'courses_to_delete': all_duplicates_to_remove,
                'total_before': len(courses),
                'total_after': len(courses) - len(all_duplicates_to_remove),
                'duplicates_removed': len(all_duplicates_to_remove),
                'analysis_strategies': 3
            }, f, indent=2)
        print(f"💾 Comprehensive cleanup plan saved")

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
PYTHON_EOF

# Clean up temp file
rm -f all_courses_full.json

echo -e "\n${WHITE}✨ Comprehensive Analysis Complete!${NC}"

if [ -f comprehensive_cleanup.json ]; then
    TOTAL_TO_DELETE=$(jq -r '.duplicates_removed' comprehensive_cleanup.json)
    if [ "$TOTAL_TO_DELETE" -gt 0 ]; then
        echo -e "\n${YELLOW}⚠️ Found $TOTAL_TO_DELETE additional duplicates!${NC}"
        echo -e "${WHITE}Run comprehensive cleanup?${NC}"
        echo -e "${BLUE}Usage: ./comprehensive_cleanup.sh CONFIRM_DELETE_ALL_DUPLICATES${NC}"
    else
        echo -e "\n${GREEN}✅ No additional duplicates found!${NC}"
    fi
fi 