/**
 * Orpheus design system tokens.
 * Every component references these — no hardcoded values.
 */

export const COLORS = {
  bg: "#FAFAF8",
  bgCard: "#FFFFFF",
  bgSurface: "#F5F4F0",
  text: "#1A1A1A",
  textSecondary: "#6B6B6B",
  textMuted: "#A3A3A3",
  accent: "#D4622B",
  accentLight: "#FEF3ED",
  accentText: "#FFFFFF",
  recording: "#DC3545",
  recordingLight: "#FEF0F1",
  success: "#2D8F5C",
  successLight: "#EDFAF2",
  info: "#4A7FD4",
  infoLight: "#EDF4FE",
  warning: "#D4922A",
  border: "#EBEBEB",
  borderLight: "#F2F2F0",
  tag: "#F0EDE8",
} as const;

export const FONTS = {
  regular: "PlusJakartaSans_400Regular",
  medium: "PlusJakartaSans_500Medium",
  semiBold: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
  extraBold: "PlusJakartaSans_800ExtraBold",
  serifRegular: "SourceSerif4_400Regular_Italic",
  serifItalic: "SourceSerif4_400Regular_Italic",
} as const;

export const FONT_SIZES = {
  xs: 11,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  "4xl": 36,
} as const;

export const RADII = {
  small: 8,
  medium: 14,
  large: 20,
  pill: 999,
} as const;

export const AVATAR_COLORS = [
  "#D4622B",
  "#4A7FD4",
  "#2D8F5C",
  "#9B5CFC",
  "#D4922A",
] as const;

export function getAvatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}
