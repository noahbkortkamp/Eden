import { Linking, Alert } from 'react-native';

const LEGAL_BASE_URL = 'https://golfculture.io';

export const LEGAL_LINKS = {
  PRIVACY_POLICY: `${LEGAL_BASE_URL}/privacy-policy.html`,
  TERMS_OF_USE: `${LEGAL_BASE_URL}/terms-of-use.html`,
  MANAGE_SUBSCRIPTIONS_IOS: 'https://apps.apple.com/account/subscriptions',
  MANAGE_SUBSCRIPTIONS_ANDROID: 'https://play.google.com/store/account/subscriptions',
} as const;

/**
 * Opens a legal document URL in the device's default browser
 */
export const openLegalDocument = async (url: string, documentName: string = 'document') => {
  try {
    const supported = await Linking.canOpenURL(url);
    
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert(
        'Unable to Open Link',
        `Sorry, we couldn't open the ${documentName}. Please visit ${url} in your browser.`,
        [{ text: 'OK' }]
      );
    }
  } catch (error) {
    console.error(`Failed to open ${documentName}:`, error);
    Alert.alert(
      'Error',
      `Failed to open ${documentName}. Please try again later.`,
      [{ text: 'OK' }]
    );
  }
};

/**
 * Opens the Privacy Policy
 */
export const openPrivacyPolicy = () => {
  return openLegalDocument(LEGAL_LINKS.PRIVACY_POLICY, 'Privacy Policy');
};

/**
 * Opens the Terms of Use
 */
export const openTermsOfUse = () => {
  return openLegalDocument(LEGAL_LINKS.TERMS_OF_USE, 'Terms of Use');
};

/**
 * Opens subscription management page (platform-specific)
 */
export const openSubscriptionManagement = () => {
  const url = LEGAL_LINKS.MANAGE_SUBSCRIPTIONS_IOS; // Assuming iOS for now
  return openLegalDocument(url, 'Subscription Management');
}; 