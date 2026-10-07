import type { InventoryItem } from "@pricernu/shared";
import { normalizeText } from "@pricernu/shared";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import type { IdentityCandidate, IdentityRevision, StageStatus } from "@/features/scans/localScanService";
import { useTheme } from "@/theme";

export function IdentityPicker(input: {
  candidates: IdentityCandidate[];
  item: InventoryItem | null;
  recognitionStatus: StageStatus;
  recognitionError?: string;
  disabled: boolean;
  onPick: (candidate: IdentityCandidate) => void;
  onSubmit: (revision: IdentityRevision) => void;
}) {
  const theme = useTheme();
  const currentKey = input.item ? normalizeText(input.item.displayName) : null;
  const matchesCandidate = input.candidates.some((candidate) => candidate.key === currentKey);
  const recognitionFailed = input.recognitionStatus === "failed" && !input.item;
  const [isEditing, setIsEditing] = useState(recognitionFailed);

  useEffect(() => {
    if (recognitionFailed) setIsEditing(true);
  }, [recognitionFailed]);

  if (input.recognitionStatus === "running") {
    return (
      <View style={{ alignItems: "center", borderColor: theme.colors.neutralBorder, borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 12, padding: 14 }}>
        <ActivityIndicator color={theme.colors.primary} />
        <Text selectable style={{ color: theme.colors.textMuted, flex: 1, lineHeight: 20 }}>
          Identifying the item on-device…
        </Text>
      </View>
    );
  }

  const heading = input.candidates.length > 1 ? "Is it one of these?" : input.item ? "Is this right?" : "What is it?";

  return (
    <View style={{ gap: 10 }}>
      <View style={{ gap: 2 }}>
        <Text selectable style={{ color: theme.colors.text, fontSize: 16, fontWeight: "700" }}>
          {heading}
        </Text>
        <Text selectable style={{ color: theme.colors.textMuted, fontSize: 13, lineHeight: 18 }}>
          {recognitionFailed
            ? "We couldn't identify this automatically. Tell us what it is and we'll search for prices."
            : "Pick the closest match. Prices update for the item you choose."}
        </Text>
        {recognitionFailed && input.recognitionError ? (
          <Text selectable style={{ color: theme.colors.textSoft, fontSize: 12, lineHeight: 17 }}>
            {input.recognitionError}
          </Text>
        ) : null}
      </View>

      {input.item && !matchesCandidate ? (
        <CandidateRow
          title={input.item.displayName}
          subtitle={formatDetails(input.item) || "Your edit"}
          isSelected
          disabled
          onPress={() => undefined}
        />
      ) : null}

      {input.candidates.map((candidate) => (
        <CandidateRow
          key={candidate.key}
          title={candidate.displayName}
          subtitle={formatDetails(candidate)}
          isSelected={candidate.key === currentKey}
          disabled={input.disabled || candidate.key === currentKey}
          onPress={() => {
            setIsEditing(false);
            input.onPick(candidate);
          }}
        />
      ))}

      {isEditing ? (
        <IdentityForm
          item={input.item}
          disabled={input.disabled}
          onCancel={recognitionFailed ? undefined : () => setIsEditing(false)}
          onSubmit={(revision) => {
            setIsEditing(false);
            input.onSubmit(revision);
          }}
        />
      ) : (
        <Pressable
          accessibilityRole="button"
          disabled={input.disabled}
          onPress={() => setIsEditing(true)}
          style={({ pressed }) => ({
            alignItems: "center",
            borderColor: theme.colors.neutralBorder,
            borderRadius: 8,
            borderStyle: "dashed",
            borderWidth: 1,
            backgroundColor: pressed ? theme.colors.surfaceMuted : "transparent",
            minHeight: 48,
            justifyContent: "center",
            opacity: input.disabled ? 0.5 : 1,
          })}
        >
          <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: "700" }}>Something else…</Text>
        </Pressable>
      )}
    </View>
  );
}

function CandidateRow(input: {
  title: string;
  subtitle: string;
  isSelected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: input.isSelected, disabled: input.disabled }}
      disabled={input.disabled}
      onPress={input.onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        backgroundColor: input.isSelected ? theme.colors.primarySoft : pressed ? theme.colors.surfaceMuted : theme.colors.surface,
        borderColor: input.isSelected ? theme.colors.primary : theme.colors.neutralBorder,
        borderRadius: 8,
        borderWidth: 1,
        flexDirection: "row",
        gap: 12,
        padding: 14,
      })}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: "800" }}>{input.title}</Text>
        {input.subtitle ? (
          <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>{input.subtitle}</Text>
        ) : null}
      </View>
      <View
        style={{
          alignItems: "center",
          backgroundColor: input.isSelected ? theme.colors.primary : "transparent",
          borderColor: input.isSelected ? theme.colors.primary : theme.colors.neutralBorder,
          borderRadius: theme.radii.full,
          borderWidth: 2,
          height: 22,
          justifyContent: "center",
          width: 22,
        }}
      >
        {input.isSelected ? <Text style={{ color: theme.colors.textInverse, fontSize: 12, fontWeight: "900" }}>✓</Text> : null}
      </View>
    </Pressable>
  );
}

function IdentityForm(input: {
  item: InventoryItem | null;
  disabled: boolean;
  onCancel: (() => void) | undefined;
  onSubmit: (revision: IdentityRevision) => void;
}) {
  const theme = useTheme();
  const [name, setName] = useState(input.item?.displayName ?? "");
  const [brand, setBrand] = useState(input.item?.brand ?? "");
  const [model, setModel] = useState(input.item?.model ?? "");
  const [category, setCategory] = useState(input.item?.category ?? "");
  const canSubmit = !input.disabled && name.trim().length > 0;

  function submit() {
    if (!canSubmit) return;
    input.onSubmit({
      displayName: name.trim(),
      ...(brand.trim() ? { brand: brand.trim() } : {}),
      ...(model.trim() ? { model: model.trim() } : {}),
      ...(category.trim() ? { category: category.trim() } : {}),
    });
  }

  return (
    <View style={{ backgroundColor: theme.colors.neutralSurface, borderColor: theme.colors.neutralBorder, borderRadius: 8, borderWidth: 1, gap: 10, padding: 14 }}>
      <FormField label="Item name" value={name} onChangeText={setName} placeholder="e.g. DS-1 Distortion pedal" disabled={input.disabled} />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <FormField label="Brand" value={brand} onChangeText={setBrand} placeholder="Boss" disabled={input.disabled} />
        </View>
        <View style={{ flex: 1 }}>
          <FormField label="Model" value={model} onChangeText={setModel} placeholder="DS-1" disabled={input.disabled} autoCapitalize="characters" />
        </View>
      </View>
      <FormField label="Category" value={category} onChangeText={setCategory} placeholder="guitar pedal" disabled={input.disabled} />

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Pressable
          accessibilityRole="button"
          disabled={!canSubmit}
          onPress={submit}
          style={({ pressed }) => ({
            alignItems: "center",
            backgroundColor: !canSubmit ? theme.colors.disabled : pressed ? theme.colors.primaryStrong : theme.colors.primary,
            borderRadius: theme.radii.md,
            flex: 1,
            justifyContent: "center",
            minHeight: 44,
            paddingHorizontal: 14,
          })}
        >
          <Text style={{ color: theme.colors.textInverse, fontSize: 15, fontWeight: "800" }}>Search with these details</Text>
        </Pressable>
        {input.onCancel ? (
          <Pressable
            accessibilityRole="button"
            onPress={input.onCancel}
            style={({ pressed }) => ({
              alignItems: "center",
              borderColor: theme.colors.neutralBorder,
              borderRadius: theme.radii.md,
              borderWidth: 1,
              backgroundColor: pressed ? theme.colors.surfaceMuted : theme.colors.surface,
              justifyContent: "center",
              minHeight: 44,
              paddingHorizontal: 14,
            })}
          >
            <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: "700" }}>Cancel</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function FormField(input: {
  label: string;
  value: string;
  placeholder: string;
  disabled: boolean;
  autoCapitalize?: "words" | "characters";
  onChangeText: (value: string) => void;
}) {
  const theme = useTheme();

  return (
    <View style={{ gap: 4 }}>
      <Text style={{ color: theme.colors.textSoft, fontSize: 13, fontWeight: "700" }}>{input.label}</Text>
      <TextInput
        autoCapitalize={input.autoCapitalize ?? "words"}
        autoCorrect={false}
        editable={!input.disabled}
        onChangeText={input.onChangeText}
        placeholder={input.placeholder}
        placeholderTextColor={theme.colors.textSoft}
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.neutralBorder,
          borderRadius: 8,
          borderWidth: 1,
          color: theme.colors.text,
          fontSize: 16,
          paddingHorizontal: 12,
          paddingVertical: 10,
        }}
        value={input.value}
      />
    </View>
  );
}

function formatDetails(value: { brand?: string; model?: string; category?: string }): string {
  return [value.brand, value.model, value.category].filter(Boolean).join(" · ");
}
