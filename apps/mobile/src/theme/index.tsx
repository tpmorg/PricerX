import { createContext, useContext, type ReactNode } from "react";
import { brandColors, brandCopy, brandRadii, brandShadows, brandSpacing, brandTypography } from "./brand";

export const lightTheme = {
  colors: {
    background: brandColors.canvas,
    surface: brandColors.surface,
    surfaceMuted: brandColors.surfaceMuted,
    surfaceStrong: brandColors.surfaceStrong,
    surfaceInverse: brandColors.ink,
    border: brandColors.line,
    text: brandColors.ink,
    textMuted: brandColors.inkMuted,
    textSoft: brandColors.inkSoft,
    textInverse: brandColors.white,
    primary: brandColors.primary,
    primaryStrong: brandColors.primaryStrong,
    primarySoft: brandColors.primarySoft,
    accent: brandColors.accent,
    accentSoft: brandColors.accentSoft,
    success: brandColors.success,
    danger: brandColors.danger,
    dangerStrong: "#991B1B",
    dangerSoft: "#FCA5A5",
    info: "#1D4ED8",
    infoStrong: "#1E3A8A",
    infoSoft: "#EFF6FF",
    infoBorder: "#BFDBFE",
    disabled: "#9CA3AF",
    neutralStrong: "#111827",
    neutralSurface: "#F8FAFC",
    neutralSurfaceStrong: "#E5E7EB",
    neutralBorder: "#D1D5DB",
    neutralBorderSoft: "#CBD5E1",
    neutralOverlay: "rgba(17, 27, 38, 0.52)",
    imageFallback: "#DBE4EA",
    overlay: brandColors.overlay,
    overlaySoft: brandColors.overlaySoft,
    overlayTint: "rgba(17, 27, 38, 0.08)",
    overlayInverseSoft: "rgba(255,255,255,0.16)",
    overlayInverseMuted: "rgba(255,255,255,0.24)",
    overlayInversePanel: "rgba(255,255,255,0.92)",
    overlayInverseTextMuted: "rgba(255,255,255,0.74)",
    overlayInverseTextSoft: "rgba(255,255,255,0.68)",
    overlayInverseTextBody: "rgba(255,255,255,0.78)",
    cameraBackdrop: "#000000",
    cameraControl: "rgba(0,0,0,0.45)",
    cameraControlPressed: "rgba(255,255,255,0.2)",
    cameraControlBorder: "rgba(255,255,255,0.24)",
    cameraFrameBorder: "rgba(255,255,255,0.6)",
    cameraShutterOuter: "rgba(255,255,255,0.18)",
    cameraShutterOuterBorder: "rgba(255,255,255,0.3)",
    cameraError: "#FCA5A5",
    link: "#1D4ED8",
    linkMuted: "#64748B",
    badgeNeutral: "#374151",
    badgeInfo: "#EEF2FF",
    badgeInfoText: "#3730A3",
  },
  spacing: brandSpacing,
  radii: brandRadii,
  typography: brandTypography,
  shadows: brandShadows,
  copy: brandCopy,
} as const;

export type AppTheme = typeof lightTheme;

const ThemeContext = createContext<AppTheme>(lightTheme);

export function ThemeProvider({ children }: { children: ReactNode }) {
  return <ThemeContext.Provider value={lightTheme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): AppTheme {
  return useContext(ThemeContext);
}
