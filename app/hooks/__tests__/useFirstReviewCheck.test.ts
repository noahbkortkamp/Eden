import { renderHook, waitFor } from '@testing-library/react-native';
import { useFirstReviewCheck } from '../useFirstReviewCheck';
import { reviewService } from '../../services/reviewService';
import { userService } from '../../services/userService';

// Mock the services
jest.mock('../../services/reviewService');
jest.mock('../../services/userService');
jest.mock('../../utils/errorHandling', () => ({
  errorHandler: {
    handle: jest.fn((error) => ({ message: error.message || 'Test error' }))
  }
}));

const mockReviewService = reviewService as jest.Mocked<typeof reviewService>;
const mockUserService = userService as jest.Mocked<typeof userService>;

describe('useFirstReviewCheck', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns initial state when userId is null', () => {
    const { result } = renderHook(() => useFirstReviewCheck(null));

    expect(result.current).toEqual({
      reviewCount: null,
      hasCompletedFirstReview: null,
      needsFirstReview: false,
      loading: false,
      error: null
    });
  });

  it('fetches and returns review status for valid userId', async () => {
    const userId = 'user123';
    mockReviewService.getUserReviewCount.mockResolvedValue(0);
    mockUserService.hasCompletedFirstReview.mockResolvedValue(false);

    const { result } = renderHook(() => useFirstReviewCheck(userId));

    // Initially loading
    expect(result.current.loading).toBe(true);

    // Wait for async operations to complete
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current).toEqual({
      reviewCount: 0,
      hasCompletedFirstReview: false,
      needsFirstReview: true,
      loading: false,
      error: null
    });

    expect(mockReviewService.getUserReviewCount).toHaveBeenCalledWith(userId);
    expect(mockUserService.hasCompletedFirstReview).toHaveBeenCalledWith(userId);
  });

  it('correctly identifies user who does NOT need first review (has reviews)', async () => {
    const userId = 'user123';
    mockReviewService.getUserReviewCount.mockResolvedValue(5);
    mockUserService.hasCompletedFirstReview.mockResolvedValue(true);

    const { result } = renderHook(() => useFirstReviewCheck(userId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current).toEqual({
      reviewCount: 5,
      hasCompletedFirstReview: true,
      needsFirstReview: false,
      loading: false,
      error: null
    });
  });

  it('correctly identifies user who does NOT need first review (completed flag set)', async () => {
    const userId = 'user123';
    mockReviewService.getUserReviewCount.mockResolvedValue(0);
    mockUserService.hasCompletedFirstReview.mockResolvedValue(true);

    const { result } = renderHook(() => useFirstReviewCheck(userId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current).toEqual({
      reviewCount: 0,
      hasCompletedFirstReview: true,
      needsFirstReview: false,
      loading: false,
      error: null
    });
  });

  it('handles service errors gracefully', async () => {
    const userId = 'user123';
    const errorMessage = 'Service unavailable';
    mockReviewService.getUserReviewCount.mockRejectedValue(new Error(errorMessage));
    mockUserService.hasCompletedFirstReview.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() => useFirstReviewCheck(userId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(errorMessage);
    expect(result.current.reviewCount).toBe(null);
    expect(result.current.hasCompletedFirstReview).toBe(null);
    expect(result.current.needsFirstReview).toBe(false);
  });

  it('resets state when userId changes', async () => {
    const { result, rerender } = renderHook(
      ({ userId }) => useFirstReviewCheck(userId),
      { initialProps: { userId: 'user1' } }
    );

    mockReviewService.getUserReviewCount.mockResolvedValue(3);
    mockUserService.hasCompletedFirstReview.mockResolvedValue(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.reviewCount).toBe(3);

    // Change userId
    rerender({ userId: 'user2' });

    // Should reset to initial state and start loading again
    expect(result.current.loading).toBe(true);
  });

  it('resets state when userId becomes null', async () => {
    const { result, rerender } = renderHook(
      ({ userId }) => useFirstReviewCheck(userId),
      { initialProps: { userId: 'user1' } }
    );

    mockReviewService.getUserReviewCount.mockResolvedValue(2);
    mockUserService.hasCompletedFirstReview.mockResolvedValue(false);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Change to null userId
    rerender({ userId: null });

    expect(result.current).toEqual({
      reviewCount: null,
      hasCompletedFirstReview: null,
      needsFirstReview: false,
      loading: false,
      error: null
    });
  });

  it('handles component unmount during async operations', async () => {
    const userId = 'user123';
    let resolvePromise: (value: number) => void;
    const promise = new Promise<number>((resolve) => {
      resolvePromise = resolve;
    });

    mockReviewService.getUserReviewCount.mockReturnValue(promise);
    mockUserService.hasCompletedFirstReview.mockResolvedValue(false);

    const { result, unmount } = renderHook(() => useFirstReviewCheck(userId));

    expect(result.current.loading).toBe(true);

    // Unmount before promise resolves
    unmount();

    // Resolve promise after unmount
    resolvePromise!(1);

    // Should not update state after unmount
    expect(result.current.loading).toBe(true);
  });

  it('runs both service calls in parallel', async () => {
    const userId = 'user123';
    const startTime = Date.now();
    
    mockReviewService.getUserReviewCount.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return 0;
    });
    
    mockUserService.hasCompletedFirstReview.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return false;
    });

    const { result } = renderHook(() => useFirstReviewCheck(userId));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should complete in ~50ms (parallel) rather than ~100ms (sequential)
    expect(duration).toBeLessThan(80);
    expect(mockReviewService.getUserReviewCount).toHaveBeenCalledWith(userId);
    expect(mockUserService.hasCompletedFirstReview).toHaveBeenCalledWith(userId);
  });
}); 