import type { Database } from './database.types';

export interface Course {
  id: string;
  name: string;
  location: string;
  type: string;
  price_level: number;
  rating?: number;
  showScores?: boolean;
  date_played?: string;
}

export type SentimentRating = 'liked' | 'fine' | 'didnt_like';

export interface FavoriteHole {
  number: number;
  notes?: string;
}

export interface CourseTag {
  id: string;
  name: string;
  category: string;
}

export interface Review {
  id: string;
  user_id: string;
  course_id: string;
  rating: number;
  notes?: string;
  favorite_holes?: number[];
  photos?: string[];
  date_played: string;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  name: string;
  category: string;
}

export interface ReviewTag {
  review_id: string;
  tag_id: string;
}

export interface ReviewScreenProps {
  course: Course;
  onSubmit: (review: {
    course_id: string;
    rating: SentimentRating;
    notes: string;
    favorite_holes: number[];
    photos: string[];
    date_played: Date;
    tags: string[];
    playing_partners: string[];
  }) => Promise<void>;
  isSubmitting: boolean;
  error?: string;
}

export interface CourseComparisonProps {
  courseA: Course;
  courseB: Course;
  onSelect: (selectedId: string, notSelectedId: string) => void;
  onSkip: (courseAId: string, courseBId: string) => void;
} 