import { Brain, CloudCog, HardDriveDownload, UserCircle2 } from "lucide-react-native";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getPricingProviderStatus } from "@/features/pricing/localPricingService";

export default function AccountScreen() {
  const pricingProvider = getPricingProviderStatus();

  return (
    <SafeAreaView style={{ backgroundColor: "#ffffff", flex: 1 }} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 32, paddingTop: 12 }}>
        <View style={{ gap: 6 }}>
          <View style={{ alignItems: "center", flexDirection: "row", gap: 10 }}>
            <UserCircle2 color="#111827" size={24} strokeWidth={2.25} />
            <Text selectable style={{ fontSize: 28, fontWeight: "800" }}>
              Account
            </Text>
          </View>
          <Text selectable style={{ color: "#4b5563", lineHeight: 21 }}>
            This build is still device-first. Marketplace credentials and sync can plug in later without changing the basic capture flow.
          </Text>
        </View>

        <View style={{ borderColor: "#d1d5db", borderRadius: 8, borderWidth: 1, gap: 10, padding: 14 }}>
          <Text selectable style={{ fontSize: 16, fontWeight: "700" }}>
            App mode
          </Text>
          <Field label="Recognition" value="Gemini Nano on device" icon={<Brain color="#6b7280" size={18} strokeWidth={2.25} />} />
          <Field
            label="Pricing"
            value={pricingProvider.mode === "convex_marketplace" ? "Marketplace search via Convex" : "Local mock pricing"}
            icon={<CloudCog color="#6b7280" size={18} strokeWidth={2.25} />}
          />
          <Field label="Saved data" value="Stored locally on this device" icon={<HardDriveDownload color="#6b7280" size={18} strokeWidth={2.25} />} />
        </View>

        <View style={{ borderColor: "#d1d5db", borderRadius: 8, borderWidth: 1, gap: 8, padding: 14 }}>
          <Text selectable style={{ fontSize: 16, fontWeight: "700" }}>
            Next up
          </Text>
          <Text selectable style={{ color: "#4b5563", lineHeight: 20 }}>
            When account features land, this is where we can surface provider connections, sync state, and plan-level controls without crowding the capture flow.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <View style={{ alignItems: "flex-start", flexDirection: "row", gap: 10 }}>
      {icon ? <View style={{ paddingTop: 2 }}>{icon}</View> : null}
      <View style={{ flex: 1, gap: 4 }}>
        <Text selectable style={{ color: "#6b7280", fontSize: 13, fontWeight: "700", textTransform: "uppercase" }}>
          {label}
        </Text>
        <Text selectable style={{ fontSize: 16, fontWeight: "600" }}>
          {value}
        </Text>
      </View>
    </View>
  );
}
