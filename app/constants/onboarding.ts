// Define the ordered steps of the onboarding process
export const ONBOARDING_STEPS = [
  'profile-info',     // Step 1: Enter first and last name
  'golf-sickko',      // Step 2: How much of a golf enthusiast they are
  'location-permission', // Step 3: Ask for location permissions
  'find-friends',     // Step 4: Find friends
  'frequency',        // Step 5: How often they play
];

// Helper function to get the step number from the route name
export function getStepNumber(routeName: string): number {
  const index = ONBOARDING_STEPS.indexOf(routeName);
  return index !== -1 ? index + 1 : 1; // Default to 1 if not found
}

// Total number of steps in the onboarding process
export const TOTAL_ONBOARDING_STEPS = ONBOARDING_STEPS.length; 