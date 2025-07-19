// Theme type definitions for the app

export interface ThemeColors {
  primary: string;
  secondary: string;
  tertiary: string;
  background: string;
  surface: string;
  modalBackground: string;
  cardBackground: string;
  headerBackground: string;
  navBackground: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  error: string;
  warning: string;
  success: string;
  info: string;
  border: string;
  borderLight: string;
  shadowColor: string;
  statusBarContent: 'light-content' | 'dark-content';
  iconColor: string;
  placeholderColor: string;
  keyboardAppearance: 'light' | 'dark';
}

export interface ThemeGradients {
  primary: string[];
  secondary: string[];
  surface: string[];
  card: string[];
  button: string[];
  header: string[];
  nav: string[];
}

export interface Theme {
  id: string;
  name: string;
  colors: ThemeColors;
  gradients: ThemeGradients;
  type: 'light' | 'dark';
}

export interface NFTAvatar {
  id: string;
  name: string;
  image?: string;
  uri?: string;
  collection?: string;
  tokenId?: string;
}

export interface EventHandler<T = any> {
  (event: T): void;
}