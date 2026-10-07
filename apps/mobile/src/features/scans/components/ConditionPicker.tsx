import type { ConditionGrade } from "@pricernu/shared";
import { Pressable, Text, View } from "react-native";
import { useTheme } from "@/theme";

const CONDITION_OPTIONS: Array<{ value: ConditionGrade | null; label: string }> = [
  { value: null, label: "Any" },
  { value: "new", label: "New" },
  { value: "used", label: "Used" },
  { value: "for_parts", label: "For parts" },
];

export function ConditionPicker(input: {
  value: ConditionGrade | undefined;
  disabled: boolean;
  onChange: (value: ConditionGrade | null) => void;
}) {
  const theme = useTheme();
  const selected = input.value ?? null;

  return (
    <View style={{ gap: 10 }}>
      <View style={{ gap: 2 }}>
        <Text selectable style={{ color: theme.colors.text, fontSize: 16, fontWeight: "700" }}>
          Condition
        </Text>
        <Text selectable style={{ color: theme.colors.textMuted, fontSize: 13, lineHeight: 18 }}>
          Prices are filtered to listings in this condition.
        </Text>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {CONDITION_OPTIONS.map((option) => {
          const isSelected = option.value === selected;
          return (
            <Pressable
              key={option.label}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected, disabled: input.disabled }}
              disabled={input.disabled || isSelected}
              onPress={() => input.onChange(option.value)}
              style={({ pressed }) => ({
                backgroundColor: isSelected ? theme.colors.primary : pressed ? theme.colors.surfaceMuted : theme.colors.surface,
                borderColor: isSelected ? theme.colors.primary : theme.colors.neutralBorder,
                borderRadius: theme.radii.full,
                borderWidth: 1,
                minHeight: 40,
                justifyContent: "center",
                opacity: input.disabled && !isSelected ? 0.5 : 1,
                paddingHorizontal: 16,
              })}
            >
              <Text style={{ color: isSelected ? theme.colors.textInverse : theme.colors.text, fontSize: 14, fontWeight: "700" }}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
