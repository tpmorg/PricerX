import { Text, View } from "react-native";
import { brandColors, brandTypography } from "@/theme/brand";

export function SectionHeader(input: {
  eyebrow?: string;
  title: string;
  description?: string;
  trailing?: React.ReactNode;
  inverted?: boolean;
}) {
  const inverted = input.inverted === true;
  const titleColor = inverted ? brandColors.white : brandColors.ink;
  const bodyColor = inverted ? "rgba(255,255,255,0.78)" : brandColors.inkMuted;
  const eyebrowColor = inverted ? "rgba(255,255,255,0.68)" : brandColors.primaryStrong;

  return (
    <View style={{ alignItems: "flex-start", flexDirection: "row", gap: 12, justifyContent: "space-between" }}>
      <View style={{ flex: 1, gap: 6 }}>
        {input.eyebrow ? (
          <Text selectable style={{ ...brandTypography.eyebrow, color: eyebrowColor, textTransform: "uppercase" }}>
            {input.eyebrow}
          </Text>
        ) : null}
        <Text selectable style={{ ...brandTypography.heroTitle, color: titleColor }}>
          {input.title}
        </Text>
        {input.description ? (
          <Text selectable style={{ ...brandTypography.body, color: bodyColor, lineHeight: 21 }}>
            {input.description}
          </Text>
        ) : null}
      </View>
      {input.trailing ? <View>{input.trailing}</View> : null}
    </View>
  );
}
