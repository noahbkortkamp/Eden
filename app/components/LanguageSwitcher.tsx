import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { useEdenTheme } from '../theme';

export function LanguageSwitcher() {
  const { i18n: { language } } = useTranslation();
  const theme = useEdenTheme();

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'es' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.colors.background }]}>
      <TouchableOpacity 
        style={[styles.container, { backgroundColor: theme.colors.surface }]} 
        onPress={toggleLanguage}
      >
        <Text style={[styles.text, { color: theme.colors.text }]}>{language.toUpperCase()}</Text>
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
    paddingVertical: 8,
  },
  container: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
}); 