import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../utils/supabase';

type SubscriptionEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface SubscriptionConfig {
  table: string;
  event: SubscriptionEvent;
  schema?: string;
  filter?: string;
  onPayload: (payload: any) => void;
  onError?: (error: Error) => void;
}

interface UseOptimizedSubscriptionProps {
  channelName: string;
  subscriptions: SubscriptionConfig[];
  enabled?: boolean;
  userId?: string | null;
}

/**
 * Optimized subscription hook with built-in error handling and performance improvements
 * Prevents multiple subscriptions and provides stable subscription management
 */
export function useOptimizedSubscription({
  channelName,
  subscriptions,
  enabled = true,
  userId,
}: UseOptimizedSubscriptionProps) {
  const subscriptionRef = useRef<any>(null);
  const isActiveRef = useRef(false);
  const retriesRef = useRef(0);
  const maxRetries = 3;
  const retryDelay = 2000; // 2 seconds

  // Create stable channel name with unique identifier - only generate once per session
  const stableChannelNameRef = useRef<string | null>(null);
  
  const getStableChannelName = useCallback(() => {
    if (!stableChannelNameRef.current) {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      stableChannelNameRef.current = `${channelName}_${userId || 'anonymous'}_${timestamp}_${random}`;
    }
    return stableChannelNameRef.current;
  }, [channelName, userId]);

  // Reset channel name when userId or channelName changes
  useEffect(() => {
    stableChannelNameRef.current = null;
  }, [channelName, userId]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (subscriptionRef.current && isActiveRef.current) {
      console.log(`🧹 Cleaning up subscription: ${channelName}`);
      try {
        subscriptionRef.current.unsubscribe();
        supabase.removeChannel(subscriptionRef.current);
      } catch (err) {
        console.warn('Warning during subscription cleanup:', err);
      }
      subscriptionRef.current = null;
      isActiveRef.current = false;
    }
  }, [channelName]);

  // Setup subscription with error handling
  const setupSubscription = useCallback(() => {
    if (!enabled || !userId || isActiveRef.current) {
      return;
    }

    console.log(`🔄 Setting up optimized subscription: ${channelName}`);
    
    try {
      const uniqueChannelName = getStableChannelName();
      const channel = supabase.channel(uniqueChannelName);
      
      // Add all subscription configs to the channel
      subscriptions.forEach((config) => {
        channel.on(
          'postgres_changes',
          {
            event: config.event,
            schema: config.schema || 'public',
            table: config.table,
            ...(config.filter && { filter: config.filter }),
          },
          (payload) => {
            try {
              config.onPayload(payload);
            } catch (payloadError) {
              console.error(`Error processing payload for ${config.table}:`, payloadError);
              config.onError?.(payloadError as Error);
            }
          }
        );
      });

      // Subscribe with error handling
      channel
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log(`✅ Successfully subscribed to ${channelName}`);
            retriesRef.current = 0; // Reset retry count on success
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`❌ Channel error for ${channelName}`);
            handleSubscriptionError(new Error('Channel subscription error'));
          } else if (status === 'TIMED_OUT') {
            console.error(`⏰ Subscription timeout for ${channelName}`);
            handleSubscriptionError(new Error('Subscription timeout'));
          }
        });

      subscriptionRef.current = channel;
      isActiveRef.current = true;

    } catch (error) {
      console.error(`Failed to setup subscription ${channelName}:`, error);
      handleSubscriptionError(error as Error);
    }
  }, [enabled, userId, channelName, subscriptions, getStableChannelName]);

  // Handle subscription errors with retry logic
  const handleSubscriptionError = useCallback((error: Error) => {
    console.error(`Subscription error for ${channelName}:`, error);
    
    // Cleanup current subscription
    cleanup();
    
    // Notify error handlers
    subscriptions.forEach(config => {
      config.onError?.(error);
    });

    // Retry logic
    if (retriesRef.current < maxRetries) {
      retriesRef.current += 1;
      console.log(`🔄 Retrying subscription ${channelName} (${retriesRef.current}/${maxRetries})`);
      
      setTimeout(() => {
        if (enabled && userId) {
          setupSubscription();
        }
      }, retryDelay * retriesRef.current); // Exponential backoff
    } else {
      console.error(`❌ Max retries reached for subscription ${channelName}`);
    }
  }, [channelName, cleanup, subscriptions, enabled, userId, setupSubscription]);

  // Main effect for subscription management
  useEffect(() => {
    if (enabled && userId) {
      setupSubscription();
    }

    return cleanup;
  }, [enabled, userId, setupSubscription, cleanup]);

  // Return control functions
  return {
    isActive: isActiveRef.current,
    retryCount: retriesRef.current,
    manualRetry: useCallback(() => {
      if (enabled && userId) {
        cleanup();
        retriesRef.current = 0;
        setupSubscription();
      }
    }, [enabled, userId, cleanup, setupSubscription]),
    forceCleanup: cleanup,
  };
} 