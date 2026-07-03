import { Link, router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { getPricingProviderStatus } from "@/features/pricing/localPricingService";
import { createMockStoredScan, importStoredScanFromLibrary } from "@/features/scans/localScanService";

export default function ScanScreen() {
  const [activeAction, setActiveAction] = useState<"library" | "mock" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pricingProvider = getPricingProviderStatus();

  function handleOpenCamera() {
    setError(null);
    router.push("/camera");
  }

  async function runAction(action: "library" | "mock") {
    setActiveAction(action);
    setError(null);

    try {
      const detail = action === "library" ? await importStoredScanFromLibrary() : await createMockStoredScan();
      router.push({ pathname: "/items/[id]", params: { id: detail.scan.id } });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create scan.");
    } finally {
      setActiveAction(null);
    }
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 20, gap: 20 }}>
      <View style={{ gap: 8 }}>
        <Text selectable style={{ fontSize: 28, fontWeight: "700" }}>
          Scan, price, remember.
        </Text>
        <Text selectable style={{ color: "#4b5563", fontSize: 16, lineHeight: 22 }}>
          Capture an item photo, identify it with local Gemini Nano, then search marketplace comps before deciding whether to save it locally.
        </Text>
      </View>

      <View style={{ gap: 12 }}>
        <ActionButton isActive={false} label="Open Camera" onPress={handleOpenCamera} tone="primary" />
        <ActionButton
          isActive={activeAction === "library"}
          label="Use Existing Photo"
          onPress={() => void runAction("library")}
          tone="secondary"
        />
        <ActionButton
          isActive={activeAction === "mock"}
          label="Create Mock Scan"
          onPress={() => void runAction("mock")}
          tone="secondary"
        />
      </View>

      {error ? (
        <Text selectable style={{ color: "#b91c1c", lineHeight: 20 }}>
          {error}
        </Text>
      ) : null}

      <View style={{ borderColor: "#d1d5db", borderRadius: 8, borderWidth: 1, gap: 6, padding: 14 }}>
        <Text selectable style={{ fontSize: 16, fontWeight: "700" }}>
          Pricing path
        </Text>
        <Text selectable style={{ color: "#4b5563", lineHeight: 20 }}>
          {pricingProvider.mode === "convex_marketplace"
            ? "Real scans use Gemini Nano on-device recognition, then search Reverb for music gear and eBay for broader resale when local cache misses."
            : "Real scan search needs EXPO_PUBLIC_CONVEX_URL. Only Create Mock Scan uses local mock recognition and pricing."}
        </Text>
      </View>

      <View style={{ gap: 12 }}>
        <Link href="/history" asChild>
          <Pressable style={{ borderColor: "#d1d5db", borderRadius: 8, borderWidth: 1, padding: 14 }}>
            <Text style={{ fontSize: 16, fontWeight: "600" }}>View Saved Items</Text>
          </Pressable>
        </Link>
        <Link href="/settings" asChild>
          <Pressable style={{ borderColor: "#d1d5db", borderRadius: 8, borderWidth: 1, padding: 14 }}>
            <Text style={{ fontSize: 16, fontWeight: "600" }}>Settings</Text>
          </Pressable>
        </Link>
      </View>
    </ScrollView>
  );
}

function ActionButton(input: {
  label: string;
  onPress: () => void;
  isActive: boolean;
  tone: "primary" | "secondary";
}) {
  const backgroundColor = input.tone === "primary" ? "#0f172a" : "#ffffff";
  const borderColor = input.tone === "primary" ? "#0f172a" : "#d1d5db";
  const textColor = input.tone === "primary" ? "#ffffff" : "#111827";

  return (
    <Pressable
      disabled={input.isActive}
      onPress={input.onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        backgroundColor: input.isActive
          ? "#9ca3af"
          : input.tone === "primary"
            ? pressed
              ? "#111827"
              : backgroundColor
            : pressed
              ? "#e5e7eb"
              : backgroundColor,
        borderColor,
        borderRadius: 8,
        borderWidth: 1,
        padding: 16,
      })}
    >
      {input.isActive ? (
        <ActivityIndicator color={input.tone === "primary" ? "white" : "#111827"} />
      ) : (
        <Text style={{ color: textColor, fontSize: 17, fontWeight: "700" }}>{input.label}</Text>
      )}
    </Pressable>
  );
}
