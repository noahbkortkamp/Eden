export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string
          updated_at: string
          username: string | null
          display_name: string | null
          avatar_url: string | null
          bio: string | null
          join_date: string
        }
        Insert: {
          id: string
          email: string
          created_at?: string
          updated_at?: string
          username?: string | null
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          join_date?: string
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
          updated_at?: string
          username?: string | null
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          join_date?: string
        }
      }
      follows: {
        Row: {
          id: string
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          id?: string
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: {
          id?: string
          follower_id?: string
          following_id?: string
          created_at?: string
        }
      }
      played_courses: {
        Row: {
          id: string
          user_id: string
          course_id: string
          played_at: string
          rating: number
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          course_id: string
          played_at?: string
          rating?: number
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          course_id?: string
          played_at?: string
          rating?: number
          notes?: string | null
          created_at?: string
        }
      }
      want_to_play_courses: {
        Row: {
          id: string
          user_id: string
          course_id: string
          created_at: string
          priority: number
          notes: string | null
        }
        Insert: {
          id?: string
          user_id: string
          course_id: string
          created_at?: string
          priority?: number
          notes?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          course_id?: string
          created_at?: string
          priority?: number
          notes?: string | null
        }
      }
      courses: {
        Row: {
          id: string
          name: string
          location: string
          price_level: number
          type: string
          latitude: number
          longitude: number
          rating: number
          total_ratings: number
          photos: string[]
          website: string | null
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          location: string
          price_level: number
          type: string
          latitude: number
          longitude: number
          rating?: number
          total_ratings?: number
          photos?: string[]
          website?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          location?: string
          price_level?: number
          type?: string
          latitude?: number
          longitude?: number
          rating?: number
          total_ratings?: number
          photos?: string[]
          website?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 