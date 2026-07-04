import { View } from "react-native";
import { brandColors, brandRadii, brandShadows } from "@/theme/brand";

export function SurfaceCard(input: {
  children: React.ReactNode;
  muted?: boolean;
  padded?: boolean;
}) {
  return (
    <View
      style={{
        backgroundColor: input.muted ? brandColors.surfaceMuted : brandColors.surface,
        borderColor: brandColors.line,
        borderRadius: brandRadii.lg,
        borderWidth: 1,
        boxShadow: brandShadows.subtle,
        gap: 12,
        padding: input.padded === false ? 0 : 16,
      }}
    >
      {input.children}
    </View>
  );
}
