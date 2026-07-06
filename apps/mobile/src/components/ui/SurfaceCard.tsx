import { View } from "react-native";
import { useTheme } from "@/theme";

export function SurfaceCard(input: {
  children: React.ReactNode;
  muted?: boolean;
  padded?: boolean;
}) {
  const theme = useTheme();

  return (
    <View
      style={{
        backgroundColor: input.muted ? theme.colors.surfaceMuted : theme.colors.surface,
        borderColor: theme.colors.border,
        borderRadius: theme.radii.lg,
        borderWidth: 1,
        boxShadow: theme.shadows.subtle,
        gap: 12,
        padding: input.padded === false ? 0 : 16,
      }}
    >
      {input.children}
    </View>
  );
}
