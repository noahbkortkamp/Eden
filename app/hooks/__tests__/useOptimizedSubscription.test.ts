import { renderHook, waitFor } from '@testing-library/react-native';
import { useOptimizedSubscription } from '../useOptimizedSubscription';

// Mock the supabase client
const mockChannel = {
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn().mockReturnValue(Promise.resolve()),
  unsubscribe: jest.fn(),
};

const mockSupabase = {
  channel: jest.fn(() => mockChannel),
  removeChannel: jest.fn(),
};

jest.mock('../../utils/supabase', () => ({
  supabase: mockSupabase,
}));

describe('useOptimizedSubscription', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not create subscription when userId is null', () => {
    renderHook(() => 
      useOptimizedSubscription({
        channelName: 'test-channel',
        userId: null,
        subscriptions: [
          {
            table: 'test_table',
            event: 'INSERT',
            onPayload: jest.fn(),
          },
        ],
      })
    );

    expect(mockSupabase.channel).not.toHaveBeenCalled();
  });

  it('should not create subscription when enabled is false', () => {
    renderHook(() => 
      useOptimizedSubscription({
        channelName: 'test-channel',
        userId: 'user123',
        enabled: false,
        subscriptions: [
          {
            table: 'test_table',
            event: 'INSERT',
            onPayload: jest.fn(),
          },
        ],
      })
    );

    expect(mockSupabase.channel).not.toHaveBeenCalled();
  });

  it('should create subscription when enabled and userId provided', async () => {
    const onPayload = jest.fn();
    
    renderHook(() => 
      useOptimizedSubscription({
        channelName: 'test-channel',
        userId: 'user123',
        subscriptions: [
          {
            table: 'test_table',
            event: 'INSERT',
            onPayload,
          },
        ],
      })
    );

    await waitFor(() => {
      expect(mockSupabase.channel).toHaveBeenCalledWith(
        expect.stringContaining('test-channel_user123_')
      );
    });

    expect(mockChannel.on).toHaveBeenCalledWith(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'test_table',
      },
      expect.any(Function)
    );

    expect(mockChannel.subscribe).toHaveBeenCalled();
  });

  it('should handle multiple subscriptions on same channel', async () => {
    const onPayload1 = jest.fn();
    const onPayload2 = jest.fn();
    
    renderHook(() => 
      useOptimizedSubscription({
        channelName: 'test-channel',
        userId: 'user123',
        subscriptions: [
          {
            table: 'table1',
            event: 'INSERT',
            onPayload: onPayload1,
          },
          {
            table: 'table2',
            event: 'UPDATE',
            onPayload: onPayload2,
          },
        ],
      })
    );

    await waitFor(() => {
      expect(mockChannel.on).toHaveBeenCalledTimes(2);
    });

    expect(mockChannel.on).toHaveBeenNthCalledWith(1,
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'table1',
      },
      expect.any(Function)
    );

    expect(mockChannel.on).toHaveBeenNthCalledWith(2,
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'table2',
      },
      expect.any(Function)
    );
  });

  it('should cleanup subscription on unmount', async () => {
    const { unmount } = renderHook(() => 
      useOptimizedSubscription({
        channelName: 'test-channel',
        userId: 'user123',
        subscriptions: [
          {
            table: 'test_table',
            event: 'INSERT',
            onPayload: jest.fn(),
          },
        ],
      })
    );

    await waitFor(() => {
      expect(mockSupabase.channel).toHaveBeenCalled();
    });

    unmount();

    expect(mockChannel.unsubscribe).toHaveBeenCalled();
    expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel);
  });

  it('should provide manual retry function', async () => {
    const { result } = renderHook(() => 
      useOptimizedSubscription({
        channelName: 'test-channel',
        userId: 'user123',
        subscriptions: [
          {
            table: 'test_table',
            event: 'INSERT',
            onPayload: jest.fn(),
          },
        ],
      })
    );

    await waitFor(() => {
      expect(result.current.manualRetry).toBeDefined();
    });

    // Should be able to call retry without errors
    expect(() => result.current.manualRetry()).not.toThrow();
  });
}); 