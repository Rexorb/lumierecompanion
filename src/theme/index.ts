// Valores do tema claro: Lumière/src/styles/_theme.scss; escala: _variables.scss.
export const colors = {
  background: '#fbfbfe', surface: '#f9f9fd', surfaceLow: '#f3f3f7',
  surfaceLowest: '#ffffff', surfaceHigh: '#e4e3ec', text: '#0a0a0f',
  textMuted: '#4a4856', subtle: '#6e6e82', muted: '#9693a4',
  primary: '#000000', onPrimary: '#ffffff', secondary: '#db93ff',
  secondaryLight: '#ead4ff', secondaryDark: '#b85ce0', accent: '#32084c',
  authBackground: '#f3f0f9', border: '#d0d0d8', danger: '#e74c3c',
  success: '#16864b', warning: '#bd7104',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radius = { sm: 4, md: 8, lg: 12, xl: 20, xxl: 32, pill: 9999 } as const;
export const fonts = {
  display: 'CormorantGaramond_300Light', displayItalic: 'CormorantGaramond_300Light_Italic',
  brand: 'CormorantGaramond_600SemiBold_Italic', body: 'DMSans_400Regular',
  medium: 'DMSans_500Medium', semibold: 'DMSans_600SemiBold',
  mono: 'JetBrainsMono_400Regular', monoMedium: 'JetBrainsMono_500Medium',
} as const;
export const typography = { body: 16, caption: 11, title: 44, headline: 52 } as const;
