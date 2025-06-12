// Skip problematic React Native mocks that don't exist in the current version
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock Expo modules
jest.mock('expo-linear-gradient', () => 'LinearGradient');
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  notificationAsync: jest.fn(),
}));
jest.mock('expo-image', () => 'Image');
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ assets: [{ uri: 'test-uri' }] }),
  launchCameraAsync: jest.fn().mockResolvedValue({ assets: [{ uri: 'test-uri' }] }),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  mergeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
  multiMerge: jest.fn(),
}));

// Setup global mocks for Supabase
const createSupabaseMock = () => {
  const mockFrom = (table) => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    containedBy: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    overlap: jest.fn().mockReturnThis(),
    textSearch: jest.fn().mockReturnThis(),
    match: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockReturnThis(),
    then: jest.fn().mockImplementation(callback => Promise.resolve().then(() => callback({ data: [], error: null }))),
  });

  const mockAuth = {
    signInWithPassword: jest.fn().mockResolvedValue({ data: { user: { id: 'user123', email: 'test@example.com' } }, error: null }),
    signUp: jest.fn().mockResolvedValue({ data: { user: { id: 'user123', email: 'test@example.com' } }, error: null }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user123', email: 'test@example.com' } } }),
    getSession: jest.fn().mockResolvedValue({ data: { session: { user: { id: 'user123', email: 'test@example.com' } } }, error: null }),
    onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
    setSession: jest.fn().mockResolvedValue({ data: { session: { user: { id: 'user123' } } }, error: null }),
  };

  return {
    from: jest.fn().mockImplementation(mockFrom),
    auth: mockAuth,
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://test-url.com/image.jpg' } }),
        download: jest.fn().mockResolvedValue({ data: new Uint8Array(), error: null }),
        remove: jest.fn().mockResolvedValue({ data: {}, error: null }),
        list: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    },
    rpc: jest.fn().mockImplementation((name, params) => {
      return {
        then: jest.fn().mockImplementation(callback => Promise.resolve().then(() => callback({ data: [], error: null }))),
      };
    }),
  };
};

// Make the mock available globally
global.createSupabaseMock = createSupabaseMock;

// Setup global error handler
global.console.error = jest.fn();

// Add a custom matcher for an easier way to assert objects containing course data
expect.extend({
  toContainCourse(received, courseId) {
    const pass = received.some(item => item.id === courseId || item.course_id === courseId);
    if (pass) {
      return {
        message: () => `expected ${received} not to contain course with ID ${courseId}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to contain course with ID ${courseId}`,
        pass: false,
      };
    }
  },
});

// Import MSW setup from the test directory
// This is safe because Jest runs in Node.js where these modules are available
try {
  require('../__tests__/mocks/msw-setup');
} catch (error) {
  console.warn('Failed to set up MSW for testing:', error);
} 