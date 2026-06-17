import { Platform } from 'react-native';

// ─── Original light/dark system colors ────────────────────────────────────────
export const Colors = {
  light: {
    text:               '#1A1A1A',  // near-black — softer than pure black, less eye strain
    background:         '#F8F8F6',  // warm white — easier on eyes than pure white
    backgroundElement:  '#EFEFED',
    backgroundSelected: '#E2E2DF',
    textSecondary:      '#6B6B6B',
  },
  dark: {
    text:               '#F0EEE6',  // warm white — not pure white, reduces glare
    background:         '#111110',  // near-black — pure black causes halation on OLED
    backgroundElement:  '#1C1C1B',
    backgroundSelected: '#282826',
    textSecondary:      '#8C8C89',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans:    'system-ui',
    serif:   'ui-serif',
    rounded: 'ui-rounded',
    mono:    'ui-monospace',
  },
  default: {
    sans:    'normal',
    serif:   'serif',
    rounded: 'normal',
    mono:    'monospace',
  },
  web: {
    sans:    'var(--font-display)',
    serif:   'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono:    'var(--font-mono)',
  },
});

export const Spacing = {
  half:  2,
  one:   4,
  two:   8,
  three: 16,
  four:  24,
  five:  32,
  six:   64,
} as const;

export const BottomTabInset  = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;


// ─── Medha diary app color system ─────────────────────────────────────────────
// Built on human psychology principles:
//   • Background: #111110 — near-black, not pure black. Pure black (#000) causes
//     "halation" where bright text bleeds on OLED screens making reading harder.
//   • Text: #F0EEE6 — warm white. Pure white (#FFF) on dark bg creates too much
//     contrast (>21:1) which fatigues eyes during long diary writing sessions.
//     Warm white sits at ~16:1 contrast — readable without strain.
//   • Surface layers: each step up is +8 lightness — gives clear visual hierarchy
//     without introducing color. The brain perceives depth through lightness alone.
//   • Accent: #C8A96E — warm gold. The only non-neutral color. Gold on near-black
//     is historically associated with journaling, reflection, and premium quality.
//     It draws the eye without the aggression of blue or the anxiety of red.
//   • Muted text: #7A7A76 — exactly mid-grey. Used for hints, timestamps, labels
//     that should be readable but not competing with content.

export const COLORS = {
  // ── Backgrounds (darkest to lightest) ──
  background:    '#111110',  // main screen bg — near-black
  surface:       '#1C1C1B',  // cards, modals — one step lighter
  surfaceRaised: '#252524',  // input fields, dropdowns
  overlay:       '#2E2E2C',  // selected states, hover

  // ── Text ──
  textPrimary:   '#F0EEE6',  // main text — warm white, not pure
  textSecondary: '#B0AEA8',  // supporting text — light grey
  textMuted:     '#7A7A76',  // hints, timestamps, labels
  textDisabled:  '#4A4A48',  // disabled state

  // ── Borders & Dividers ──
  border:        '#2A2A28',  // subtle border
  borderStrong:  '#3D3D3A',  // stronger border for focus states

  // ── Accent — warm gold ──
  // Used ONLY for primary actions, active states, and highlights.
  // Keep usage minimal — its power comes from scarcity.
  primary:       '#C8A96E',  // warm gold — main accent
  primaryLight:  '#D4BB8A',  // hover / lighter variant
  primaryDark:   '#A88B52',  // pressed state
  primaryFaint:  '#C8A96E18',// 10% opacity — for subtle bg tints

  // ── Semantic colors ──
  // Kept very muted — this is a diary, not a dashboard.
  success:  '#6A9E72',  // muted green — for saved, synced states
  warning:  '#B8915A',  // muted amber — for unsynced, pending
  error:    '#A05252',  // muted red — for errors
  info:     '#5A7A9E',  // muted blue — for informational states

  // ── Mood colors — used in mood picker and calendar ──
  // Warm to cool — maps naturally to positive to negative emotions.
  moodAmazing: '#C8A96E',  // gold    — amazing
  moodGood:    '#6A9E72',  // green   — good
  moodNeutral: '#7A7A76',  // grey    — neutral
  moodBad:     '#8A7A9E',  // muted purple — bad
  moodAwful:   '#A05252',  // muted red    — awful

  // ── Pure values ──
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

// ─── Spacing scale ────────────────────────────────────────────────────────────
// Based on 4pt grid — every value is a multiple of 4.
// This creates visual rhythm — elements feel intentionally placed.
export const SPACING = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
  xxxl: 64,
};

// ─── Typography scale ─────────────────────────────────────────────────────────
// Modular scale ratio 1.2 (minor third) — sizes feel related, not random.
export const FONT_SIZE = {
  xs:      11,  // timestamps, labels
  sm:      13,  // secondary text, captions
  md:      15,  // body text — diary content reads at this size
  lg:      18,  // subheadings
  xl:      22,  // screen titles
  xxl:     28,  // hero text
  display: 36,  // large display moments
};

export const FONT_WEIGHT = {
  regular:  '400' as const,
  medium:   '500' as const,
  semibold: '600' as const,
  bold:     '700' as const,
  heavy:    '800' as const,
};

// ─── Border radius ────────────────────────────────────────────────────────────
// Soft but not bubbly — suits the calm tone of a diary app.
export const BORDER_RADIUS = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  full: 999,
};

// ─── Shadows ──────────────────────────────────────────────────────────────────
// On dark backgrounds, shadows are nearly invisible.
// Use elevation (Android) and subtle shadow (iOS) only where needed.
export const SHADOW = {
  sm: {
    shadowColor:   '#000000',
    shadowOffset:  { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius:  2,
    elevation:     2,
  },
  md: {
    shadowColor:   '#000000',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius:  8,
    elevation:     5,
  },
};

// ─── Mood options — used across diary editor and calendar ────────────────────
export const MOOD_OPTIONS = [
  { label: 'amazing' as const, score: 5, emoji: '🤩', color: COLORS.moodAmazing },
  { label: 'good'    as const, score: 4, emoji: '😊', color: COLORS.moodGood    },
  { label: 'neutral' as const, score: 3, emoji: '😐', color: COLORS.moodNeutral },
  { label: 'bad'     as const, score: 2, emoji: '😔', color: COLORS.moodBad     },
  { label: 'awful'   as const, score: 1, emoji: '😞', color: COLORS.moodAwful   },
];
// ─── Light theme colors ────────────────────────────────────────────────────
export const LIGHT_COLORS = {
  // Backgrounds
  background:    '#F8F8F6',  // warm white
  surface:       '#FFFFFF',
  surfaceRaised: '#F0EFED',
  overlay:       '#E8E7E4',

  // Text
  textPrimary:   '#1A1A1A',  // near black
  textSecondary: '#4A4A4A',
  textMuted:     '#8A8A8A',
  textDisabled:  '#C0C0C0',

  // Borders
  border:        '#E0DFD8',
  borderStrong:  '#C8C7C0',

  // Accent — same gold works on both themes
  primary:       '#B8922A',  // slightly darker gold for light bg
  primaryLight:  '#C8A96E',
  primaryDark:   '#8B6914',
  primaryFaint:  '#C8A96E18',

  // Semantic
  success:  '#4A7A52',
  warning:  '#9A7040',
  error:    '#8A3A3A',
  info:     '#3A5A7A',

  // Mood colors
  moodAmazing: '#B8922A',
  moodGood:    '#4A7A52',
  moodNeutral: '#8A8A8A',
  moodBad:     '#6A5A7A',
  moodAwful:   '#8A3A3A',

  white:       '#FFFFFF',
  black:       '#000000',
  transparent: 'transparent',
};

export type ThemeMode = 'dark' | 'light';