import { Course } from '../types/review';

export const mockCourses: Course[] = [
  {
    course_id: '1',
    name: 'Augusta National Golf Club',
    location: 'Augusta, Georgia',
    address: '2604 Washington Road, Augusta, GA 30904',
    latitude: 33.5021,
    longitude: -82.0231,
    total_holes: 18,
    average_rating: 4.9,
    total_reviews: 128,
  },
  {
    course_id: '2',
    name: 'Pebble Beach Golf Links',
    location: 'Pebble Beach, California',
    address: '1700 17-Mile Drive, Pebble Beach, CA 93953',
    latitude: 36.5725,
    longitude: -121.9486,
    total_holes: 18,
    average_rating: 4.8,
    total_reviews: 245,
  },
  {
    course_id: '3',
    name: 'St Andrews Links',
    location: 'St Andrews, Scotland',
    address: 'West Sands Road, St Andrews KY16 9XL',
    latitude: 56.3417,
    longitude: -2.8031,
    total_holes: 18,
    average_rating: 4.7,
    total_reviews: 312,
  },
]; 