// ============================================================
//  src/constants/theme.js
//  Global Design System — Colors, Typography, Spacing, Shadows
//  Price and Stock Alert Application
// ============================================================

export const Colors = {
  // Primary brand color (deep blue)
  primary:       '#0F4C81',
  primaryLight:  '#1a6bb5',
  primaryDark:   '#0a3459',

  // Accent / CTA color (orange)
  accent:        '#FF6B35',
  accentLight:   '#FF8C5A',

  // Semantic colors
  success:       '#10B981',
  successLight:  '#D1FAE5',
  warning:       '#F59E0B',
  warningLight:  '#FEF3C7',
  danger:        '#EF4444',
  dangerLight:   '#FEE2E2',

  // Background & surfaces
  bg:            '#F0F4F8',
  card:          '#FFFFFF',
  inputBg:       '#F8FAFC',

  // Text
  text:          '#1A2332',
  textMuted:     '#6B7A8D',
  textLight:     '#9AAABB',

  // Borders & dividers
  border:        '#E2E8F0',
  divider:       '#F1F5F9',

  // Platform badges
  shopee:        '#EE4D2D',
  lazada:        '#0F146D',

  // Tag / chip background
  tagBg:         '#EBF4FF',
  tagText:       '#0F4C81',

  // White & dark
  white:         '#FFFFFF',
  dark:          '#1A2332',
  black:         '#000000',
};

export const FontSize = {
  xs:    11,
  sm:    13,
  base:  15,
  md:    16,
  lg:    18,
  xl:    20,
  xxl:   24,
  xxxl:  28,
  title: 32,
};

export const FontWeight = {
  regular:   '400',
  medium:    '500',
  semiBold:  '600',
  bold:      '700',
  extraBold: '800',
  black:     '900',
};

export const Spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
  xxxl: 32,
  huge: 48,
};

export const Radius = {
  xs:   6,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
  full: 9999,
};

export const Shadow = {
  sm: {
    shadowColor:   '#0F4C81',
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius:  6,
    elevation:     2,
  },
  default: {
    shadowColor:   '#0F4C81',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius:  12,
    elevation:     4,
  },
  lg: {
    shadowColor:   '#0F4C81',
    shadowOffset:  { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius:  24,
    elevation:     8,
  },
  accent: {
    shadowColor:   '#FF6B35',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius:  12,
    elevation:     6,
  },
};
