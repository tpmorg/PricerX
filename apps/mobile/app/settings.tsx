import { ScrollView, Text, View } from "react-native";

export default function SettingsScreen() {
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 20, gap: 18 }}>
      <View style={{ gap: 8 }}>
        <Text selectable style={{ fontSize: 22, fontWeight: "700" }}>
          Local-first settings
        </Text>
        <Text selectable style={{ color: "#4b5563", fontSize: 16, lineHeight: 22 }}>
          Account sync, cloud enrichment, and credits are intentionally absent from this slice. Local scans should remain useful without any backend.
        </Text>
      </View>

      <View style={{ borderColor: "#d1d5db", borderRadius: 8, borderWidth: 1, gap: 8, padding: 14 }}>
        <Text selectable style={{ fontSize: 16, fontWeight: "700" }}>
          Storage
        </Text>
        <Text selectable style={{ color: "#4b5563", lineHeight: 20 }}>
          SQLite is the source of truth for the scan-history loop.
        </Text>
      </View>
    </ScrollView>
  );
}
