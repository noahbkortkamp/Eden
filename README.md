# Golf Course Review App

[![CI](https://github.com/yourusername/golf-course-review/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/golf-course-review/actions/workflows/ci.yml)
[![Test Coverage](https://img.shields.io/badge/coverage-70%25-green.svg)](TESTING.md)

A mobile application for reviewing and comparing golf courses, built with React Native and Expo.

## Features

- Search and browse golf courses
- Submit detailed course reviews
- Interactive "This or That" comparison system
- Dark/Light theme support
- Mock data for development

## Tech Stack

- React Native
- Expo Router
- TypeScript
- React Context for state management
- Supabase (prepared for backend integration)

## Getting Started

### Prerequisites

- Node.js (v14 or newer)
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS) or Android Emulator (for Android)

### Installation

1. Clone the repository:
```bash
git clone [your-repo-url]
cd [your-repo-name]
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Start the development server:
```bash
npx expo start
```

4. Press 'i' for iOS simulator or 'a' for Android emulator

## Project Structure

- `/app` - Main application code
  - `/(tabs)` - Tab-based navigation screens
  - `/(modals)` - Modal screens
  - `/components` - Reusable components
  - `/context` - React Context providers
  - `/theme` - Theme configuration
  - `/utils` - Utility functions
  - `/types` - TypeScript type definitions

## Development

The app currently uses mock data for development. To connect to a real backend:

1. Set up a Supabase project
2. Configure environment variables
3. Update the Supabase client configuration
4. Remove mock data implementations

## Testing

The app uses Jest and React Testing Library for testing. For detailed documentation, see [TESTING.md](TESTING.md).

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Test Structure

Tests are organized alongside the code they test:

- Component tests: `/app/components/__tests__/`
- Service tests: `/app/services/__tests__/`
- Context tests: `/app/context/__tests__/` and `/app/review/context/__tests__/`

### Mock System

The app includes a comprehensive mock system for Supabase in `/app/__mocks__/supabase.ts` that can be used to simulate database interactions in tests.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details 