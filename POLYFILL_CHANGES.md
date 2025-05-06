# ReadableStream Polyfill Integration

This document explains the changes made to fix the `ReadableStream is not defined` error in the React Native project.

## Problem

The app was encountering a `ReadableStream is not defined` error when running on mobile devices. This error occurred because:

1. Modern fetch implementations rely on the `ReadableStream` interface for handling streaming data.
2. React Native's environment doesn't include this browser API by default.
3. The `@supabase/supabase-js` library uses `undici` which requires `ReadableStream`.

## Solution

We applied several changes to implement the necessary polyfills:

### 1. Created a central polyfill file

Created `polyfills.js` that imports and applies all necessary polyfills:
- Imports `ReadableStream`, `WritableStream`, and `TransformStream` from `web-streams-polyfill`
- Makes these available globally if they don't already exist

### 2. Ensured early polyfill loading

- Modified `index.js` to import the polyfills before any other code
- Added polyfill import to `App.js` to ensure it loads first

### 3. Updated Metro configuration

- Modified `metro.config.js` to handle polyfills correctly
- Added `stream-browserify` explicitly for better stream support

### 4. Enhanced the start script

- Updated `start-with-polyfill.js` to apply polyfills before starting the app
- Updated package.json scripts to use this enhanced starter script

### 5. Package management

- Moved `web-streams-polyfill` from devDependencies to dependencies to ensure it's available in production builds

## Removed Google Maps Dependencies

As part of this update, we also removed all Google Maps dependencies:

1. Removed `@googlemaps/google-maps-services-js` from package.json
2. Deleted `places.ts` files from both `utils` and `services` directories
3. Removed the Google Maps API key from the config file

## Testing

After applying these changes, the app should start correctly on mobile devices without the `ReadableStream is not defined` error. The changes work by providing a complete polyfill implementation for all necessary stream interfaces.

If issues persist, consider running:

```
npm install
npm cache clean --force
```

Then restart the dev server with:

```
npm start
``` 