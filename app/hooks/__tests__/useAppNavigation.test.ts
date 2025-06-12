import { renderHook, waitFor } from '@testing-library/react-native';
import { useAppNavigation } from '../useAppNavigation';
import { User } from '@supabase/supabase-js';

// Mock the dependencies
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    replace: jest.fn()
  }))
}));

jest.mock('../useFirstReviewCheck');

import { useRouter } from 'expo-router';
import { useFirstReviewCheck } from '../useFirstReviewCheck';

const mockRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseFirstReviewCheck = useFirstReviewCheck as jest.MockedFunction<typeof useFirstReviewCheck>;

describe('useAppNavigation', () => {
  const mockReplace = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockRouter.mockReturnValue({ replace: mockReplace } as any);
    
    // Default mock for useFirstReviewCheck
    mockUseFirstReviewCheck.mockReturnValue({
      reviewCount: null,
      hasCompletedFirstReview: null,
      needsFirstReview: false,
      loading: false,
      error: null
    });
  });

  const createMockUser = (onboardingComplete: boolean = true): User => ({
    id: 'user123',
    email: 'test@example.com',
    user_metadata: {
      onboardingComplete
    }
  } as User);

  it('shows loading when auth is loading', () => {
    const { result } = renderHook(() => 
      useAppNavigation({ user: null, loading: true })
    );

    expect(result.current.shouldShowLoading).toBe(true);
    expect(result.current.navigationState).toBe('idle');
    expect(result.current.error).toBe(null);
  });

  it('navigates to welcome when no user is present', async () => {
    const { result } = renderHook(() => 
      useAppNavigation({ user: null, loading: false })
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/auth/welcome');
    });

    expect(result.current.navigationState).toBe('navigating');
  });

  it('navigates to onboarding when user profile is incomplete', async () => {
    const user = createMockUser(false); // onboardingComplete = false

    const { result } = renderHook(() => 
      useAppNavigation({ user, loading: false })
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/onboarding/profile-info');
    });

    expect(result.current.navigationState).toBe('navigating');
  });

  it('navigates to first review when user needs first review', async () => {
    const user = createMockUser(true);
    
    mockUseFirstReviewCheck.mockReturnValue({
      reviewCount: 0,
      hasCompletedFirstReview: false,
      needsFirstReview: true,
      loading: false,
      error: null
    });

    const { result } = renderHook(() => 
      useAppNavigation({ user, loading: false })
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/auth/first-review');
    });

    expect(result.current.navigationState).toBe('navigating');
  });

  it('navigates to main app when user is ready', async () => {
    const user = createMockUser(true);
    
    mockUseFirstReviewCheck.mockReturnValue({
      reviewCount: 5,
      hasCompletedFirstReview: true,
      needsFirstReview: false,
      loading: false,
      error: null
    });

    const { result } = renderHook(() => 
      useAppNavigation({ user, loading: false })
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)/lists');
    });

    expect(result.current.navigationState).toBe('navigating');
  });

  it('waits for first review check to complete before navigating', () => {
    const user = createMockUser(true);
    
    mockUseFirstReviewCheck.mockReturnValue({
      reviewCount: null,
      hasCompletedFirstReview: null,
      needsFirstReview: false,
      loading: true,
      error: null
    });

    const { result } = renderHook(() => 
      useAppNavigation({ user, loading: false })
    );

    expect(result.current.shouldShowLoading).toBe(true);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('handles navigation errors gracefully', async () => {
    const user = createMockUser(true);
    const errorMessage = 'Navigation failed';
    
    mockReplace.mockRejectedValue(new Error(errorMessage));
    mockUseFirstReviewCheck.mockReturnValue({
      reviewCount: 5,
      hasCompletedFirstReview: true,
      needsFirstReview: false,
      loading: false,
      error: null
    });

    const { result } = renderHook(() => 
      useAppNavigation({ user, loading: false })
    );

    await waitFor(() => {
      expect(result.current.error).toBe(errorMessage);
    });

    expect(result.current.navigationState).toBe('idle');
  });

  it('includes first review check errors in overall error state', () => {
    const user = createMockUser(true);
    const errorMessage = 'First review check failed';
    
    mockUseFirstReviewCheck.mockReturnValue({
      reviewCount: null,
      hasCompletedFirstReview: null,
      needsFirstReview: false,
      loading: false,
      error: errorMessage
    });

    const { result } = renderHook(() => 
      useAppNavigation({ user, loading: false })
    );

    expect(result.current.error).toBe(errorMessage);
  });

  it('prevents duplicate navigation calls', async () => {
    const user = createMockUser(true);
    
    mockUseFirstReviewCheck.mockReturnValue({
      reviewCount: 5,
      hasCompletedFirstReview: true,
      needsFirstReview: false,
      loading: false,
      error: null
    });

    const { result, rerender } = renderHook(
      ({ user, loading }) => useAppNavigation({ user, loading }),
      { initialProps: { user, loading: false } }
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)/lists');
    });

    mockReplace.mockClear();

    // Rerender with same props should not trigger navigation again
    rerender({ user, loading: false });

    await new Promise(resolve => setTimeout(resolve, 50));
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('resets navigation state when user changes', async () => {
    const user1 = createMockUser(true);
    const user2 = { ...createMockUser(true), id: 'user456' };
    
    mockUseFirstReviewCheck.mockReturnValue({
      reviewCount: 5,
      hasCompletedFirstReview: true,
      needsFirstReview: false,
      loading: false,
      error: null
    });

    const { result, rerender } = renderHook(
      ({ user, loading }) => useAppNavigation({ user, loading }),
      { initialProps: { user: user1, loading: false } }
    );

    await waitFor(() => {
      expect(result.current.navigationState).toBe('navigating');
    });

    mockReplace.mockClear();

    // Change user should reset navigation state
    rerender({ user: user2, loading: false });

    expect(result.current.navigationState).toBe('idle');
    
    // Should navigate again for new user
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)/lists');
    });
  });

  it('falls back to main app on navigation determination error', async () => {
    const user = createMockUser(true);
    
    // Mock first review check to throw error
    mockUseFirstReviewCheck.mockImplementation(() => {
      throw new Error('Service error');
    });

    const { result } = renderHook(() => 
      useAppNavigation({ user, loading: false })
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)/lists');
    });

    expect(result.current.error).toBeTruthy();
  });

  it('handles component unmount during navigation', async () => {
    const user = createMockUser(true);
    
    mockUseFirstReviewCheck.mockReturnValue({
      reviewCount: 5,
      hasCompletedFirstReview: true,
      needsFirstReview: false,
      loading: false,
      error: null
    });

    const { result, unmount } = renderHook(() => 
      useAppNavigation({ user, loading: false })
    );

    // Unmount immediately
    unmount();

    // Should not crash or cause state updates after unmount
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Navigation might have been called before unmount, but should not cause errors
    expect(() => result.current).not.toThrow();
  });

  it('shows loading during navigation transition', async () => {
    const user = createMockUser(true);
    
    mockUseFirstReviewCheck.mockReturnValue({
      reviewCount: 5,
      hasCompletedFirstReview: true,
      needsFirstReview: false,
      loading: false,
      error: null
    });

    const { result } = renderHook(() => 
      useAppNavigation({ user, loading: false })
    );

    // Should show loading during navigation
    expect(result.current.shouldShowLoading).toBe(true);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(tabs)/lists');
    });
  });
}); 