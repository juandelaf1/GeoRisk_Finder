export const colors = {
  bg: '#F7F6F2',
  surface: '#FFFFFF',
  surfaceAlt: '#F9F8F5',
  border: '#E3E0D8',
  text: '#1C1A15',
  textMuted: '#6B6A64',
  primary: '#01696F',
  primaryDark: '#0C4E54',
  primaryLight: '#20808D',
  terra: '#A84B2F',
  gold: '#B37D00',
  mauve: '#7A3B49',
  success: '#3A6B1E',
  warning: '#7A3714',
  ink: '#0D1B2A',
  inkLight: '#253746',
  inkMuted: '#4A5A60',
  inkText: '#C9D4D6',
  bgDark: '#061840',
  bgOverlay: 'rgba(6, 24, 64, 0.95)',
} as const;

export const chartPalette = [
  '#01696F', '#A84B2F', '#0C4E54', '#B37D00',
  '#7A3B49', '#3A6B1E', '#20808D', '#6B6A64',
] as const;

export const chartScaleRiesgo = ['#3A6B1E', '#B37D00', '#A84B2F'] as const;
export const chartScaleTeal = ['#D7E9EA', '#20808D', '#0C4E54'] as const;

export const nivelRango: Record<string, number> = { Bajo: 0, Medio: 1, Alto: 2 };
export const rangoAColor: Record<number, string> = { 0: 'verde', 1: 'naranja', 2: 'rojo' };
export const rangoANivel: Record<number, string> = { 0: 'Bajo', 1: 'Medio', 2: 'Alto' };

export const typography = {
  fontFamily: "'DM Sans', 'Inter', sans-serif",
  fontMono: "'IBM Plex Mono', monospace",
} as const;
