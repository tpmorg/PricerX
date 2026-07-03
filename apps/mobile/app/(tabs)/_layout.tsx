import { House, Settings2, UserRound } from "lucide-react-native";
import { Camera } from "phosphor-react-native";
import { Tabs, router } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <FloatingCaptureTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="account" options={{ title: "Account" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}

type FloatingCaptureTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

function FloatingCaptureTabBar({ state, descriptors, navigation }: FloatingCaptureTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        backgroundColor: "#ffffff",
        borderTopColor: "#e5e7eb",
        borderTopWidth: 1,
        flexDirection: "row",
        paddingBottom: Math.max(insets.bottom, 12),
        paddingHorizontal: 10,
        paddingTop: 16,
        position: "relative",
      }}
    >
      <Pressable
        accessibilityLabel="Capture item"
        onPress={() => router.push("/camera")}
        style={({ pressed }) => ({
          alignItems: "center",
          backgroundColor: pressed ? "#111827" : "#0f172a",
          borderColor: "#ffffff",
          borderRadius: 999,
          borderWidth: 4,
          height: 64,
          justifyContent: "center",
          left: "50%",
          marginLeft: -32,
          position: "absolute",
          top: -28,
          width: 64,
          zIndex: 2,
        })}
      >
        <Camera color="#ffffff" size={28} weight="fill" />
      </Pressable>

      {state.routes.map((route: FloatingCaptureTabBarProps["state"]["routes"][number], index: number) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const color = isFocused ? "#111827" : "#6b7280";

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            onPress={onPress}
            style={{
              alignItems: "center",
              flex: 1,
              gap: 4,
              justifyContent: "flex-end",
              minHeight: 62,
              paddingBottom: 2,
            }}
          >
            <TabGlyph routeName={route.name} isFocused={isFocused} />
            <Text style={{ color, fontSize: 12, fontWeight: isFocused ? "800" : "600" }}>
              {options.title ?? route.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function TabGlyph({ routeName, isFocused }: { routeName: string; isFocused: boolean }) {
  const color = isFocused ? "#111827" : "#6b7280";

  if (routeName === "index") {
    return <House color={color} size={20} strokeWidth={2.25} />;
  }

  if (routeName === "account") {
    return <UserRound color={color} size={20} strokeWidth={2.25} />;
  }

  return <Settings2 color={color} size={20} strokeWidth={2.25} />;
}
