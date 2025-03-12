#!/usr/bin/env node
// Script to fix missing user profiles by creating them for auth users
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Get Supabase credentials
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Validate credentials
if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase credentials');
  console.error('Please ensure your .env file has EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

// Create Supabase client with admin privileges (to access auth schema)
const supabase = createClient(supabaseUrl, supabaseKey);

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

async function getMissingProfiles() {
  console.log(`${colors.cyan}Finding auth users with missing profiles...${colors.reset}`);
  
  try {
    // Option 1: Use RPC function if available
    try {
      const { data: missingUsers, error: rpcError } = await supabase
        .rpc('get_auth_users_without_profiles');
        
      if (!rpcError && Array.isArray(missingUsers)) {
        console.log(`${colors.green}Found ${missingUsers.length} users with missing profiles via RPC function${colors.reset}`);
        return missingUsers;
      }
    } catch (e) {
      console.log(`${colors.yellow}RPC function not available, using direct query...${colors.reset}`);
    }
    
    // Option 2: Direct query approach
    // This query checks for auth users without corresponding public profiles
    const { data: authUsers, error: authError } = await supabase
      .from('auth.users')
      .select('id, email, raw_user_meta_data')
      .limit(100);
      
    if (authError) {
      // Access to auth schema might be restricted, try another approach
      console.log(`${colors.yellow}Cannot directly query auth.users, trying fallback...${colors.reset}`);
      
      // Option 3: Use list of IDs if auth.users is not accessible
      const { data: reviewUsers, error: reviewError } = await supabase
        .from('reviews')
        .select('user_id');
        
      if (reviewError) {
        throw new Error(`Cannot query reviews: ${reviewError.message}`);
      }
      
      // Get unique user IDs from reviews
      const userIds = [...new Set(reviewUsers.map(r => r.user_id))];
      
      // Find which of these IDs are missing profiles
      const { data: existingProfiles, error: profileError } = await supabase
        .from('users')
        .select('id')
        .in('id', userIds);
        
      if (profileError) {
        throw new Error(`Cannot query profiles: ${profileError.message}`);
      }
      
      const existingIds = new Set(existingProfiles.map(p => p.id));
      const missingIds = userIds.filter(id => !existingIds.has(id));
      
      console.log(`${colors.green}Found ${missingIds.length} user IDs with missing profiles${colors.reset}`);
      
      // Convert to expected format
      return missingIds.map(id => ({ id }));
    }
    
    if (!authUsers) {
      console.log(`${colors.yellow}No auth users found or access denied${colors.reset}`);
      return [];
    }
    
    // Now check which auth users don't have corresponding public profiles
    const { data: publicUsers, error: publicError } = await supabase
      .from('users')
      .select('id');
      
    if (publicError) {
      throw new Error(`Cannot query public users: ${publicError.message}`);
    }
    
    const publicUserIds = new Set(publicUsers.map(u => u.id));
    const missingProfiles = authUsers.filter(user => !publicUserIds.has(user.id));
    
    console.log(`${colors.green}Found ${missingProfiles.length} auth users with missing profiles${colors.reset}`);
    return missingProfiles;
  } catch (error) {
    console.error(`${colors.red}Error finding missing profiles:${colors.reset}`, error);
    return [];
  }
}

async function createMissingProfiles(missingUsers) {
  console.log(`${colors.cyan}Creating ${missingUsers.length} missing user profiles...${colors.reset}`);
  let createdCount = 0;
  
  for (const user of missingUsers) {
    try {
      // Generate a random username
      const randomUsername = `user_${Math.random().toString(36).substring(2, 10)}`;
      
      // Extract name from metadata if available
      const fullName = user.raw_user_meta_data?.name || 
                      user.raw_user_meta_data?.full_name || 
                      'Golf Enthusiast';
      
      // Create the user profile
      const { data, error } = await supabase
        .from('users')
        .insert({
          id: user.id,
          username: randomUsername,
          full_name: fullName,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (error) {
        if (error.code === '23505') { // Duplicate key error
          console.log(`${colors.yellow}Profile for ${user.id} already exists (race condition)${colors.reset}`);
          createdCount++;
        } else {
          console.error(`${colors.red}Error creating profile for ${user.id}:${colors.reset}`, error);
        }
      } else {
        console.log(`${colors.green}Created profile for ${user.id} with username ${data.username}${colors.reset}`);
        createdCount++;
      }
    } catch (error) {
      console.error(`${colors.red}Exception creating profile for ${user.id}:${colors.reset}`, error);
    }
  }
  
  return createdCount;
}

async function fixTrigger() {
  console.log(`${colors.cyan}Setting up or repairing user creation trigger...${colors.reset}`);
  
  try {
    // First, check if the handle_new_user function exists
    const { data: functionExists, error: functionError } = await supabase
      .rpc('function_exists', { func_name: 'handle_new_user' });
      
    if (functionError && !functionError.message.includes('function "function_exists" does not exist')) {
      console.error(`${colors.red}Error checking function:${colors.reset}`, functionError);
    }
    
    // If we can't check or the function doesn't exist, try to create it
    if (functionError || !functionExists) {
      console.log(`${colors.yellow}Creating/updating handle_new_user function...${colors.reset}`);
      
      // Execute SQL to create the function
      const { error: createFunctionError } = await supabase
        .rpc('exec_sql', { 
          sql: `
          CREATE OR REPLACE FUNCTION public.handle_new_user()
          RETURNS trigger
          LANGUAGE plpgsql
          SECURITY DEFINER SET search_path = public
          AS $$
          DECLARE
            random_username TEXT;
          BEGIN
            -- Generate a random username
            random_username := 'user_' || substr(md5(random()::text), 1, 8);
            
            -- Insert a new record into public.users
            INSERT INTO public.users (id, username, full_name, created_at, updated_at)
            VALUES (
              NEW.id, 
              random_username,
              COALESCE(NEW.raw_user_meta_data->>'full_name', 'Golf Enthusiast'),
              NOW(),
              NOW()
            )
            ON CONFLICT (id) DO NOTHING;
            
            RETURN NEW;
          END;
          $$;
          `
        });
        
      if (createFunctionError) {
        if (!createFunctionError.message.includes('function "exec_sql" does not exist')) {
          console.error(`${colors.red}Error creating function:${colors.reset}`, createFunctionError);
        } else {
          console.log(`${colors.yellow}Cannot create function through RPC. Please run SQL script manually.${colors.reset}`);
        }
      } else {
        console.log(`${colors.green}Created/updated handle_new_user function${colors.reset}`);
      }
    } else {
      console.log(`${colors.green}handle_new_user function exists${colors.reset}`);
    }
    
    // Now check/create the trigger
    const { data: triggerExists, error: triggerError } = await supabase
      .rpc('trigger_exists', { trigger_name: 'on_auth_user_created' });
      
    if (triggerError && !triggerError.message.includes('function "trigger_exists" does not exist')) {
      console.error(`${colors.red}Error checking trigger:${colors.reset}`, triggerError);
    }
    
    if (triggerError || !triggerExists) {
      console.log(`${colors.yellow}Creating user creation trigger...${colors.reset}`);
      
      // Execute SQL to create the trigger
      const { error: createTriggerError } = await supabase
        .rpc('exec_sql', { 
          sql: `
          DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
          
          CREATE TRIGGER on_auth_user_created
          AFTER INSERT ON auth.users
          FOR EACH ROW
          EXECUTE FUNCTION public.handle_new_user();
          `
        });
        
      if (createTriggerError) {
        if (!createTriggerError.message.includes('function "exec_sql" does not exist')) {
          console.error(`${colors.red}Error creating trigger:${colors.reset}`, createTriggerError);
        } else {
          console.log(`${colors.yellow}Cannot create trigger through RPC. Please run SQL script manually.${colors.reset}`);
        }
      } else {
        console.log(`${colors.green}Created user creation trigger${colors.reset}`);
      }
    } else {
      console.log(`${colors.green}on_auth_user_created trigger exists${colors.reset}`);
    }
    
    return true;
  } catch (error) {
    console.error(`${colors.red}Error setting up trigger:${colors.reset}`, error);
    return false;
  }
}

async function main() {
  console.log(`${colors.magenta}======================================${colors.reset}`);
  console.log(`${colors.magenta}     USER PROFILE FIX UTILITY     ${colors.reset}`);
  console.log(`${colors.magenta}======================================${colors.reset}`);
  
  // Find missing profiles
  const missingUsers = await getMissingProfiles();
  
  if (missingUsers.length === 0) {
    console.log(`${colors.green}No missing profiles found!${colors.reset}`);
  } else {
    // Create missing profiles
    const createdCount = await createMissingProfiles(missingUsers);
    console.log(`${colors.green}Created ${createdCount} out of ${missingUsers.length} missing profiles${colors.reset}`);
  }
  
  // Setup/fix the trigger for future users
  const triggerFixed = await fixTrigger();
  
  console.log(`${colors.magenta}======================================${colors.reset}`);
  console.log(`${colors.magenta}              SUMMARY              ${colors.reset}`);
  console.log(`${colors.magenta}======================================${colors.reset}`);
  console.log(`Missing profiles found: ${missingUsers.length}`);
  console.log(`Profiles created: ${missingUsers.length > 0 ? `${(await createMissingProfiles(missingUsers))} / ${missingUsers.length}` : 'N/A'}`);
  console.log(`Trigger setup: ${triggerFixed ? colors.green + 'SUCCESS' : colors.red + 'FAILED'}`);
  console.log(`${colors.reset}`);
  
  console.log(`${colors.cyan}Next steps:${colors.reset}`);
  console.log(`1. Run the fix-all-issues.sql script in Supabase SQL Editor`);
  console.log(`2. Restart your application`);
  console.log(`3. Try submitting a review again`);
}

// Run the script
main().catch(error => {
  console.error(`${colors.red}Unhandled error:${colors.reset}`, error);
  process.exit(1);
}).finally(() => {
  // Process doesn't always exit cleanly with Supabase client
  setTimeout(() => process.exit(0), 1000);
}); 