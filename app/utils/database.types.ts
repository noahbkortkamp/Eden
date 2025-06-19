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
      user_subscriptions: {
        Row: {
          id: string
          user_id: string
          product_id: string
          status: 'inactive' | 'active' | 'trial' | 'expired' | 'grace_period' | 'paused' | 'cancelled'
          start_date: string
          expiration_date: string | null
          trial_end_date: string | null
          cancellation_date: string | null
          original_transaction_id: string | null
          latest_transaction_id: string | null
          receipt_data: string | null
          environment: 'sandbox' | 'production'
          is_trial_period: boolean
          trial_days_remaining: number
          last_receipt_validation: string | null
          auto_renew_enabled: boolean
          price_tier: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          product_id: string
          status?: 'inactive' | 'active' | 'trial' | 'expired' | 'grace_period' | 'paused' | 'cancelled'
          start_date: string
          expiration_date?: string | null
          trial_end_date?: string | null
          cancellation_date?: string | null
          original_transaction_id?: string | null
          latest_transaction_id?: string | null
          receipt_data?: string | null
          environment?: 'sandbox' | 'production'
          is_trial_period?: boolean
          trial_days_remaining?: number
          last_receipt_validation?: string | null
          auto_renew_enabled?: boolean
          price_tier?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string
          status?: 'inactive' | 'active' | 'trial' | 'expired' | 'grace_period' | 'paused' | 'cancelled'
          start_date?: string
          expiration_date?: string | null
          trial_end_date?: string | null
          cancellation_date?: string | null
          original_transaction_id?: string | null
          latest_transaction_id?: string | null
          receipt_data?: string | null
          environment?: 'sandbox' | 'production'
          is_trial_period?: boolean
          trial_days_remaining?: number
          last_receipt_validation?: string | null
          auto_renew_enabled?: boolean
          price_tier?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      purchase_receipts: {
        Row: {
          id: string
          user_id: string
          subscription_id: string | null
          transaction_id: string
          original_transaction_id: string | null
          receipt_data: string
          receipt_signature: string | null
          is_validated: boolean
          validation_error: string | null
          validation_timestamp: string | null
          product_id: string
          purchase_date: string
          quantity: number
          environment: 'sandbox' | 'production'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subscription_id?: string | null
          transaction_id: string
          original_transaction_id?: string | null
          receipt_data: string
          receipt_signature?: string | null
          is_validated?: boolean
          validation_error?: string | null
          validation_timestamp?: string | null
          product_id: string
          purchase_date: string
          quantity?: number
          environment?: 'sandbox' | 'production'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          subscription_id?: string | null
          transaction_id?: string
          original_transaction_id?: string | null
          receipt_data?: string
          receipt_signature?: string | null
          is_validated?: boolean
          validation_error?: string | null
          validation_timestamp?: string | null
          product_id?: string
          purchase_date?: string
          quantity?: number
          environment?: 'sandbox' | 'production'
          created_at?: string
        }
      }
      subscription_events: {
        Row: {
          id: string
          user_id: string
          subscription_id: string | null
          event_type: string
          event_data: Json | null
          product_id: string | null
          transaction_id: string | null
          previous_status: 'inactive' | 'active' | 'trial' | 'expired' | 'grace_period' | 'paused' | 'cancelled' | null
          new_status: 'inactive' | 'active' | 'trial' | 'expired' | 'grace_period' | 'paused' | 'cancelled' | null
          error_message: string | null
          user_agent: string | null
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subscription_id?: string | null
          event_type: string
          event_data?: Json | null
          product_id?: string | null
          transaction_id?: string | null
          previous_status?: 'inactive' | 'active' | 'trial' | 'expired' | 'grace_period' | 'paused' | 'cancelled' | null
          new_status?: 'inactive' | 'active' | 'trial' | 'expired' | 'grace_period' | 'paused' | 'cancelled' | null
          error_message?: string | null
          user_agent?: string | null
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          subscription_id?: string | null
          event_type?: string
          event_data?: Json | null
          product_id?: string | null
          transaction_id?: string | null
          previous_status?: 'inactive' | 'active' | 'trial' | 'expired' | 'grace_period' | 'paused' | 'cancelled' | null
          new_status?: 'inactive' | 'active' | 'trial' | 'expired' | 'grace_period' | 'paused' | 'cancelled' | null
          error_message?: string | null
          user_agent?: string | null
          ip_address?: string | null
          created_at?: string
        }
      }
      premium_feature_usage: {
        Row: {
          id: string
          user_id: string
          feature: 'unlimited_reviews' | 'score_visibility' | 'advanced_recommendations' | 'social_features' | 'export_data' | 'priority_support'
          usage_count: number
          usage_date: string
          subscription_id: string | null
          had_access: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          feature: 'unlimited_reviews' | 'score_visibility' | 'advanced_recommendations' | 'social_features' | 'export_data' | 'priority_support'
          usage_count?: number
          usage_date?: string
          subscription_id?: string | null
          had_access?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          feature?: 'unlimited_reviews' | 'score_visibility' | 'advanced_recommendations' | 'social_features' | 'export_data' | 'priority_support'
          usage_count?: number
          usage_date?: string
          subscription_id?: string | null
          had_access?: boolean
          created_at?: string
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
          par: number
          yardage: number
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
          par: number
          yardage: number
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
          par?: number
          yardage?: number
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
      reviews: {
        Row: {
          id: string
          user_id: string
          course_id: string
          rating: 'liked' | 'fine' | 'didnt_like'
          notes: string | null
          favorite_holes: number[]
          photos: string[]
          date_played: string
          created_at: string
          updated_at: string
          playing_partners: string[]
        }
        Insert: {
          id?: string
          user_id: string
          course_id: string
          rating: 'liked' | 'fine' | 'didnt_like'
          notes?: string | null
          favorite_holes?: number[]
          photos?: string[]
          date_played: string
          created_at?: string
          updated_at?: string
          playing_partners?: string[]
        }
        Update: {
          id?: string
          user_id?: string
          course_id?: string
          rating?: 'liked' | 'fine' | 'didnt_like'
          notes?: string | null
          favorite_holes?: number[]
          photos?: string[]
          date_played?: string
          created_at?: string
          updated_at?: string
          playing_partners?: string[]
        }
      }
      tags: {
        Row: {
          id: string
          name: string
          category: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          category: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: string
          created_at?: string
        }
      }
      review_tags: {
        Row: {
          review_id: string
          tag_id: string
          created_at: string
        }
        Insert: {
          review_id: string
          tag_id: string
          created_at?: string
        }
        Update: {
          review_id?: string
          tag_id?: string
          created_at?: string
        }
      }
      course_comparisons: {
        Row: {
          id: string
          user_id: string
          preferred_course_id: string
          other_course_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          preferred_course_id: string
          other_course_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          preferred_course_id?: string
          other_course_id?: string
          created_at?: string
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