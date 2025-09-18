import React from 'react';
import { Stack } from 'expo-router';
import { LanguageProvider } from '../contexts/LanguageContext';

export default function RootLayout() {
  return (
    <LanguageProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="add-cargo" />
        <Stack.Screen name="cargo-list" />
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="export-all" />
      </Stack>
    </LanguageProvider>
  );
}