import {
  DarkTheme as NavigationDark,
  DefaultTheme as NavigationLight,
  ThemeProvider as NavigationThemeProvider,
} from 'expo-router';
import { createContext, useContext, useMemo, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';

import { useSettings } from '@/features/settings/settings-store';

import { palettes, type ColorScheme, type ThemeColors } from './colors';
import { radius, spacing, touchTarget, typography } from './tokens';

export interface AppTheme {
  scheme: ColorScheme;
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  touchTarget: typeof touchTarget;
}

export function buildTheme(scheme: ColorScheme): AppTheme {
  return { scheme, colors: palettes[scheme], spacing, radius, typography, touchTarget };
}

const ThemeContext = createContext<AppTheme>(buildTheme('light'));

export function AppThemeProvider({ children }: PropsWithChildren) {
  const system = useColorScheme();
  const preference = useSettings((s) => s.theme);
  const scheme: ColorScheme =
    preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;

  const theme = useMemo(() => buildTheme(scheme), [scheme]);

  const navigationTheme = useMemo(() => {
    const base = scheme === 'dark' ? NavigationDark : NavigationLight;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.surface,
        text: theme.colors.text,
        border: theme.colors.border,
        notification: theme.colors.reward,
      },
    };
  }, [scheme, theme]);

  return (
    <ThemeContext.Provider value={theme}>
      <NavigationThemeProvider value={navigationTheme}>{children}</NavigationThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme(): AppTheme {
  return useContext(ThemeContext);
}
