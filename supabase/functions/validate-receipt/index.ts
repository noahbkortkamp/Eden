import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface AppleReceiptValidationRequest {
  receiptData: string;
  password?: string; // App Store shared secret
  excludeOldTransactions?: boolean;
}

interface GooglePlayReceiptValidationRequest {
  packageName: string;
  productId: string;
  purchaseToken: string;
}

interface ValidationRequest {
  platform: 'ios' | 'android';
  receiptData: string;
  productId: string;
  userId: string;
  environment?: 'sandbox' | 'production';
  // Apple specific
  sharedSecret?: string;
  // Android specific
  packageName?: string;
  purchaseToken?: string;
}

async function validateAppleReceipt(
  receiptData: string,
  sharedSecret?: string,
  environment: 'sandbox' | 'production' = 'sandbox'
): Promise<any> {
  const validationUrl = environment === 'production'
    ? 'https://buy.itunes.apple.com/verifyReceipt'
    : 'https://sandbox.itunes.apple.com/verifyReceipt';

  const requestBody: AppleReceiptValidationRequest = {
    'receipt-data': receiptData,
    password: sharedSecret,
    'exclude-old-transactions': true,
  };

  try {
    const response = await fetch(validationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();
    
    // Handle sandbox fallback for production receipts
    if (result.status === 21007 && environment === 'production') {
      console.log('Production receipt submitted to production, trying sandbox...');
      return await validateAppleReceipt(receiptData, sharedSecret, 'sandbox');
    }

    return result;
  } catch (error) {
    console.error('Apple receipt validation error:', error);
    throw new Error(`Apple validation failed: ${error.message}`);
  }
}

async function validateGooglePlayReceipt(
  packageName: string,
  productId: string,
  purchaseToken: string
): Promise<any> {
  // Note: Google Play Console API validation requires OAuth 2.0 setup
  // For production, you would need to:
  // 1. Set up a service account in Google Play Console
  // 2. Store the service account key securely
  // 3. Use Google APIs client library for authentication
  
  // For now, return a mock successful validation
  // In production, implement proper Google Play validation
  console.log('Google Play validation not yet implemented - using mock validation');
  
  return {
    valid: true,
    productId,
    purchaseToken,
    // Mock data - replace with actual Google Play API response
    purchaseTime: Date.now(),
    purchaseState: 1, // Purchased
    consumptionState: 0, // Yet to be consumed
    acknowledgementState: 1, // Acknowledged
  };
}

async function storeValidatedReceipt(
  supabase: any,
  userId: string,
  productId: string,
  transactionId: string,
  receiptData: string,
  validationResult: any,
  environment: 'sandbox' | 'production'
): Promise<any> {
  try {
    // Store receipt in purchase_receipts table
    const { data: receipt, error: receiptError } = await supabase
      .from('purchase_receipts')
      .insert({
        user_id: userId,
        transaction_id: transactionId,
        receipt_data: receiptData,
        product_id: productId,
        purchase_date: new Date(),
        is_validated: true,
        validation_timestamp: new Date(),
        environment: environment,
      })
      .select()
      .single();

    if (receiptError) {
      console.error('Error storing receipt:', receiptError);
      throw receiptError;
    }

    // Update or create subscription status
    const expirationDate = validationResult.latest_receipt_info?.[0]?.expires_date_ms
      ? new Date(parseInt(validationResult.latest_receipt_info[0].expires_date_ms))
      : null;

    const { data: subscription, error: subscriptionError } = await supabase
      .rpc('update_subscription_status', {
        user_id: userId,
        product_id: productId,
        new_status: 'active',
        expiration_date: expirationDate,
        transaction_id: transactionId,
        receipt_data: receiptData,
      });

    if (subscriptionError) {
      console.error('Error updating subscription:', subscriptionError);
      throw subscriptionError;
    }

    return { receipt, subscription };
  } catch (error) {
    console.error('Error in storeValidatedReceipt:', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify the request method
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the user from the JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse the request body
    const validationRequest: ValidationRequest = await req.json();

    // Validate required fields
    if (!validationRequest.platform || !validationRequest.receiptData || !validationRequest.productId) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: platform, receiptData, productId' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    let validationResult: any;
    let transactionId: string;

    // Validate based on platform
    if (validationRequest.platform === 'ios') {
      validationResult = await validateAppleReceipt(
        validationRequest.receiptData,
        validationRequest.sharedSecret,
        validationRequest.environment || 'sandbox'
      );

      if (validationResult.status !== 0) {
        return new Response(
          JSON.stringify({ 
            error: 'Receipt validation failed',
            details: validationResult
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // Extract transaction ID from Apple response
      transactionId = validationResult.latest_receipt_info?.[0]?.transaction_id || 
                     validationResult.receipt?.in_app?.[0]?.transaction_id;

    } else if (validationRequest.platform === 'android') {
      if (!validationRequest.packageName || !validationRequest.purchaseToken) {
        return new Response(
          JSON.stringify({ 
            error: 'Missing required Android fields: packageName, purchaseToken' 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      validationResult = await validateGooglePlayReceipt(
        validationRequest.packageName,
        validationRequest.productId,
        validationRequest.purchaseToken
      );

      if (!validationResult.valid) {
        return new Response(
          JSON.stringify({ 
            error: 'Google Play receipt validation failed',
            details: validationResult
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      transactionId = validationRequest.purchaseToken;

    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid platform. Must be "ios" or "android"' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Store the validated receipt and update subscription
    const result = await storeValidatedReceipt(
      supabase,
      user.id,
      validationRequest.productId,
      transactionId,
      validationRequest.receiptData,
      validationResult,
      validationRequest.environment || 'sandbox'
    );

    // Log the successful validation event
    await supabase.rpc('log_subscription_event', {
      user_id: user.id,
      event_type: 'receipt_validated',
      event_data: {
        platform: validationRequest.platform,
        product_id: validationRequest.productId,
        transaction_id: transactionId,
        environment: validationRequest.environment || 'sandbox',
      },
      product_id: validationRequest.productId,
      transaction_id: transactionId,
    });

    return new Response(
      JSON.stringify({
        success: true,
        platform: validationRequest.platform,
        productId: validationRequest.productId,
        transactionId: transactionId,
        validationResult: {
          isValid: true,
          receipt: result.receipt,
          subscription: result.subscription,
        },
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Receipt validation error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}); 