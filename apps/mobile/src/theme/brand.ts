export const brandColors = {
  canvas: "#F4F7FA",
  surface: "#FFFFFF",
  surfaceMuted: "#E8EEF3",
  surfaceStrong: "#DDE7EE",
  ink: "#14202B",
  inkMuted: "#566170",
  inkSoft: "#7D8794",
  line: "#D6E0E8",
  primary: "#0F766E",
  primaryStrong: "#115E59",
  primarySoft: "#D7F3EE",
  accent: "#B45309",
  accentSoft: "#FFEDD5",
  success: "#166534",
  danger: "#B91C1C",
  overlay: "rgba(17, 27, 38, 0.78)",
  overlaySoft: "rgba(17, 27, 38, 0.38)",
  white: "#FFFFFF",
} as const;

export const brandSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const brandRadii = {
  sm: 8,
  md: 12,
  lg: 18,
  full: 999,
} as const;

export const brandTypography = {
  eyebrow: {
    fontSize: 12,
    fontWeight: "800" as const,
    letterSpacing: 0,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800" as const,
    letterSpacing: 0,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: "800" as const,
    letterSpacing: 0,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "800" as const,
    letterSpacing: 0,
  },
  body: {
    fontSize: 15,
    fontWeight: "500" as const,
    letterSpacing: 0,
  },
  bodyStrong: {
    fontSize: 15,
    fontWeight: "700" as const,
    letterSpacing: 0,
  },
  label: {
    fontSize: 13,
    fontWeight: "700" as const,
    letterSpacing: 0,
  },
} as const;

export const brandShadows = {
  card: "0 14px 28px rgba(20, 32, 43, 0.10)",
  floating: "0 16px 36px rgba(20, 32, 43, 0.16)",
  subtle: "0 6px 18px rgba(20, 32, 43, 0.08)",
} as const;

export const brandCopy = {
  appName: "Pricernu",
  tagLine: "Capture. Price. Keep.",
} as const;
