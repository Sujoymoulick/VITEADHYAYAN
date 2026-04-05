import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const [theme, setThemeState] = useState<Theme>('dark');

  useEffect(() => {
    if (profile?.preferred_theme) {
      setThemeState(profile.preferred_theme);
    } else {
      // Fallback to system preference if no profile
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setThemeState(isDark ? 'dark' : 'light');
    }
  }, [profile]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    if (profile) {
      await supabase
        .from('profiles')
        .update({ preferred_theme: newTheme })
        .eq('id', profile.id);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
