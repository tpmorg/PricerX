import { Text, View } from "react-native";
import { brandColors, brandCopy, brandRadii, brandTypography } from "@/theme/brand";

export function BrandMark(input?: { compact?: boolean; inverted?: boolean }) {
  const compact = input?.compact === true;
  const inverted = input?.inverted === true;
  const badgeBackground = inverted ? "rgba(255,255,255,0.16)" : brandColors.primarySoft;
  const badgeText = inverted ? brandColors.white : brandColors.primaryStrong;
  const titleColor = inverted ? brandColors.white : brandColors.ink;
  const subtitleColor = inverted ? "rgba(255,255,255,0.74)" : brandColors.inkMuted;

  return (
    <View style={{ alignItems: "center", flexDirection: "row", gap: compact ? 10 : 12 }}>
      <View
        style={{
          alignItems: "center",
          backgroundColor: badgeBackground,
          borderRadius: brandRadii.md,
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
        <Text selectable style={{ ...brandTypography.sectionTitle, color: titleColor, fontSize: compact ? 18 : 22 }}>
          {brandCopy.appName}
        </Text>
        {!compact ? (
          <Text selectable style={{ ...brandTypography.body, color: subtitleColor, fontSize: 14 }}>
            {brandCopy.tagLine}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
