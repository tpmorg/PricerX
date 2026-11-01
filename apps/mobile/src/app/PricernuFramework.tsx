import { useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { AppServicesProvider, type FrameworkOptions } from "@/framework/appServices";
import { FrameworkProviders } from "@/framework/FrameworkProviders";
import type { ConfigIssue } from "@/framework/config/runtimeConfig";
import { initializeLocalStorage } from "@/features/scans/localScanService";
import { useTheme } from "@/theme";

const frameworkOptions: FrameworkOptions = {
  databaseName: "pricernu-framework.db",
  namespace: "@pricernu",
  jobsPath: "/api/v1/jobs",
  modules: { operations: true },
};

export function PricernuFramework({ children }: { children: ReactNode }) {
  return (
    <AppServicesProvider options={frameworkOptions}>
      <FrameworkProviders
        billingProvider={false}
        renderLoading={() => <FrameworkState message="Preparing local services…" busy />}
        renderDatabaseError={(retry) => (
          <FrameworkState message="Could not prepare framework storage." actionLabel="Retry" onAction={retry} />
        )}
        renderConfigError={(issues) => <ConfigurationError issues={issues} />}
        renderCrash={() => <FrameworkState message="Pricernu could not finish starting." />}
      >
        <ProductStorageGate>{children}</ProductStorageGate>
      </FrameworkProviders>
    </AppServicesProvider>
  );
}

function ProductStorageGate({ children }: { children: ReactNode }) {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let active = true;
    setStatus("loading");

    initializeLocalStorage()
      .then(() => {
        if (active) setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [attempt]);

  if (status === "ready") return children;

  return status === "loading" ? (
    <FrameworkState message="Opening your local library…" busy />
  ) : (
    <FrameworkState
      message="Could not open your local library."
      actionLabel="Retry"
      onAction={() => setAttempt((value) => value + 1)}
    />
  );
}

function ConfigurationError({ issues }: { issues: readonly ConfigIssue[] }) {
  const message = issues.map((issue) => issue.message).join(" ");
  return <FrameworkState message={message || "The app configuration is invalid."} />;
}

function FrameworkState({
  message,
  busy = false,
  actionLabel,
  onAction,
}: {
  message: string;
  busy?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const theme = useTheme();

  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: theme.colors.background,
        flex: 1,
        gap: 16,
        justifyContent: "center",
        padding: 24,
      }}
    >
      {busy ? <ActivityIndicator color={theme.colors.primary} size="large" /> : null}
      <Text style={{ color: theme.colors.text, fontSize: 16, lineHeight: 24, textAlign: "center" }}>
        {message}
      </Text>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => ({
            backgroundColor: pressed ? theme.colors.primaryStrong : theme.colors.primary,
            borderRadius: theme.radii.md,
            paddingHorizontal: 20,
            paddingVertical: 12,
          })}
        >
          <Text style={{ color: theme.colors.textInverse, fontSize: 16, fontWeight: "700" }}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
