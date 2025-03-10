import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { CourseCard } from '../CourseCard';
import { mockCourses } from '../../__mocks__/supabase';
import { useRouter } from 'expo-router';

// Mock the router
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

// Mock the theme context used in the component
jest.mock('react-native-paper', () => {
  const actualPaper = jest.requireActual('react-native-paper');
  return {
    ...actualPaper,
    useTheme: () => ({
      colors: {
        background: '#FFFFFF',
        surface: '#F5F5F5',
        text: '#000000',
        textSecondary: '#666666',
        primary: '#007BFF',
        error: '#FF0000',
      },
    }),
  };
});

describe('CourseCard Component', () => {
  const mockNavigate = jest.fn();
  const mockCourse = mockCourses[0];

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      navigate: mockNavigate,
    });
  });

  it('renders course information correctly', () => {
    // Arrange & Act
    render(<CourseCard course={mockCourse} />);

    // Assert
    expect(screen.getByText(mockCourse.name)).toBeTruthy();
    expect(screen.getByText(mockCourse.location)).toBeTruthy();
    expect(screen.getByText(`⭐️ ${mockCourse.average_rating}`)).toBeTruthy();
    expect(screen.getByText(`📝 ${mockCourse.total_reviews} reviews`)).toBeTruthy();
  });

  it('navigates to course detail when card is pressed', () => {
    // Arrange
    render(<CourseCard course={mockCourse} />);

    // Act
    fireEvent.press(screen.getByTestId('course-card'));

    // Assert
    expect(mockNavigate).toHaveBeenCalledWith({
      pathname: '/course/[id]',
      params: { id: mockCourse.id },
    });
  });

  it('renders loading skeleton when loading prop is true', () => {
    // Arrange & Act
    render(<CourseCard loading={true} />);

    // Assert
    expect(screen.getByTestId('course-card-skeleton')).toBeTruthy();
    expect(screen.queryByText(mockCourse.name)).toBeNull();
  });

  it('renders error state when error prop is provided', () => {
    // Arrange
    const errorMessage = 'Failed to load course';

    // Act
    render(<CourseCard error={errorMessage} />);

    // Assert
    expect(screen.getByText(errorMessage)).toBeTruthy();
    expect(screen.getByTestId('course-card-error')).toBeTruthy();
    expect(screen.queryByText(mockCourse.name)).toBeNull();
  });

  it('calls onRetry when retry button is pressed in error state', () => {
    // Arrange
    const errorMessage = 'Failed to load course';
    const onRetry = jest.fn();

    // Act
    render(<CourseCard error={errorMessage} onRetry={onRetry} />);
    fireEvent.press(screen.getByText('Retry'));

    // Assert
    expect(onRetry).toHaveBeenCalled();
  });

  it('renders distance if provided', () => {
    // Arrange & Act
    render(<CourseCard course={{ ...mockCourse, distance: 5.2 }} />);

    // Assert
    expect(screen.getByText('5.2 mi')).toBeTruthy();
  });

  it('applies custom styles when provided', () => {
    // Arrange
    const testID = 'custom-card';
    const customStyle = { backgroundColor: '#F0F0F0' };

    // Act
    const { getByTestId } = render(
      <CourseCard 
        course={mockCourse} 
        style={customStyle} 
        testID={testID} 
      />
    );

    // Assert
    const card = getByTestId(testID);
    expect(card.props.style).toMatchObject(expect.objectContaining(customStyle));
  });
}); 