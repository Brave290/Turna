export const colors = {
  forest: '#0A1628',
  forestDark: '#12233D',
  primary: '#007A65',
  primaryHover: '#006B59',
  primaryLight: '#7CE8D7',
  violet: '#6D4DE0',
  sky: '#38BDF8',
  cream: '#F4F7FB',
  white: '#ffffff',
  muted: '#4A5D73',
  border: '#D0DBE8',
  error: '#B4233B',
  warning: '#8A5A00',
  success: '#007A65',
  card: '#ffffff',
} as const;

export type Palette = { [K in keyof typeof colors]: string } & {
  bg: string;
  surface: string;
  text: string;
  textMuted: string;
  brand: string;
  primarySolid: string;
  errorSolid: string;
};

export const palettes = {
  light: {
    ...colors,
    bg: colors.cream,
    surface: colors.white,
    text: colors.forest,
    textMuted: colors.muted,
    brand: colors.forest,
    primarySolid: colors.primary,
    errorSolid: colors.error,
  },
  dark: {
    forest: '#E8F7EE',
    forestDark: '#12233D',
    primary: '#7CE8D7',
    primaryHover: '#68D9C6',
    primaryLight: '#7CE8D7',
    violet: '#A794F5',
    sky: '#38BDF8',
    cream: '#08111E',
    white: '#FFFFFF',
    muted: '#9BB0BF',
    border: 'rgba(232, 247, 238, 0.12)',
    error: '#FF8FA3',
    warning: '#E6B45C',
    success: '#7CE8D7',
    card: '#101D2D',
    bg: '#08111E',
    surface: '#101D2D',
    text: '#E8F7EE',
    textMuted: '#9BB0BF',
    brand: '#0A1628',
    primarySolid: '#007A65',
    errorSolid: '#B4233B',
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 40,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 16,
  full: 999,
} as const;

export const typography = {
  caption: 13,
  body: 15,
  heading: 20,
  title: 26,
} as const;
