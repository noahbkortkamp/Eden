import React from 'react';
import { Stack } from 'expo-router';
import { fullScreenOptions } from '../config/navigationConfig';

/**
 * Layout for all modals in the app
 * This ensures consistent behavior for modal presentation
 */
export default function ModalsLayout() {
  return (
    <Stack
      screenOptions={{
        ...fullScreenOptions,
        animation: 'slide_from_right',
      }}
    />
  );
} 