import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Theme {
  colors: {
    primary: string;
    background: string;
    text: string;
    border: string;
  };
}

const lightTheme: Theme = {
  colors: {
    primary: '#00ff88',
    background: '#FFFFFF',
    text: '#000000',
    border: '#E5E5E7',
  },
};

const darkTheme: Theme = {
  colors: {
    primary: '#00ff88',
    background: '#000000',
    text: '#FFFFFF',
    border: '#333333',
  },
};

interface ThemeContextType {
  theme: Theme;
  colors: Theme['colors'];
  isDark: boolean;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      colors: theme.colors, 
      isDark, 
      isDarkMode: isDark, 
      toggleTheme 
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
