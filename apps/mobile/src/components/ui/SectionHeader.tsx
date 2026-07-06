import { Text, View } from "react-native";
import { useTheme } from "@/theme";

export function SectionHeader(input: {
  eyebrow?: string;
  title: string;
  description?: string;
  trailing?: React.ReactNode;
  inverted?: boolean;
}) {
  const theme = useTheme();
  const inverted = input.inverted === true;
  const titleColor = inverted ? theme.colors.textInverse : theme.colors.text;
  const bodyColor = inverted ? theme.colors.overlayInverseTextBody : theme.colors.textMuted;
  const eyebrowColor = inverted ? theme.colors.overlayInverseTextSoft : theme.colors.primaryStrong;

  return (
    <View style={{ alignItems: "flex-start", flexDirection: "row", gap: 12, justifyContent: "space-between" }}>
      <View style={{ flex: 1, gap: 6 }}>
        {input.eyebrow ? (
          <Text selectable style={{ ...theme.typography.eyebrow, color: eyebrowColor, textTransform: "uppercase" }}>
            {input.eyebrow}
          </Text>
        ) : null}
        <Text selectable style={{ ...theme.typography.heroTitle, color: titleColor }}>
          {input.title}
        </Text>
        {input.description ? (
          <Text selectable style={{ ...theme.typography.body, color: bodyColor, lineHeight: 21 }}>
            {input.description}
          </Text>
        ) : null}
      </View>
      {input.trailing ? <View>{input.trailing}</View> : null}
    </View>
  );
}
