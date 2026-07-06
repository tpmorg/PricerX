import { House, Settings2, UserRound } from "lucide-react-native";
import { Camera } from "phosphor-react-native";
import { Tabs, router } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme";

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
  const theme = useTheme();
  const cameraButtonSize = 84;

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderTopColor: theme.colors.border,
        borderTopWidth: 1,
        boxShadow: theme.shadows.subtle,
        flexDirection: "row",
        paddingBottom: Math.max(insets.bottom, 12),
        paddingHorizontal: 10,
        paddingTop: 28,
        position: "relative",
      }}
    >
      <View
        pointerEvents="box-none"
        style={{
          alignItems: "center",
          left: 0,
          position: "absolute",
          right: 0,
          top: -58,
          zIndex: 2,
        }}
      >
        <Pressable
          accessibilityLabel="Capture item"
          onPress={() => router.push("/camera")}
          style={({ pressed }) => ({
            alignItems: "center",
            backgroundColor: pressed ? theme.colors.primaryStrong : theme.colors.primary,
            borderColor: theme.colors.surface,
            borderRadius: 999,
            borderWidth: 4,
            boxShadow: theme.shadows.floating,
            height: cameraButtonSize,
            justifyContent: "center",
            width: cameraButtonSize,
          })}
        >
          <Camera color={theme.colors.textInverse} size={36} weight="fill" />
        </Pressable>
      </View>

      {state.routes.map((route: FloatingCaptureTabBarProps["state"]["routes"][number], index: number) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const color = isFocused ? theme.colors.text : theme.colors.textSoft;

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
              minHeight: 56,
              paddingBottom: 4,
              paddingTop: 0,
            }}
          >
            <TabGlyph routeName={route.name} isFocused={isFocused} />
            <Text style={{ color, fontSize: 11, fontWeight: isFocused ? "800" : "700" }}>
              {options.title ?? route.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function TabGlyph({ routeName, isFocused }: { routeName: string; isFocused: boolean }) {
  const theme = useTheme();
  const color = isFocused ? theme.colors.text : theme.colors.textSoft;

  if (routeName === "index") {
    return <House color={color} size={20} strokeWidth={2.25} />;
  }

  if (routeName === "account") {
    return <UserRound color={color} size={20} strokeWidth={2.25} />;
  }

  return <Settings2 color={color} size={20} strokeWidth={2.25} />;
}
