# LoadingScreen Components

Beautiful loading screen components that use the Eden design system with a prominent Eden logo.

## Components

### LoadingScreen
A standalone loading screen that works **without** requiring a ThemeProvider. Uses hardcoded Eden colors.

### ThemedLoadingScreen  
A theme-aware loading screen that **requires** a ThemeProvider to be available. Uses dynamic theme colors.

## When to Use Which

### Use `LoadingScreen` for:
- **App initialization** (before ThemeProvider is available)
- **Root-level loading** (in `_layout.tsx`)
- **Standalone usage** outside of theme context

### Use `ThemedLoadingScreen` for:
- **Within app screens** (after ThemeProvider is initialized)
- **Modal loading states** 
- **Component-level loading** where theme is available

## Features

- **Eden Design System Integration**: Uses Eden theme colors
- **Prominent Eden Logo**: Large, centered Eden logo (200x200 pixels)
- **Clean Design**: Minimal, focused loading experience
- **Consistent Branding**: Eden cream background with logo

## Usage

### Basic LoadingScreen (No Theme Required)
```tsx
import LoadingScreen from '../components/LoadingScreen';

// Works anywhere, even before ThemeProvider is initialized
<LoadingScreen />
```

### ThemedLoadingScreen (Theme Required)
```tsx
import ThemedLoadingScreen from '../components/ThemedLoadingScreen';

// Must be used within a ThemeProvider context
<ThemedLoadingScreen />
```

### Import from Eden Components
```tsx
import { LoadingScreen, ThemedLoadingScreen } from '../components/eden';

<LoadingScreen />
<ThemedLoadingScreen />
```

## Props

Both components accept the same props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `message` | `string` | `undefined` | Reserved for future use (currently not displayed) |

## Styling

### LoadingScreen
- Background: `#F8F5EC` (Eden cream color - hardcoded)
- Logo: Eden logo from `assets/images/eden-logo.png` (200x200 pixels)

### ThemedLoadingScreen  
- Background: `theme.colors.background` (Dynamic from theme)
- Logo: Eden logo from `assets/images/eden-logo.png` (200x200 pixels)

## Examples in the App

- **App Initialization**: `LoadingScreen` used in `_layout.tsx` during app startup
- **Authentication**: `ThemedLoadingScreen` used in `auth/_layout.tsx` while checking auth status
- **Review Loading**: `ThemedLoadingScreen` used in review success modal while loading review details

## Design Philosophy

The loading screen follows a **minimal, brand-focused approach**:
- **Single focal point**: Large Eden logo draws attention
- **Clean background**: Eden cream color provides calm, branded experience
- **No distractions**: No text or animations to compete with the logo
- **Fast loading**: Lightweight component with minimal dependencies

## Technical Notes

The separation into two components solves the "chicken-and-egg" problem where:
1. `LoadingScreen` can be used during app initialization before ThemeProvider exists
2. `ThemedLoadingScreen` can be used within the app where theme context is available
3. Both provide the same visual experience with Eden branding
4. Simplified implementation with no animations or state management 