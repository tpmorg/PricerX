import { DatabaseZap, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandMark } from "@/components/brand/BrandMark";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { resetAllLocalData } from "@/features/scans/localScanService";
import { brandColors, brandRadii, brandTypography } from "@/theme/brand";

export default function SettingsScreen() {
  const [isResetting, setIsResetting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function confirmReset() {
    if (isResetting) return;

    Alert.alert(
      "Reset local data?",
      "This will permanently delete saved items, scans, photos, pricing results, and staged unsaved results on this device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            void handleReset();
          },
        },
      ],
    );
  }

  async function handleReset() {
    setIsResetting(true);
    setMessage(null);
    setError(null);

    try {
      await resetAllLocalData();
      setMessage("Local app data cleared.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not clear local data.");
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <SafeAreaView style={{ backgroundColor: brandColors.canvas, flex: 1 }} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 32, paddingTop: 12 }}>
        <SurfaceCard>
          <View style={{ gap: 16 }}>
            <BrandMark compact />
            <SectionHeader
              eyebrow="Controls"
              title="Local-first settings"
              description="Account sync, cloud enrichment, and credits are intentionally absent from this slice. Local scans should remain useful without any backend."
              trailing={<DatabaseZap color={brandColors.primaryStrong} size={22} strokeWidth={2.25} />}
            />
          </View>
        </SurfaceCard>

        <SurfaceCard>
          <Text selectable style={{ ...brandTypography.sectionTitle, color: brandColors.ink, fontSize: 18 }}>
            Storage
          </Text>
          <Text selectable style={{ color: brandColors.inkMuted, lineHeight: 20 }}>
            SQLite is the source of truth for saved items, scans, and pricing history on this device.
          </Text>

          <Pressable
            disabled={isResetting}
            onPress={confirmReset}
            style={({ pressed }) => ({
              flexDirection: "row",
              gap: 10,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isResetting ? "#FCA5A5" : pressed ? "#991B1B" : brandColors.danger,
              borderRadius: brandRadii.md,
              padding: 14,
            })}
          >
            {isResetting ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Trash2 color="white" size={18} strokeWidth={2.25} />
                <Text style={{ color: "white", fontSize: 16, fontWeight: "700" }}>Reset Local Data</Text>
              </>
            )}
          </Pressable>

          <Text selectable style={{ color: brandColors.inkSoft, fontSize: 13, lineHeight: 18 }}>
            Clears saved items, scan history, pricing rows, saved photos, recognition/OCR records, and unsaved staged results.
          </Text>

          {message ? (
            <Text selectable style={{ color: brandColors.success, lineHeight: 20 }}>
              {message}
            </Text>
          ) : null}

          {error ? (
            <Text selectable style={{ color: brandColors.danger, lineHeight: 20 }}>
              {error}
            </Text>
          ) : null}
        </SurfaceCard>
      </ScrollView>
    </SafeAreaView>
  );
}
