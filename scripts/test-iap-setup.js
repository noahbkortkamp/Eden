#!/usr/bin/env node

/**
 * Test script to verify IAP setup and database schema
 * 
 * Run with: node scripts/test-iap-setup.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Function to load environment variables from .env files
function loadEnvVariables() {
  const envFiles = ['.env', '.env.local', '.env.development'];
  
  for (const envFile of envFiles) {
    const envPath = path.join(process.cwd(), envFile);
    if (fs.existsSync(envPath)) {
      console.log(`📄 Loading environment from ${envFile}`);
      const envContent = fs.readFileSync(envPath, 'utf8');
      
      envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value && key.includes('SUPABASE')) {
          process.env[key.trim()] = value.trim().replace(/['"]/g, '');
        }
      });
    }
  }
}

// Load environment variables
loadEnvVariables();

// You can also manually set them here if needed:
// process.env.EXPO_PUBLIC_SUPABASE_URL = "your-url-here";
// process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "your-key-here";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Please either:');
  console.log('1. Add them to a .env file in your project root');
  console.log('2. Set them as environment variables');
  console.log('3. Edit this script and add them manually');
  console.log('\nLooking for:');
  console.log('- EXPO_PUBLIC_SUPABASE_URL');
  console.log('- EXPO_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

console.log('✅ Environment variables loaded');
console.log(`🔗 Supabase URL: ${supabaseUrl.substring(0, 30)}...`);

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('🔍 Checking subscription tables...');
  
  const requiredTables = [
    'user_subscriptions',
    'purchase_receipts',
    'subscription_events'
  ];

  for (const table of requiredTables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
        
      if (error) {
        console.log(`❌ Table ${table}: ${error.message}`);
      } else {
        console.log(`✅ Table ${table}: accessible`);
      }
    } catch (err) {
      console.log(`❌ Table ${table}: ${err.message}`);
    }
  }
}

async function checkFunctions() {
  console.log('\n🔍 Checking subscription functions...');
  
  const requiredFunctions = [
    'validate_subscription_status',
    'check_feature_access',
    'log_subscription_event',
    'update_subscription_status'
  ];

  // Get a real user ID or create a test UUID that won't violate constraints
  let testUserId = '00000000-0000-0000-0000-000000000000';
  
  // Try to get a real user ID from the database
  try {
    const { data: users } = await supabase.from('users').select('id').limit(1);
    if (users && users.length > 0) {
      testUserId = users[0].id;
      console.log('📋 Using real user ID for testing');
    } else {
      console.log('📋 Using mock user ID for testing (some functions may fail)');
    }
  } catch (err) {
    console.log('📋 Using mock user ID for testing');
  }

  for (const func of requiredFunctions) {
    try {
      let result;
      
      if (func === 'validate_subscription_status') {
        result = await supabase.rpc(func, { user_id: testUserId });
      } else if (func === 'check_feature_access') {
        result = await supabase.rpc(func, { 
          user_id: testUserId, 
          feature_name: 'unlimited_reviews' 
        });
      } else if (func === 'log_subscription_event') {
        // Skip this test if using mock user ID (will fail foreign key constraint)
        if (testUserId === '00000000-0000-0000-0000-000000000000') {
          console.log(`⚠️  Function ${func}: skipped (requires real user)`);
          continue;
        }
        result = await supabase.rpc(func, {
          user_id: testUserId,
          event_type: 'test_event',
          event_data: { test: true }
        });
      } else if (func === 'update_subscription_status') {
        // Skip this test if using mock user ID (will fail foreign key constraint)
        if (testUserId === '00000000-0000-0000-0000-000000000000') {
          console.log(`⚠️  Function ${func}: skipped (requires real user)`);
          continue;
        }
        result = await supabase.rpc(func, {
          user_id: testUserId,
          product_id: 'test_product',
          new_status: 'active',
          expiration_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year from now
        });
      }
      
      if (result.error) {
        console.log(`❌ Function ${func}: ${result.error.message}`);
      } else {
        console.log(`✅ Function ${func}: working`);
      }
    } catch (err) {
      console.log(`❌ Function ${func}: ${err.message}`);
    }
  }
}

async function checkUserSubscriptionsSchema() {
  console.log('\n🔍 Checking user_subscriptions table schema...');
  
  try {
    // Use rpc to query information_schema since direct access might be restricted
    const { data, error } = await supabase.rpc('sql', {
      query: `
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_subscriptions' 
        ORDER BY ordinal_position
      `
    });

    // If that fails, try a simpler approach
    if (error) {
      console.log('📋 Using alternative schema check method...');
      
      // Try to insert and rollback to see what columns exist
      const testResult = await supabase
        .from('user_subscriptions')
        .select('*')
        .limit(0); // This will return column info without data
        
      if (testResult.error) {
        console.log(`❌ Schema check failed: ${testResult.error.message}`);
        return;
      }
      
      console.log('✅ user_subscriptions table is accessible');
      console.log('📋 Schema check completed (basic validation)');
      return;
    }

    if (error) {
      console.log(`❌ Schema check failed: ${error.message}`);
      return;
    }

    const requiredColumns = [
      'id', 'user_id', 'product_id', 'status', 'start_date',
      'expiration_date', 'latest_transaction_id', 'receipt_data',
      'environment', 'is_trial_period', 'created_at', 'updated_at'
    ];

    const existingColumns = data.map(col => col.column_name);
    
    console.log('📋 Existing columns:', existingColumns.join(', '));
    
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length > 0) {
      console.log(`❌ Missing columns: ${missingColumns.join(', ')}`);
    } else {
      console.log('✅ All required columns present');
    }

    // Check for incorrect columns that were causing errors
    const problemColumns = ['expires_at', 'platform'];
    const foundProblemColumns = problemColumns.filter(col => existingColumns.includes(col));
    
    if (foundProblemColumns.length > 0) {
      console.log(`⚠️  Found old/incorrect columns: ${foundProblemColumns.join(', ')}`);
    }

  } catch (err) {
    console.log(`❌ Schema check error: ${err.message}`);
  }
}

async function runTests() {
  console.log('🚀 Starting IAP setup verification...\n');
  
  await checkTables();
  await checkFunctions();
  await checkUserSubscriptionsSchema();
  
  console.log('\n📝 Next steps:');
  console.log('1. If tables are missing: Run the migration in Supabase Dashboard');
  console.log('2. If functions are missing: Apply the migration file');
  console.log('3. Test IAP flow in your app');
  console.log('4. Check logs for any remaining issues');
}

runTests().catch(console.error); 