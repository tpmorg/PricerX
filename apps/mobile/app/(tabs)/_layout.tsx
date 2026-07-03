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
        <TabGlyph routeName="camera" isFocused />
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

  if (routeName === "camera") {
    return (
      <View
        style={{
          alignItems: "center",
          borderColor: color,
          borderRadius: 8,
          borderWidth: 2,
          height: 22,
          justifyContent: "center",
          width: 28,
        }}
      >
        <View
          style={{
            backgroundColor: "transparent",
            borderColor: color,
            borderRadius: 999,
            borderWidth: 2,
            height: 10,
            width: 10,
          }}
        />
        <View
          style={{
            backgroundColor: color,
            borderRadius: 999,
            height: 4,
            left: 3,
            position: "absolute",
            top: -2,
            width: 10,
          }}
        />
      </View>
    );
  }

  if (routeName === "index") {
    return (
      <View style={{ alignItems: "center", height: 20, justifyContent: "center", width: 20 }}>
        <View
          style={{
            borderBottomWidth: 2,
            borderColor: color,
            borderLeftWidth: 2,
            borderRightWidth: 2,
            borderTopWidth: 2,
            height: 14,
            transform: [{ rotate: "45deg" }],
            width: 14,
          }}
        />
      </View>
    );
  }

  if (routeName === "account") {
    return (
      <View style={{ alignItems: "center", gap: 2, height: 20, justifyContent: "center", width: 20 }}>
        <View
          style={{
            borderColor: color,
            borderRadius: 999,
            borderWidth: 2,
            height: 8,
            width: 8,
          }}
        />
        <View
          style={{
            borderColor: color,
            borderRadius: 999,
            borderWidth: 2,
            height: 8,
            width: 14,
          }}
        />
      </View>
    );
  }

  return (
    <View style={{ alignItems: "center", height: 20, justifyContent: "center", width: 20 }}>
      <View
        style={{
          borderColor: color,
          borderRadius: 999,
          borderWidth: 2,
          height: 14,
          width: 14,
        }}
      />
      <View
        style={{
          backgroundColor: color,
          borderRadius: 999,
          height: 4,
          position: "absolute",
          width: 4,
        }}
      />
    </View>
  );
}
