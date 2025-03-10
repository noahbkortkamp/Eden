// MSW handlers for test environment only
const { http, HttpResponse, delay, passthrough } = require('msw');
const { mockCourses, mockReviews, mockUsers } = require('../../app/__mocks__/supabase');

// Define handlers for MSW
const handlers = [
  // Mock course API
  http.get('*/api/courses', async () => {
    await delay(500);
    return HttpResponse.json(mockCourses);
  }),

  http.get('*/api/courses/:id', async ({ params }) => {
    const { id } = params;
    await delay(300);
    const course = mockCourses.find(c => c.id === id);
    
    if (!course) {
      return new HttpResponse(null, { status: 404 });
    }
    
    return HttpResponse.json(course);
  }),

  // Mock review API
  http.get('*/api/reviews', async ({ request }) => {
    const url = new URL(request.url);
    const courseId = url.searchParams.get('courseId');
    const userId = url.searchParams.get('userId');
    
    await delay(400);
    
    let filteredReviews = [...mockReviews];
    
    if (courseId) {
      filteredReviews = filteredReviews.filter(r => r.course_id === courseId);
    }
    
    if (userId) {
      filteredReviews = filteredReviews.filter(r => r.user_id === userId);
    }
    
    return HttpResponse.json(filteredReviews);
  }),

  http.post('*/api/reviews', async ({ request }) => {
    const review = await request.json();
    await delay(600);
    
    // Add timestamp and ID
    const newReview = {
      ...review,
      review_id: `review-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    return HttpResponse.json(newReview, { status: 201 });
  }),

  // Mock authentication API
  http.post('*/api/auth/login', async ({ request }) => {
    const { email, password } = await request.json();
    await delay(500);
    
    const user = mockUsers.find(u => u.email === email);
    
    if (!user || password !== 'password') {
      return new HttpResponse(
        JSON.stringify({ error: 'Invalid credentials' }), 
        { status: 401 }
      );
    }
    
    return HttpResponse.json({
      user,
      token: 'mock-jwt-token',
    });
  }),

  // Fallback - pass through any unhandled requests
  http.all('*', ({ request }) => {
    console.warn(`Unhandled ${request.method} request to ${request.url}`);
    return passthrough();
  }),
];

module.exports = { handlers }; 