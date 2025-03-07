# Golf Course Discovery App

A React Native/Expo application for discovering and reviewing golf courses.

## Features

- Search and filter golf courses by various criteria
- View detailed course information
- User profiles and ratings
- Course reviews and recommendations
- Location-based course discovery

## Tech Stack

- React Native with Expo
- TypeScript
- Supabase for backend
- Expo Router for navigation

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (for Mac) or Android Studio (for Android development)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd golf-course-discovery
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up environment variables:
```bash
cp .env.example .env
```
Edit `.env` with your Supabase credentials and other required environment variables.

4. Start the development server:
```bash
npm start
# or
yarn start
```

5. Run on your preferred platform:
```bash
# iOS
npm run ios
# Android
npm run android
```

## Project Structure

```
app/
├── components/     # Reusable UI components
├── config/        # Configuration files
├── context/       # React Context providers
├── services/      # Business logic and API calls
├── types/         # TypeScript type definitions
├── utils/         # Utility functions
└── (tabs)/        # Tab-based navigation screens
```

## Development Guidelines

### Code Style

- Follow TypeScript best practices
- Use functional components with hooks
- Implement proper error handling
- Add JSDoc comments for documentation
- Follow the existing code formatting rules

### Performance

- Use React.memo for expensive components
- Implement proper loading states
- Optimize images and assets
- Use proper list virtualization

### Testing

- Write unit tests for components
- Add integration tests for critical flows
- Implement end-to-end tests

### Accessibility

- Add proper accessibility labels
- Support screen readers
- Implement keyboard navigation
- Follow WCAG guidelines

## Contributing

1. Create a feature branch
2. Make your changes
3. Add tests if applicable
4. Update documentation
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 