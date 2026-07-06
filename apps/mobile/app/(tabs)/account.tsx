import { Brain, CloudCog, HardDriveDownload, UserCircle2 } from "lucide-react-native";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandMark } from "@/components/brand/BrandMark";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { getPricingProviderStatus } from "@/features/pricing/localPricingService";
import { useTheme } from "@/theme";

export default function AccountScreen() {
  const theme = useTheme();
  const pricingProvider = getPricingProviderStatus();

  return (
    <SafeAreaView style={{ backgroundColor: theme.colors.background, flex: 1 }} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 32, paddingTop: 12 }}>
        <SurfaceCard>
          <View style={{ gap: 16 }}>
            <BrandMark compact />
            <SectionHeader
              eyebrow="Profile"
              title="Account"
              description="This build is still device-first. Marketplace credentials and sync can plug in later without changing the basic capture flow."
              trailing={<UserCircle2 color={theme.colors.primaryStrong} size={24} strokeWidth={2.25} />}
            />
          </View>
        </SurfaceCard>

        <SurfaceCard>
          <Text selectable style={{ ...theme.typography.sectionTitle, color: theme.colors.text, fontSize: 18 }}>
            App mode
          </Text>
          <Field label="Recognition" value="Gemini Nano on device" icon={<Brain color={theme.colors.textSoft} size={18} strokeWidth={2.25} />} />
          <Field
            label="Pricing"
            value={pricingProvider.mode === "convex_marketplace" ? "Marketplace search via Convex" : "Local mock pricing"}
            icon={<CloudCog color={theme.colors.textSoft} size={18} strokeWidth={2.25} />}
          />
          <Field label="Saved data" value="Stored locally on this device" icon={<HardDriveDownload color={theme.colors.textSoft} size={18} strokeWidth={2.25} />} />
        </SurfaceCard>

        <SurfaceCard muted>
          <Text selectable style={{ ...theme.typography.sectionTitle, color: theme.colors.text, fontSize: 18 }}>
            Next up
          </Text>
          <Text selectable style={{ color: theme.colors.textMuted, lineHeight: 20 }}>
            When account features land, this is where we can surface provider connections, sync state, and plan-level controls without crowding the capture flow.
          </Text>
        </SurfaceCard>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  const theme = useTheme();

  return (
    <View style={{ alignItems: "flex-start", flexDirection: "row", gap: 10 }}>
      {icon ? <View style={{ paddingTop: 2 }}>{icon}</View> : null}
      <View style={{ flex: 1, gap: 4 }}>
        <Text selectable style={{ color: theme.colors.textSoft, fontSize: 13, fontWeight: "700", textTransform: "uppercase" }}>
          {label}
        </Text>
        <Text selectable style={{ color: theme.colors.text, fontSize: 16, fontWeight: "700" }}>
          {value}
        </Text>
      </View>
    </View>
  );
}
