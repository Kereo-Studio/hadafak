// Light palette — the original brand theme.
export const lightColors = {
  primary: '#5E004A',        // Signature deep purple/magenta
  primaryLight: '#F5ECF4',   // Super soft purple background pill/highlight
  primaryHover: '#4A003B',   // Darker purple for touch feedback
  background: '#FFFFFF',     // Clean page background
  surfaceLight: '#F7FAFC',   // Lightest grey for text inputs & neutral cards
  surfaceMuted: '#E2E8F0',   // Thin borders and divisions

  text: '#111827',           // Bold near-black typography
  textMuted: '#94A3B8',      // Grey subtitle/labels
  textLight: '#64748B',      // Secondary paragraph body text
  textInverse: '#FFFFFF',    // White text on primary buttons

  success: '#10B981',        // Green highlights
  error: '#EF4444',          // Error alerts
  border: '#E8ECF2',         // Very soft input borders
};

// Dark palette — cool-gray family, single magenta accent, off-black surfaces.
export const darkColors: typeof lightColors = {
  primary: '#D45BA3',        // Lightened magenta so it reads as an accent on dark
  primaryLight: '#2A1622',   // Muted dark-purple surface for pills/highlights
  primaryHover: '#E07DB8',   // Brighter magenta for touch feedback
  background: '#0F1115',     // Off-black page background (cool tinted)
  surfaceLight: '#191C22',   // Cards, inputs, neutral surfaces
  surfaceMuted: '#2B313B',   // Thicker dividers / muted fills

  text: '#F1F3F5',           // Near-white typography
  textMuted: '#6B7280',      // Muted grey labels
  textLight: '#9AA4B2',      // Secondary body text
  textInverse: '#FFFFFF',    // White text on primary buttons

  success: '#34D399',        // Green highlights
  error: '#F87171',          // Error alerts
  border: '#252A33',         // Soft dark borders
};

export type ThemeColors = typeof lightColors;

// Backwards-compatible default export (light). Screens that consume the theme
// at runtime should use `useThemeColors()` instead of importing this directly.
export const COLORS = lightColors;

export const FONTS = {
  bold: 'System',
  medium: 'System',
  regular: 'System',
};

export const SHADOWS = {
  subtle: {
    shadowColor: '#5E004A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 4,
  },
};
