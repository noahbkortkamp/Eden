import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { colors, spacing, typography, borderRadius } from '../theme';

export function LanguageSwitcher() {
  const { i18n: { language } } = useTranslation();

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'es' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity style={styles.container} onPress={toggleLanguage}>
        <Text style={styles.text}>{language.toUpperCase()}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 85 : 65,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    paddingVertical: spacing.xs,
  },
  container: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral[100],
  },
  text: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.semibold,
  },
}); 