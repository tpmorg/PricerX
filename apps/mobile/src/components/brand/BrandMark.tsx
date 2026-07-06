import { Text, View } from "react-native";
import { useTheme } from "@/theme";

export function BrandMark(input?: { compact?: boolean; inverted?: boolean }) {
  const theme = useTheme();
  const compact = input?.compact === true;
  const inverted = input?.inverted === true;
  const badgeBackground = inverted ? theme.colors.overlayInverseSoft : theme.colors.primarySoft;
  const badgeText = inverted ? theme.colors.textInverse : theme.colors.primaryStrong;
  const titleColor = inverted ? theme.colors.textInverse : theme.colors.text;
  const subtitleColor = inverted ? theme.colors.overlayInverseTextMuted : theme.colors.textMuted;

  return (
    <View style={{ alignItems: "center", flexDirection: "row", gap: compact ? 10 : 12 }}>
      <View
        style={{
          alignItems: "center",
          backgroundColor: badgeBackground,
          borderRadius: theme.radii.md,
          height: compact ? 42 : 48,
          justifyContent: "center",
          width: compact ? 42 : 48,
        }}
      >
        <Text
          selectable
          style={{
            color: badgeText,
            fontSize: compact ? 17 : 18,
            fontWeight: "900",
          }}
        >
          PR
        </Text>
      </View>

      <View style={{ gap: compact ? 0 : 2 }}>
        <Text selectable style={{ ...theme.typography.sectionTitle, color: titleColor, fontSize: compact ? 18 : 22 }}>
          {theme.copy.appName}
        </Text>
        {!compact ? (
          <Text selectable style={{ ...theme.typography.body, color: subtitleColor, fontSize: 14 }}>
            {theme.copy.tagLine}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
