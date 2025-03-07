import { supabase } from './supabase';
import { Database } from './database.types';

type Profile = Database['public']['Tables']['users']['Row'];
type Course = Database['public']['Tables']['courses']['Row'];
type PlayedCourse = Database['public']['Tables']['played_courses']['Row'];
type WantToPlayCourse = Database['public']['Tables']['want_to_play_courses']['Row'];

// ... existing functions ...

export async function getProfile(userId: string) {
  const { data: profile, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return profile;
}

export async function updateProfile(userId: string, updates: {
  username?: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
}) {
  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId);

  if (error) throw error;
}

export async function getFollowCounts(userId: string) {
  const [followers, following] = await Promise.all([
    supabase
      .from('follows')
      .select('id', { count: 'exact' })
      .eq('following_id', userId),
    supabase
      .from('follows')
      .select('id', { count: 'exact' })
      .eq('follower_id', userId)
  ]);

  if (followers.error) throw followers.error;
  if (following.error) throw following.error;

  return {
    followers: followers.count || 0,
    following: following.count || 0
  };
}

export async function followUser(followerId: string, followingId: string) {
  const { error } = await supabase
    .from('follows')
    .insert({
      follower_id: followerId,
      following_id: followingId
    });

  if (error) throw error;
}

export async function unfollowUser(followerId: string, followingId: string) {
  const { error } = await supabase
    .from('follows')
    .delete()
    .match({
      follower_id: followerId,
      following_id: followingId
    });

  if (error) throw error;
}

export async function isFollowing(followerId: string, followingId: string) {
  const { data, error } = await supabase
    .from('follows')
    .select('id')
    .match({
      follower_id: followerId,
      following_id: followingId
    })
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return !!data;
}

export async function getPlayedCoursesCount(userId: string) {
  const { count, error } = await supabase
    .from('played_courses')
    .select('id', { count: 'exact' })
    .eq('user_id', userId);

  if (error) throw error;
  return count || 0;
}

export async function getWantToPlayCoursesCount(userId: string) {
  const { count, error } = await supabase
    .from('want_to_play_courses')
    .select('id', { count: 'exact' })
    .eq('user_id', userId);

  if (error) throw error;
  return count || 0;
}

// ... keep existing functions ... 