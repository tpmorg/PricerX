import { ArrowsClockwise, Check, ImagesSquare, X } from "phosphor-react-native";
import { CameraView, type CameraType, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DEFAULT_CAMERA_FACING, pickPhotoFromLibrary } from "@/features/scans/imageCapture";
import { createStagedScanFromImage } from "@/features/scans/localScanService";
import { useTheme } from "@/theme";

export default function CameraScreen() {
  const cameraRef = useRef<CameraView | null>(null);
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>(DEFAULT_CAMERA_FACING);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  async function handleCapture() {
    if (!cameraRef.current || isBusy) return;
    setError(null);
    setIsBusy(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        shutterSound: false,
      });
      if (!photo?.uri) {
        throw new Error("Could not capture a photo.");
      }
      setCapturedUri(photo.uri);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not capture a photo.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handlePickFromLibrary() {
    if (isBusy) return;
    setError(null);
    setIsBusy(true);

    try {
      setCapturedUri(await pickPhotoFromLibrary());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not choose a photo.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleUsePhoto() {
    if (!capturedUri || isBusy) return;
    setError(null);
    setIsBusy(true);

    try {
      const detail = await createStagedScanFromImage(capturedUri, "camera-scan-request");
      router.replace({ pathname: "/items/[id]", params: { id: detail.scan.id } });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not analyze the captured photo.");
      setIsBusy(false);
    }
  }

  function handleRetake() {
    if (isBusy) return;
    setError(null);
    setCapturedUri(null);
  }

  function handleFlipCamera() {
    setFacing((current) => (current === "back" ? "front" : "back"));
  }

  if (!permission) {
    return <FullscreenMessage message="Checking camera permission..." />;
  }

  if (!permission.granted) {
    return (
      <FullscreenMessage
        message="Camera access is required to capture items in Pricernu."
        actionLabel="Grant Camera Access"
        onAction={() => void requestPermission()}
        secondaryLabel="Back"
        onSecondary={() => router.back()}
      />
    );
  }

  return (
    <View style={{ backgroundColor: theme.colors.cameraBackdrop, flex: 1 }}>
      {capturedUri ? (
        <Image source={{ uri: capturedUri }} style={{ flex: 1 }} resizeMode="cover" />
      ) : (
        <CameraView ref={cameraRef} style={{ flex: 1 }} facing={facing} />
      )}

      <View
        style={{
          bottom: 0,
          gap: 16,
          left: 0,
          paddingBottom: Math.max(insets.bottom, 20),
          paddingHorizontal: 20,
          paddingTop: Math.max(insets.top, 16),
          position: "absolute",
          right: 0,
          top: 0,
        }}
      >
        <View style={{ alignItems: "flex-start" }}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({
              alignItems: "center",
              backgroundColor: pressed ? theme.colors.cameraControlPressed : theme.colors.cameraControl,
              borderColor: theme.colors.cameraControlBorder,
              borderRadius: 999,
              borderWidth: 1,
              flexDirection: "row",
              gap: 8,
              paddingHorizontal: 14,
              paddingVertical: 10,
            })}
          >
            <X color={theme.colors.textInverse} size={16} weight="bold" />
            <Text selectable style={{ color: theme.colors.textInverse, fontSize: 15, fontWeight: "700" }}>
              Close
            </Text>
          </Pressable>
        </View>

        <View style={{ flex: 1, justifyContent: "center" }}>
          {!capturedUri ? (
            <View
              style={{
                alignSelf: "center",
                borderColor: theme.colors.cameraFrameBorder,
                borderRadius: 24,
                borderWidth: 2,
                height: "58%",
                maxHeight: 520,
                maxWidth: 360,
                width: "100%",
              }}
            />
          ) : null}
        </View>

        <View style={{ gap: 12 }}>
          {error ? (
            <Text selectable style={{ color: theme.colors.cameraError, lineHeight: 20, textAlign: "center" }}>
              {error}
            </Text>
          ) : null}

          {capturedUri ? (
            <>
              <Text selectable style={{ color: theme.colors.textInverse, fontSize: 18, fontWeight: "700", textAlign: "center" }}>
                Use this photo for pricing?
              </Text>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <CameraButton
                  label="Retake"
                  onPress={handleRetake}
                  variant="secondary"
                  disabled={isBusy}
                  icon={<ArrowsClockwise color={theme.colors.textInverse} size={18} weight="bold" />}
                />
                <CameraButton
                  label={isBusy ? "Analyzing..." : "Use Photo"}
                  onPress={() => void handleUsePhoto()}
                  variant="primary"
                  disabled={isBusy}
                  icon={<Check color={theme.colors.neutralStrong} size={18} weight="bold" />}
                />
              </View>
            </>
          ) : (
            <>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <CameraButton
                  label="Library"
                  onPress={() => void handlePickFromLibrary()}
                  variant="secondary"
                  disabled={isBusy}
                  icon={<ImagesSquare color={theme.colors.textInverse} size={18} weight="bold" />}
                />
                <CameraButton
                  label="Flip"
                  onPress={handleFlipCamera}
                  variant="secondary"
                  disabled={isBusy}
                  icon={<ArrowsClockwise color={theme.colors.textInverse} size={18} weight="bold" />}
                />
              </View>
              <Pressable
                disabled={isBusy}
                onPress={() => void handleCapture()}
                style={({ pressed }) => ({
                  alignItems: "center",
                  opacity: isBusy ? 0.7 : 1,
                  paddingVertical: 6,
                })}
              >
                <View
                  style={{
                    alignItems: "center",
                    backgroundColor: theme.colors.cameraShutterOuter,
                    borderColor: theme.colors.cameraShutterOuterBorder,
                    borderRadius: 999,
                    borderWidth: 2,
                    height: 88,
                    justifyContent: "center",
                    width: 88,
                  }}
                >
                  <View
                    style={{
                      backgroundColor: theme.colors.textInverse,
                      borderRadius: 999,
                      height: 68,
                      width: 68,
                    }}
                  />
                </View>
              </Pressable>
            </>
          )}

          {isBusy && !capturedUri ? <ActivityIndicator color={theme.colors.textInverse} /> : null}
        </View>
      </View>
    </View>
  );
}

function CameraButton(input: {
  label: string;
  onPress: () => void;
  variant: "primary" | "secondary";
  disabled?: boolean;
  icon?: React.ReactNode;
}) {
  const theme = useTheme();

  return (
    <Pressable
      disabled={input.disabled}
      onPress={input.onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        backgroundColor:
          input.variant === "primary"
            ? input.disabled
              ? theme.colors.disabled
              : pressed
                ? theme.colors.neutralStrong
                : theme.colors.textInverse
            : pressed
              ? theme.colors.cameraControlPressed
              : theme.colors.cameraControl,
        borderColor: input.variant === "primary" ? theme.colors.textInverse : theme.colors.cameraControlBorder,
        borderRadius: 16,
        borderWidth: 1,
        flex: 1,
        flexDirection: "row",
        gap: 8,
        justifyContent: "center",
        paddingHorizontal: 14,
        paddingVertical: 14,
      })}
    >
      {input.icon ? input.icon : null}
      <Text
        selectable
        style={{
          color: input.variant === "primary" ? theme.colors.neutralStrong : theme.colors.textInverse,
          fontSize: 16,
          fontWeight: "700",
        }}
      >
        {input.label}
      </Text>
    </Pressable>
  );
}

function FullscreenMessage(input: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  const theme = useTheme();

  return (
    <View style={{ alignItems: "center", backgroundColor: theme.colors.neutralStrong, flex: 1, gap: 16, justifyContent: "center", padding: 24 }}>
      <Text selectable style={{ color: theme.colors.textInverse, fontSize: 20, fontWeight: "700", textAlign: "center" }}>
        {input.message}
      </Text>
      {input.actionLabel && input.onAction ? (
        <CameraButton label={input.actionLabel} onPress={input.onAction} variant="primary" />
      ) : null}
      {input.secondaryLabel && input.onSecondary ? (
        <CameraButton label={input.secondaryLabel} onPress={input.onSecondary} variant="secondary" />
      ) : null}
    </View>
  );
}
