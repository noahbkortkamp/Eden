const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // This should be your service role key, not anon key
);

async function deleteTestUser() {
  const testEmail = 'gepetteng@gmail.com';
  
  console.log(`🗑️ Deleting test user: ${testEmail}`);
  
  try {
    // First, find the user ID
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError);
      return;
    }
    
    const targetUser = authUsers.users.find(user => user.email === testEmail);
    
    if (!targetUser) {
      console.log(`ℹ️ User ${testEmail} not found in auth.users`);
      return;
    }
    
    console.log(`📍 Found user: ${targetUser.id} (${targetUser.email})`);
    console.log(`📊 User metadata:`, targetUser.user_metadata);
    console.log(`🔗 Provider: ${targetUser.app_metadata?.provider || 'email'}`);
    
    // Delete from users table first (if exists)
    const { error: profileError } = await supabase
      .from('users')
      .delete()
      .eq('id', targetUser.id);
    
    if (profileError) {
      console.log(`⚠️ Error deleting user profile (may not exist):`, profileError.message);
    } else {
      console.log(`✅ Deleted user profile from users table`);
    }
    
    // Delete any reviews by this user
    const { error: reviewsError } = await supabase
      .from('reviews')
      .delete()
      .eq('user_id', targetUser.id);
    
    if (reviewsError) {
      console.log(`⚠️ Error deleting user reviews:`, reviewsError.message);
    } else {
      console.log(`✅ Deleted user reviews`);
    }
    
    // Delete any follows involving this user
    const { error: followsError1 } = await supabase
      .from('follows')
      .delete()
      .or(`follower_id.eq.${targetUser.id},following_id.eq.${targetUser.id}`);
    
    if (followsError1) {
      console.log(`⚠️ Error deleting user follows:`, followsError1.message);
    } else {
      console.log(`✅ Deleted user follows`);
    }
    
    // Finally, delete from auth.users
    const { error: authError } = await supabase.auth.admin.deleteUser(targetUser.id);
    
    if (authError) {
      console.error(`❌ Error deleting user from auth:`, authError);
      return;
    }
    
    console.log(`✅ Successfully deleted user ${testEmail} (${targetUser.id})`);
    console.log(`🎯 User can now be recreated to test the new Apple Sign-In onboarding flow`);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the deletion
deleteTestUser().then(() => {
  console.log('🏁 Script completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
}); 