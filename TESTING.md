# Testing Guide

This document outlines the testing approach for the Golf Course Review application, providing guidance on how to run tests, create new tests, and understand the test infrastructure.

## 🧪 Test Setup

Our test suite uses the following technologies:
- **Jest**: Testing framework
- **React Testing Library**: For testing React components
- **Mock Service Worker (MSW)**: For intercepting and mocking API requests
- **Custom Supabase Mock**: For mocking database interactions
- **Detox**: For end-to-end testing on mobile devices

## 📊 Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode (development)
npm run test:watch

# Run tests in CI mode (continuous integration)
npm run test:ci

# Update snapshots
npm run test:update

# Clear Jest cache
npm run test:clear

# Run tests only on staged files
npm run test:staged

# Run tests that match a specific pattern
npm run test:pattern "AuthService"

# End-to-end tests (iOS)
npm run build:e2e:ios
npm run test:e2e:ios
```

### Coverage Reports

After running `npm run test:coverage`, the coverage report will be available in the `coverage` directory. Open `coverage/lcov-report/index.html` in your browser to view the detailed report.

## 📝 Test Organization

Our tests are organized alongside the code they test:

```
app/
  ├── components/
  │   ├── ComponentName.tsx
  │   └── __tests__/
  │       └── ComponentName.test.tsx
  │
  ├── services/
  │   ├── serviceName.ts
  │   └── __tests__/
  │       └── serviceName.test.ts
  │
  ├── context/
  │   ├── ContextName.tsx
  │   └── __tests__/
  │       └── ContextName.test.tsx
  │
  └── __mocks__/
      ├── supabase.ts  # Mocks for Supabase
      └── msw-handlers.ts  # API request mocks with MSW

e2e/
  └── firstTest/
      └── login.test.js  # E2E tests with Detox
```

## 🛠️ Writing Tests

### Component Tests

For React components, use React Testing Library to test the component's rendering and behavior:

```typescript
import { render, fireEvent, screen } from '@testing-library/react-native';
import { YourComponent } from '../YourComponent';

describe('YourComponent', () => {
  it('renders correctly', () => {
    render(<YourComponent />);
    expect(screen.getByText('Some Text')).toBeTruthy();
  });

  it('responds to user interaction', () => {
    const onPress = jest.fn();
    render(<YourComponent onPress={onPress} />);
    fireEvent.press(screen.getByText('Button Text'));
    expect(onPress).toHaveBeenCalled();
  });
});
```

### Mocking Supabase

For testing services that interact with Supabase, use the custom Supabase mock:

```typescript
import { supabaseMock } from '../../__mocks__/supabase';

// Mock the supabase module
jest.mock('../../utils/supabase', () => ({
  supabase: supabaseMock,
}));

describe('YourService', () => {
  beforeEach(() => {
    // Reset mock data before each test
    supabaseMock.resetMockData();
  });

  it('fetches data successfully', async () => {
    const result = await yourService.fetchData();
    expect(result).toBeDefined();
  });

  it('handles errors', async () => {
    // Set the next query to fail
    supabaseMock.setNextQueryToFail('Custom error message');
    
    await expect(yourService.fetchData()).rejects.toThrow();
  });
});
```

### Testing Authentication

For testing authentication flows, use the mocked auth methods:

```typescript
import { supabaseMock } from '../../__mocks__/supabase';

jest.mock('../../utils/supabase', () => ({
  supabase: supabaseMock,
}));

describe('Auth Service', () => {
  it('signs in a user', async () => {
    const result = await authService.signIn({
      email: 'test@example.com',
      password: 'password',
    });
    
    expect(result.user).toBeDefined();
    expect(supabaseMock.auth.signInWithPassword).toHaveBeenCalled();
  });
});
```

### Mocking API Requests with MSW

For mocking API requests, use Mock Service Worker:

```typescript
import { server } from '../../__mocks__/msw-setup';
import { http, HttpResponse } from 'msw';

describe('API Service', () => {
  // Override default handlers for specific tests
  it('handles API errors', async () => {
    // Override the default handler for this test
    server.use(
      http.get('*/api/courses', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );
    
    // Test error handling
    await expect(apiService.getCourses()).rejects.toThrow();
  });
});
```

### End-to-End Testing with Detox

E2E tests use Detox to interact with the real app on a simulator:

```javascript
describe('Login Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should login successfully', async () => {
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('password');
    await element(by.id('login-button')).tap();
    await expect(element(by.id('home-screen'))).toBeVisible();
  });
});
```

## ⚙️ CI/CD Integration

Tests are automatically run in the CI pipeline for:
- All pull requests to `main` or `develop` branches
- All pushes to `main` or `develop` branches

The CI pipeline:
1. Installs dependencies
2. Runs tests with coverage reporting
3. Builds the application
4. Runs linting checks
5. Uploads coverage reports as artifacts

## 🔄 Pre-commit Hooks

The project uses Husky and lint-staged to run tests on staged files before commit:

- **Linting**: All staged files are linted
- **Testing**: Tests related to changed files are run

You can bypass the pre-commit hooks with `git commit --no-verify` if needed.

## 🔧 IDE Integration

### VS Code

We provide VS Code settings and recommended extensions for a better testing experience. Run the setup script to configure:

```bash
./vscode-setup.sh
```

This will:

1. Configure Jest integration for inline test results
2. Set up extensions recommendations for testing tools
3. Configure code actions and ESLint integration

#### Recommended Extensions

- **Jest**: In-editor test execution and debugging
- **ESLint**: Code quality checks
- **Coverage Gutters**: Shows test coverage in the editor
- **Test Explorer**: View and run tests from the VS Code Test panel

## 🔍 Best Practices

1. **Test Behavior, Not Implementation**: Focus on testing what your code does, not how it does it.

2. **One Assertion Per Test**: Each test should verify one specific behavior or outcome.

3. **Mock External Dependencies**: Use mocks for external services like Supabase or API calls.

4. **Test Edge Cases**: Include tests for error states, loading states, and boundary conditions.

5. **Keep Tests Isolated**: Tests should not depend on each other and should clean up after themselves.

6. **Maintain Test Coverage**: Aim for at least 70% test coverage for critical features.

7. **Use Descriptive Test Names**: A good test name describes the expected behavior and scenario.

## 🚨 Troubleshooting

### Common Issues

- **Tests failing in CI but passing locally**: This might be due to timing issues or environment differences. Try running `npm run test:ci` locally to simulate the CI environment.

- **Snapshot test failures**: If UI changes are intentional, update snapshots with `npm run test:update`.

- **Supabase mock errors**: Make sure you're mocking the Supabase module in each test file that uses it.

- **MSW warnings about unhandled requests**: Add handlers for all API endpoints your code uses.

- **Detox test failures**: Ensure you're using the correct test IDs in your components that match your E2E tests.

### Getting Help

If you encounter issues with the test suite, please:

1. Check this documentation first
2. Look at existing test examples for similar components/services
3. Reach out to the team on the #testing Slack channel 