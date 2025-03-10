import { signUp, signIn, signOut, getCurrentUser, getSession } from '../auth';
import { supabaseMock } from '../../__mocks__/supabase';

// Mock the supabase module to use our mock implementation
jest.mock('../../utils/supabase', () => ({
  supabase: supabaseMock,
}));

describe('Auth Service', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    supabaseMock.resetMockData();
    jest.clearAllMocks();
  });

  describe('signUp', () => {
    const signUpData = {
      email: 'new@example.com',
      password: 'password123',
      name: 'New User',
    };

    it('should successfully sign up a new user', async () => {
      // Act
      const result = await signUp(signUpData);

      // Assert
      expect(result.data).toBeTruthy();
      expect(result.error).toBeNull();
      expect(supabaseMock.auth.signUp).toHaveBeenCalledWith({
        email: signUpData.email,
        password: signUpData.password,
        options: expect.objectContaining({
          data: { name: signUpData.name },
          emailRedirectTo: expect.any(String)
        }),
      });
    });

    it('should handle sign up errors', async () => {
      // Arrange
      supabaseMock.setNextQueryToFail('Failed to sign up');

      // Act & Assert
      await expect(async () => {
        await signUp(signUpData);
      }).rejects.toThrow();
    });
  });

  describe('signIn', () => {
    const signInData = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should successfully sign in a user', async () => {
      // Act
      const result = await signIn(signInData);

      // Assert
      expect(result).toBeTruthy();
      expect(result.user).toBeTruthy();
      expect(supabaseMock.auth.signInWithPassword).toHaveBeenCalledWith({
        email: signInData.email,
        password: signInData.password,
      });
    });

    it('should handle sign in errors', async () => {
      // Arrange
      supabaseMock.setNextQueryToFail('Invalid credentials');

      // Act & Assert
      await expect(async () => {
        await signIn(signInData);
      }).rejects.toThrow();
    });
  });

  describe('signOut', () => {
    it('should successfully sign out a user', async () => {
      // Act
      await signOut();

      // Assert
      expect(supabaseMock.auth.signOut).toHaveBeenCalled();
    });

    it('should handle sign out errors', async () => {
      // Arrange
      supabaseMock.setNextQueryToFail('Failed to sign out');

      // Act & Assert
      await expect(async () => {
        await signOut();
      }).rejects.toThrow();
    });
  });

  describe('getCurrentUser', () => {
    it('should return the current user', async () => {
      // Act
      const user = await getCurrentUser();

      // Assert
      expect(user).toBeTruthy();
      expect(user?.id).toBe('user123');
      expect(supabaseMock.auth.getUser).toHaveBeenCalled();
    });

    it('should handle errors when getting current user', async () => {
      // Arrange
      supabaseMock.setNextQueryToFail('Failed to get user');

      // Act
      const user = await getCurrentUser();

      // Assert
      expect(user).toBeNull();
    });
  });

  describe('getSession', () => {
    it('should return the current session', async () => {
      // Act
      const session = await getSession();

      // Assert
      expect(session).toBeTruthy();
      expect(session?.user.id).toBe('user123');
      expect(supabaseMock.auth.getSession).toHaveBeenCalled();
    });

    it('should handle errors when getting session', async () => {
      // Arrange
      supabaseMock.setNextQueryToFail('Failed to get session');

      // Act & Assert
      await expect(async () => {
        await getSession();
      }).rejects.toThrow();
    });
  });
}); 