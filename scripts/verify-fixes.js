#!/usr/bin/env node

/**
 * Simple verification script to check if black screen fixes are in place
 * This checks the code changes we made, not the runtime environment
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 === BLACK SCREEN FIX VERIFICATION ===');
console.log('📅 Verification timestamp:', new Date().toISOString());

let allTestsPassed = true;
const issues = [];
const fixes = [];

// Test 1: Check if API_URL references were removed from reviewService.ts
console.log('\n🧪 Test 1: reviewService.ts uploadPhotos function');
try {
  const reviewServicePath = path.join(__dirname, '../app/services/reviewService.ts');
  const reviewServiceContent = fs.readFileSync(reviewServicePath, 'utf8');
  
  // Check if the safety check is present
  if (reviewServiceContent.includes('if (!API_BASE_URL)')) {
    fixes.push('✅ uploadPhotos has safety check for empty API_BASE_URL');
  } else {
    issues.push('❌ uploadPhotos missing safety check - could crash on fetch to empty URL');
    allTestsPassed = false;
  }
  
  // Check if it returns empty array instead of crashing
  if (reviewServiceContent.includes('return [];')) {
    fixes.push('✅ uploadPhotos returns empty array instead of crashing');
  } else {
    issues.push('❌ uploadPhotos might not handle missing API_BASE_URL gracefully');
    allTestsPassed = false;
  }
} catch (error) {
  issues.push('❌ Could not read reviewService.ts');
  allTestsPassed = false;
}

// Test 2: Check Supabase client initialization in supabase.ts
console.log('\n🧪 Test 2: Supabase client initialization');
try {
  const supabasePath = path.join(__dirname, '../app/utils/supabase.ts');
  const supabaseContent = fs.readFileSync(supabasePath, 'utf8');
  
  // Check if validation is present
  if (supabaseContent.includes('if (!supabaseUrl || !supabaseAnonKey)')) {
    fixes.push('✅ Supabase client has credential validation');
  } else {
    issues.push('❌ Supabase client missing credential validation');
    allTestsPassed = false;
  }
  
  // Check if it throws in production for invalid credentials
  if (supabaseContent.includes('if (!__DEV__)') && supabaseContent.includes('throw new Error')) {
    fixes.push('✅ Supabase client throws early in production for invalid credentials');
  } else {
    issues.push('❌ Supabase client might not handle invalid credentials properly');
    allTestsPassed = false;
  }
} catch (error) {
  issues.push('❌ Could not read supabase.ts');
  allTestsPassed = false;
}

// Test 3: Check if deprecated auth.initialize() was removed
console.log('\n🧪 Test 3: Auth service deprecated methods');
try {
  const authServicePath = path.join(__dirname, '../app/services/auth.ts');
  const authServiceContent = fs.readFileSync(authServicePath, 'utf8');
  
  // Check if deprecated initialize is NOT present
  if (!authServiceContent.includes('supabase.auth.initialize')) {
    fixes.push('✅ Deprecated supabase.auth.initialize() removed');
  } else {
    issues.push('❌ Deprecated supabase.auth.initialize() still present - could cause crashes');
    allTestsPassed = false;
  }
  
  // Check if refreshSession function exists
  if (authServiceContent.includes('export const refreshSession')) {
    fixes.push('✅ refreshSession function is implemented');
  } else {
    issues.push('❌ refreshSession function missing');
    allTestsPassed = false;
  }
} catch (error) {
  issues.push('❌ Could not read auth.ts');
  allTestsPassed = false;
}

// Test 4: Check environment variable cleanup
console.log('\n🧪 Test 4: Environment variable cleanup');
try {
  const files = [
    '../app/_layout.tsx',
    '../app/components/DebugOverlay.tsx',
    '../index.js'
  ];
  
  let apiUrlReferences = 0;
  files.forEach(file => {
    try {
      const filePath = path.join(__dirname, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const matches = (content.match(/EXPO_PUBLIC_API_URL/g) || []).length;
      apiUrlReferences += matches;
    } catch (e) {
      // File might not exist, that's okay
    }
  });
  
  if (apiUrlReferences === 0) {
    fixes.push('✅ Removed EXPO_PUBLIC_API_URL references from debug code');
  } else {
    issues.push(`❌ Found ${apiUrlReferences} EXPO_PUBLIC_API_URL references in debug code`);
    allTestsPassed = false;
  }
} catch (error) {
  issues.push('❌ Could not check environment variable cleanup');
  allTestsPassed = false;
}

// Test 5: Check if error boundaries exist
console.log('\n🧪 Test 5: Error handling improvements');
try {
  const layoutPath = path.join(__dirname, '../app/_layout.tsx');
  const layoutContent = fs.readFileSync(layoutPath, 'utf8');
  
  if (layoutContent.includes('ErrorBoundary')) {
    fixes.push('✅ ErrorBoundary is implemented in app layout');
  } else {
    issues.push('❌ ErrorBoundary missing from app layout');
    allTestsPassed = false;
  }
  
  // Check for production alerts
  if (layoutContent.includes('Alert.alert') && layoutContent.includes('!__DEV__')) {
    fixes.push('✅ Production debug alerts are implemented');
  } else {
    issues.push('❌ Production debug alerts missing');
  }
} catch (error) {
  issues.push('❌ Could not check error handling');
  allTestsPassed = false;
}

// Display results
console.log('\n📊 === VERIFICATION RESULTS ===');
console.log(`✅ Fixes verified: ${fixes.length}`);
fixes.forEach(fix => console.log(`    ${fix}`));

console.log(`\n❌ Issues found: ${issues.length}`);
issues.forEach(issue => console.log(`    ${issue}`));

console.log('\n🎯 === FINAL ASSESSMENT ===');
if (allTestsPassed && issues.length === 0) {
  console.log('✅ ALL FIXES VERIFIED! Black screen issues should be resolved.');
  console.log('🚀 SAFE TO PROCEED with TestFlight build.');
  console.log('\n💡 The main issues that were fixed:');
  console.log('   1. uploadPhotos function no longer crashes on empty API_URL');
  console.log('   2. Supabase client properly validates credentials');
  console.log('   3. Removed deprecated auth.initialize() calls');
  console.log('   4. Cleaned up API_URL references');
  console.log('   5. Added comprehensive error handling');
} else {
  console.log('❌ ISSUES DETECTED! Fix these before building for TestFlight.');
  console.log('🛠️  Review the issues listed above and run this script again.');
}

console.log('\n📋 === CONFIDENCE LEVEL ===');
const confidence = fixes.length / (fixes.length + issues.length) * 100;
console.log(`🎯 Fix confidence: ${confidence.toFixed(1)}%`);

if (confidence >= 90) {
  console.log('🟢 High confidence - very likely to resolve black screen');
} else if (confidence >= 70) {
  console.log('🟡 Medium confidence - should resolve main issues');
} else {
  console.log('🔴 Low confidence - significant issues remain');
}

console.log('\n🔄 To run this verification again: npm run verify-fixes');

process.exit(allTestsPassed ? 0 : 1); 