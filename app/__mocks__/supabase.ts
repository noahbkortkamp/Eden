import { Database } from '../utils/database.types';

// Mock data for tests
export const mockCourses = [
  {
    id: 'course1',
    name: 'Pine Valley Golf Club',
    location: 'Pine Valley, NJ',
    type: 'championship',
    price_level: '$$$$',
    total_reviews: 42,
    average_rating: 9.2,
    lat: 39.7868,
    lng: -74.9705,
  },
  {
    id: 'course2',
    name: 'Augusta National Golf Club',
    location: 'Augusta, GA',
    type: 'championship',
    price_level: '$$$$',
    total_reviews: 38,
    average_rating: 9.8,
    lat: 33.5021,
    lng: -82.0232,
  },
  {
    id: 'course3',
    name: 'Pebble Beach Golf Links',
    location: 'Pebble Beach, CA',
    type: 'links',
    price_level: '$$$$',
    total_reviews: 56,
    average_rating: 9.5,
    lat: 36.5725,
    lng: -121.9486,
  },
];

export const mockReviews = [
  {
    review_id: 'review1',
    user_id: 'user123',
    course_id: 'course1',
    rating: 'liked',
    notes: 'Great course with challenging holes',
    favorite_holes: [3, 7, 16],
    photos: ['url1', 'url2'],
    created_at: '2023-08-15T14:30:00Z',
    updated_at: '2023-08-15T14:30:00Z',
    date_played: '2023-08-10T00:00:00Z',
    tags: ['scenic', 'challenging'],
  },
  {
    review_id: 'review2',
    user_id: 'user123',
    course_id: 'course2',
    rating: 'liked',
    notes: 'Historic course, amazing experience',
    favorite_holes: [12, 13, 16],
    photos: ['url3', 'url4'],
    created_at: '2023-07-22T10:15:00Z',
    updated_at: '2023-07-22T10:15:00Z',
    date_played: '2023-07-20T00:00:00Z',
    tags: ['historic', 'well-maintained'],
  },
  {
    review_id: 'review3',
    user_id: 'user123',
    course_id: 'course3',
    rating: 'fine',
    notes: 'Beautiful views but expensive',
    favorite_holes: [7, 8, 18],
    photos: ['url5'],
    created_at: '2023-06-05T16:45:00Z',
    updated_at: '2023-06-05T16:45:00Z',
    date_played: '2023-06-01T00:00:00Z',
    tags: ['scenic', 'expensive'],
  },
];

export const mockRankings = [
  {
    id: 'ranking1',
    user_id: 'user123',
    course_id: 'course1',
    sentiment_category: 'liked',
    rank_position: 1,
    score: 9.5,
    created_at: '2023-08-15T14:35:00Z',
    updated_at: '2023-09-01T11:20:00Z',
  },
  {
    id: 'ranking2',
    user_id: 'user123',
    course_id: 'course2',
    sentiment_category: 'liked',
    rank_position: 2,
    score: 9.2,
    created_at: '2023-07-22T10:20:00Z',
    updated_at: '2023-09-01T11:20:00Z',
  },
  {
    id: 'ranking3',
    user_id: 'user123',
    course_id: 'course3',
    sentiment_category: 'fine',
    rank_position: 1,
    score: 6.8,
    created_at: '2023-06-05T16:50:00Z',
    updated_at: '2023-06-05T16:50:00Z',
  },
];

export const mockUsers = [
  {
    id: 'user123',
    email: 'test@example.com',
    name: 'Test User',
    created_at: '2023-01-15T10:00:00Z',
  },
];

export const mockTags = [
  { id: 1, name: 'scenic', category: 'course_features' },
  { id: 2, name: 'challenging', category: 'difficulty' },
  { id: 3, name: 'well-maintained', category: 'condition' },
  { id: 4, name: 'historic', category: 'course_features' },
  { id: 5, name: 'expensive', category: 'value' },
];

// Advanced mock implementation of Supabase client
export class SupabaseMock {
  private mockData = {
    courses: [...mockCourses],
    reviews: [...mockReviews],
    rankings: [...mockRankings],
    users: [...mockUsers],
    tags: [...mockTags],
  };

  // Mock error states for testing error handling
  private shouldFailNextQuery = false;
  private customErrorMessage = '';

  // Helper to set up specific failure scenarios
  public setNextQueryToFail(errorMessage = 'Supabase query failed') {
    this.shouldFailNextQuery = true;
    this.customErrorMessage = errorMessage;
    return this;
  }

  // Reset all mock data to initial state
  public resetMockData() {
    this.mockData = {
      courses: [...mockCourses],
      rankings: [...mockRankings],
      reviews: [...mockReviews],
      users: [...mockUsers],
      tags: [...mockTags],
    };
    this.shouldFailNextQuery = false;
    this.customErrorMessage = '';
    return this;
  }

  // Custom mock for a table query
  public from(table: string) {
    return {
      select: (columnsQuery = '*') => {
        return {
          eq: (column: string, value: any) => {
            return {
              single: () => {
                if (this.shouldFailNextQuery) {
                  this.shouldFailNextQuery = false;
                  return Promise.resolve({ data: null, error: new Error(this.customErrorMessage) });
                }

                const result = this.mockData[table].find((item: any) => item[column] === value);
                return Promise.resolve({ data: result || null, error: null });
              },
              order: (column: string, { ascending }: { ascending: boolean }) => {
                if (this.shouldFailNextQuery) {
                  this.shouldFailNextQuery = false;
                  return Promise.resolve({ data: null, error: new Error(this.customErrorMessage) });
                }

                const filtered = this.mockData[table].filter((item: any) => item[column] === value);
                const sorted = [...filtered].sort((a: any, b: any) => {
                  return ascending ? a[column] - b[column] : b[column] - a[column];
                });
                return Promise.resolve({ data: sorted, error: null });
              },
              then: (callback: (result: { data: any[] | null; error: Error | null }) => void) => {
                if (this.shouldFailNextQuery) {
                  this.shouldFailNextQuery = false;
                  return Promise.resolve().then(() => callback({ data: null, error: new Error(this.customErrorMessage) }));
                }

                const filtered = this.mockData[table].filter((item: any) => item[column] === value);
                return Promise.resolve().then(() => callback({ data: filtered, error: null }));
              },
            };
          },
          in: (column: string, values: any[]) => {
            return {
              then: (callback: (result: { data: any[] | null; error: Error | null }) => void) => {
                if (this.shouldFailNextQuery) {
                  this.shouldFailNextQuery = false;
                  return Promise.resolve().then(() => callback({ data: null, error: new Error(this.customErrorMessage) }));
                }

                const filtered = this.mockData[table].filter((item: any) => values.includes(item[column]));
                return Promise.resolve().then(() => callback({ data: filtered, error: null }));
              },
            };
          },
          order: (column: string, { ascending }: { ascending: boolean }) => {
            return {
              then: (callback: (result: { data: any[] | null; error: Error | null }) => void) => {
                if (this.shouldFailNextQuery) {
                  this.shouldFailNextQuery = false;
                  return Promise.resolve().then(() => callback({ data: null, error: new Error(this.customErrorMessage) }));
                }

                const sorted = [...this.mockData[table]].sort((a: any, b: any) => {
                  return ascending ? a[column] - b[column] : b[column] - a[column];
                });
                return Promise.resolve().then(() => callback({ data: sorted, error: null }));
              },
            };
          },
          then: (callback: (result: { data: any[] | null; error: Error | null }) => void) => {
            if (this.shouldFailNextQuery) {
              this.shouldFailNextQuery = false;
              return Promise.resolve().then(() => callback({ data: null, error: new Error(this.customErrorMessage) }));
            }
            return Promise.resolve().then(() => callback({ data: this.mockData[table], error: null }));
          },
        };
      },
      insert: (data: any) => {
        return {
          then: (callback: (result: { data: any | null; error: Error | null }) => void) => {
            if (this.shouldFailNextQuery) {
              this.shouldFailNextQuery = false;
              return Promise.resolve().then(() => callback({ data: null, error: new Error(this.customErrorMessage) }));
            }

            // Generate a new UUID-like string for ID if not provided
            const newItem = Array.isArray(data) 
              ? data.map((item, index) => ({ ...item, id: item.id || `new-id-${index}` }))
              : { ...data, id: data.id || 'new-id' };
            
            if (Array.isArray(newItem)) {
              this.mockData[table] = [...this.mockData[table], ...newItem];
            } else {
              this.mockData[table].push(newItem);
            }
            
            return Promise.resolve().then(() => callback({ data: newItem, error: null }));
          },
        };
      },
      update: (data: any) => {
        return {
          eq: (column: string, value: any) => {
            return {
              then: (callback: (result: { data: any | null; error: Error | null }) => void) => {
                if (this.shouldFailNextQuery) {
                  this.shouldFailNextQuery = false;
                  return Promise.resolve().then(() => callback({ data: null, error: new Error(this.customErrorMessage) }));
                }

                const index = this.mockData[table].findIndex((item: any) => item[column] === value);
                if (index !== -1) {
                  this.mockData[table][index] = { ...this.mockData[table][index], ...data };
                  return Promise.resolve().then(() => callback({ data: this.mockData[table][index], error: null }));
                }
                return Promise.resolve().then(() => callback({ data: null, error: new Error('Not found') }));
              },
            };
          },
        };
      },
      delete: () => {
        return {
          eq: (column: string, value: any) => {
            return {
              then: (callback: (result: { data: any | null; error: Error | null }) => void) => {
                if (this.shouldFailNextQuery) {
                  this.shouldFailNextQuery = false;
                  return Promise.resolve().then(() => callback({ data: null, error: new Error(this.customErrorMessage) }));
                }

                const index = this.mockData[table].findIndex((item: any) => item[column] === value);
                if (index !== -1) {
                  const deletedItem = this.mockData[table][index];
                  this.mockData[table].splice(index, 1);
                  return Promise.resolve().then(() => callback({ data: deletedItem, error: null }));
                }
                return Promise.resolve().then(() => callback({ data: null, error: new Error('Not found') }));
              },
            };
          },
        };
      },
      upsert: (data: any) => {
        return {
          then: (callback: (result: { data: any | null; error: Error | null }) => void) => {
            if (this.shouldFailNextQuery) {
              this.shouldFailNextQuery = false;
              return Promise.resolve().then(() => callback({ data: null, error: new Error(this.customErrorMessage) }));
            }

            const processUpsert = (item: any) => {
              const idField = 'id' in item ? 'id' : 'course_id' in item ? 'course_id' : '';
              if (!idField || !item[idField]) {
                // If no ID, treat as insert
                const newItem = { ...item, id: item.id || `new-id-${Date.now()}` };
                this.mockData[table].push(newItem);
                return newItem;
              }

              // Try to update
              const index = this.mockData[table].findIndex((existing: any) => existing[idField] === item[idField]);
              if (index !== -1) {
                this.mockData[table][index] = { ...this.mockData[table][index], ...item };
                return this.mockData[table][index];
              } else {
                // Not found, insert
                this.mockData[table].push(item);
                return item;
              }
            };

            const result = Array.isArray(data) 
              ? data.map(processUpsert)
              : processUpsert(data);
            
            return Promise.resolve().then(() => callback({ data: result, error: null }));
          },
        };
      },
    };
  }

  // Mock auth methods
  public auth = {
    signInWithPassword: ({ email, password }: { email: string; password: string }) => {
      if (this.shouldFailNextQuery) {
        this.shouldFailNextQuery = false;
        return Promise.resolve({ data: null, error: new Error(this.customErrorMessage) });
      }

      const user = this.mockData.users.find(u => u.email === email);
      if (!user) {
        return Promise.resolve({ data: null, error: new Error('Invalid credentials') });
      }

      return Promise.resolve({
        data: {
          user: { id: user.id, email: user.email },
          session: { user: { id: user.id, email: user.email } },
        },
        error: null,
      });
    },
    signUp: ({ email, password, options }: { email: string; password: string; options?: any }) => {
      if (this.shouldFailNextQuery) {
        this.shouldFailNextQuery = false;
        return Promise.resolve({ data: null, error: new Error(this.customErrorMessage) });
      }

      const existingUser = this.mockData.users.find(u => u.email === email);
      if (existingUser) {
        return Promise.resolve({ data: null, error: new Error('User already exists') });
      }

      const newUser = {
        id: `user-${Date.now()}`,
        email,
        name: options?.data?.name || 'New User',
        created_at: new Date().toISOString(),
      };

      this.mockData.users.push(newUser);

      return Promise.resolve({
        data: {
          user: { id: newUser.id, email: newUser.email },
          session: { user: { id: newUser.id, email: newUser.email } },
        },
        error: null,
      });
    },
    signOut: () => {
      if (this.shouldFailNextQuery) {
        this.shouldFailNextQuery = false;
        return Promise.resolve({ error: new Error(this.customErrorMessage) });
      }
      return Promise.resolve({ error: null });
    },
    getUser: () => {
      if (this.shouldFailNextQuery) {
        this.shouldFailNextQuery = false;
        return Promise.resolve({ data: { user: null }, error: new Error(this.customErrorMessage) });
      }
      const user = this.mockData.users[0]; // Default to first user for simplicity
      return Promise.resolve({ data: { user: { id: user.id, email: user.email } } });
    },
    getSession: () => {
      if (this.shouldFailNextQuery) {
        this.shouldFailNextQuery = false;
        return Promise.resolve({ data: { session: null }, error: new Error(this.customErrorMessage) });
      }
      const user = this.mockData.users[0];
      return Promise.resolve({ 
        data: { 
          session: { 
            user: { id: user.id, email: user.email }
          } 
        }, 
        error: null 
      });
    },
    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      const user = this.mockData.users[0];
      // Simulate an immediate auth state change event
      setTimeout(() => {
        callback('SIGNED_IN', { user: { id: user.id, email: user.email } });
      }, 0);
      
      // Return a mock subscription that can be unsubscribed
      return {
        data: {
          subscription: {
            unsubscribe: () => {},
          },
        },
      };
    },
    setSession: ({ access_token, refresh_token }: { access_token: string, refresh_token: string }) => {
      if (this.shouldFailNextQuery) {
        this.shouldFailNextQuery = false;
        return Promise.resolve({ data: { session: null }, error: new Error(this.customErrorMessage) });
      }
      
      const user = this.mockData.users[0];
      return Promise.resolve({ 
        data: { 
          session: { 
            user: { id: user.id, email: user.email },
            access_token,
            refresh_token
          } 
        }, 
        error: null 
      });
    },
  };

  // Mock storage methods
  public storage = {
    from: (bucket: string) => {
      return {
        upload: (path: string, file: any) => {
          if (this.shouldFailNextQuery) {
            this.shouldFailNextQuery = false;
            return Promise.resolve({ data: null, error: new Error(this.customErrorMessage) });
          }
          return Promise.resolve({ data: { path }, error: null });
        },
        getPublicUrl: (path: string) => {
          if (this.shouldFailNextQuery) {
            this.shouldFailNextQuery = false;
            return { data: null, error: new Error(this.customErrorMessage) };
          }
          return { data: { publicUrl: `https://mock-storage.com/${bucket}/${path}` } };
        },
        download: (path: string) => {
          if (this.shouldFailNextQuery) {
            this.shouldFailNextQuery = false;
            return Promise.resolve({ data: null, error: new Error(this.customErrorMessage) });
          }
          return Promise.resolve({ data: new Uint8Array([1, 2, 3]), error: null });
        },
        remove: (paths: string[]) => {
          if (this.shouldFailNextQuery) {
            this.shouldFailNextQuery = false;
            return Promise.resolve({ data: null, error: new Error(this.customErrorMessage) });
          }
          return Promise.resolve({ data: {}, error: null });
        },
      };
    },
  };

  // Mock RPC calls
  public rpc(functionName: string, params: any) {
    if (this.shouldFailNextQuery) {
      this.shouldFailNextQuery = false;
      return Promise.resolve({ data: null, error: new Error(this.customErrorMessage) });
    }

    // Mock different RPC functions based on function name
    if (functionName === 'get_course_rankings') {
      const userId = params?.user_id;
      const sentiment = params?.sentiment;
      
      if (userId && sentiment) {
        const rankings = this.mockData.rankings.filter(
          r => r.user_id === userId && r.sentiment_category === sentiment
        );
        return Promise.resolve({ data: rankings, error: null });
      }
    }
    
    // Default response
    return Promise.resolve({ data: [], error: null });
  }
}

// Export a singleton instance for easy usage in tests
export const supabaseMock = new SupabaseMock(); 