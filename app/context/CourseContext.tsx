import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCourse as fetchCourse } from '../utils/courses';
import { Course } from '../types/review';

// Define a comprehensive CourseContext type
interface CourseContextType {
  course: Course | null;
  isLoading: boolean;
  error: string | null;
  getCourse: (courseId: string) => Promise<Course | null>;
}

// Create the context with default values
const CourseContext = createContext<CourseContextType>({
  course: null,
  isLoading: false,
  error: null,
  getCourse: async () => null,
});

interface CourseProviderProps {
  children: React.ReactNode;
  initialCourseId?: string;
}

// Provider component that wraps app and provides context
export const CourseProvider: React.FC<CourseProviderProps> = ({ children, initialCourseId }) => {
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(initialCourseId ? true : false);
  const [error, setError] = useState<string | null>(null);

  // Load initial course if ID is provided
  useEffect(() => {
    if (initialCourseId) {
      loadCourse(initialCourseId);
    }
  }, [initialCourseId]);

  // Function to load a course by ID
  const loadCourse = async (courseId: string) => {
    if (!courseId) {
      setError('No course ID provided');
      setIsLoading(false);
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`CourseContext: Loading course with ID: ${courseId}`);
      const courseData = await fetchCourse(courseId);
      
      if (!courseData) {
        throw new Error(`Course not found with ID: ${courseId}`);
      }
      
      console.log(`CourseContext: Successfully loaded course "${courseData.name}"`);
      setCourse(courseData);
      return courseData;
    } catch (err) {
      console.error('Error loading course:', err);
      setError(err instanceof Error ? err.message : 'Failed to load course');
      setCourse(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Function to get a course without setting it in state
  const getCourse = async (courseId: string): Promise<Course | null> => {
    if (!courseId) return null;
    
    try {
      return await fetchCourse(courseId);
    } catch (err) {
      console.error('Error in getCourse:', err);
      return null;
    }
  };

  const value = {
    course,
    isLoading,
    error,
    getCourse,
  };

  return <CourseContext.Provider value={value}>{children}</CourseContext.Provider>;
};

// Hook that lets components access the course context
export const useCourse = () => {
  const context = useContext(CourseContext);
  if (context === undefined) {
    throw new Error('useCourse must be used within a CourseProvider');
  }
  return context;
}; 