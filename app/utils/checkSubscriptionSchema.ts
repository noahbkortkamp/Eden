import { supabase } from './supabase';

/**
 * Check if subscription system tables and functions exist
 */
export async function checkSubscriptionSchema(): Promise<{
  tablesExist: boolean;
  functionsExist: boolean;
  errors: string[];
  recommendations: string[];
}> {
  const errors: string[] = [];
  const recommendations: string[] = [];

  try {
    console.log('🔍 Checking subscription schema...');

    // Check if tables exist
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', [
        'user_subscriptions',
        'purchase_receipts', 
        'subscription_events',
        'premium_feature_usage'
      ]);

    if (tablesError) {
      errors.push(`Error checking tables: ${tablesError.message}`);
    }

    const tablesExist = tables && tables.length === 4;
    
    if (!tablesExist) {
      const existingTables = tables?.map(t => t.table_name) || [];
      const missingTables = [
        'user_subscriptions',
        'purchase_receipts', 
        'subscription_events',
        'premium_feature_usage'
      ].filter(table => !existingTables.includes(table));
      
      errors.push(`Missing tables: ${missingTables.join(', ')}`);
      recommendations.push('Run the subscription migration: supabase/migrations/20250620_add_subscription_system.sql');
    }

    // Check if functions exist
    const { data: functions, error: functionsError } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .eq('routine_schema', 'public')
      .in('routine_name', [
        'validate_subscription_status',
        'check_feature_access',
        'log_subscription_event',
        'track_feature_usage',
        'update_subscription_status'
      ]);

    if (functionsError) {
      errors.push(`Error checking functions: ${functionsError.message}`);
    }

    const functionsExist = functions && functions.length === 5;
    
    if (!functionsExist) {
      const existingFunctions = functions?.map(f => f.routine_name) || [];
      const missingFunctions = [
        'validate_subscription_status',
        'check_feature_access',
        'log_subscription_event',
        'track_feature_usage',
        'update_subscription_status'
      ].filter(func => !existingFunctions.includes(func));
      
      errors.push(`Missing functions: ${missingFunctions.join(', ')}`);
      recommendations.push('Functions need to be created from the migration file');
    }

    // Test a simple query to user_subscriptions if table exists
    if (tablesExist) {
      try {
        await supabase.from('user_subscriptions').select('id').limit(1);
        console.log('✅ user_subscriptions table accessible');
      } catch (queryError) {
        errors.push(`user_subscriptions table not accessible: ${queryError}`);
        recommendations.push('Check RLS policies and table permissions');
      }
    }

    return {
      tablesExist,
      functionsExist,
      errors,
      recommendations
    };

  } catch (error) {
    console.error('Failed to check subscription schema:', error);
    return {
      tablesExist: false,
      functionsExist: false,
      errors: [`Schema check failed: ${error}`],
      recommendations: ['Check database connection and permissions']
    };
  }
}

/**
 * Test subscription functionality
 */
export async function testSubscriptionFunctionality(userId: string): Promise<{
  success: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  try {
    console.log('🧪 Testing subscription functionality...');

    // Test validate_subscription_status function
    const { data: statusData, error: statusError } = await supabase
      .rpc('validate_subscription_status', { user_id: userId });

    if (statusError) {
      errors.push(`validate_subscription_status failed: ${statusError.message}`);
    } else {
      console.log('✅ validate_subscription_status working');
    }

    // Test check_feature_access function
    const { data: accessData, error: accessError } = await supabase
      .rpc('check_feature_access', { 
        user_id: userId, 
        feature_name: 'unlimited_reviews' 
      });

    if (accessError) {
      errors.push(`check_feature_access failed: ${accessError.message}`);
    } else {
      console.log('✅ check_feature_access working');
    }

    return {
      success: errors.length === 0,
      errors
    };

  } catch (error) {
    return {
      success: false,
      errors: [`Functionality test failed: ${error}`]
    };
  }
} 