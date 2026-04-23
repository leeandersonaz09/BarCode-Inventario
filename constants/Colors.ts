export const Colors = {
  light: {
    background: '#F6F8FB',
    surface: '#FFFFFF',
    surfaceMuted: '#EEF3F8',
    text: '#14213D',
    mutedText: '#6B778C',
    tint: '#1F7A68',
    accent: '#EF8354',
    success: '#2EAD6B',
    danger: '#D64545',
    border: '#DDE6EF',
    tabIconDefault: '#7A8797',
    tabIconSelected: '#1F7A68',
  },
  dark: {
    background: '#0E1116',
    surface: '#171C24',
    surfaceMuted: '#222A35',
    text: '#F4F7FB',
    mutedText: '#A7B0BE',
    tint: '#57C7A5',
    accent: '#F4A261',
    success: '#54D489',
    danger: '#FF6B6B',
    border: '#2C3542',
    tabIconDefault: '#7F8B9B',
    tabIconSelected: '#57C7A5',
  },
};

export type AppThemeName = keyof typeof Colors;

export default Colors;
