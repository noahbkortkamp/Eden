/**
 * Generates a username based on a user's first name plus random numbers
 * Format: FirstName + 6 random digits (e.g. "Bob123456")
 */
export function generateUsername(fullName: string): string {
  // Extract first name from full name
  const firstName = fullName.trim().split(' ')[0];
  
  // Remove any non-alphanumeric characters and capitalize first letter
  const cleanedName = firstName.replace(/[^a-zA-Z0-9]/g, '');
  const cleanFirstName = cleanedName.charAt(0).toUpperCase() + cleanedName.slice(1).toLowerCase();
  
  // Generate 6 random digits
  const randomNumbers = Math.floor(100000 + Math.random() * 900000);
  
  return `${cleanFirstName}${randomNumbers}`;
}

/**
 * Validates if a username meets our requirements
 */
export function isValidUsername(username: string): boolean {
  // Username should be 3-20 characters, alphanumeric only
  return /^[a-zA-Z0-9]{3,20}$/.test(username);
} 