import { requireNativeModule } from "expo-modules-core";
import { Platform } from "react-native";

export type GeminiNanoFeatureStatus =
  | "available"
  | "downloadable"
  | "downloading"
  | "unavailable"
  | "unsupported"
  | "unknown";

export interface GeminiNanoStatus {
  platform: "android" | "ios" | "web" | "unknown";
  imageDescription: GeminiNanoFeatureStatus;
  prompt: GeminiNanoFeatureStatus;
  baseModelName?: string;
  message?: string;
}

export interface GeminiNanoImageDescription {
  description: string;
  status: GeminiNanoFeatureStatus;
  baseModelName?: string;
}

export interface GeminiNanoPromptResponse {
  text: string;
  status: GeminiNanoFeatureStatus;
}

interface ExpoGeminiNanoNativeModule {
  getStatus(): Promise<GeminiNanoStatus>;
  describeImage(payload: { uri: string }): Promise<GeminiNanoImageDescription>;
  prompt(payload: { text: string }): Promise<GeminiNanoPromptResponse>;
  warmup(): Promise<GeminiNanoStatus>;
}

const unsupportedMessage = "Gemini Nano is only available in Android development/native builds with AICore support.";

const unsupportedModule: ExpoGeminiNanoNativeModule = {
  async getStatus() {
    return {
      platform: Platform.OS === "android" || Platform.OS === "ios" || Platform.OS === "web" ? Platform.OS : "unknown",
      imageDescription: "unsupported",
      prompt: "unsupported",
      message: unsupportedMessage,
    };
  },
  async describeImage() {
    throw new Error(unsupportedMessage);
  },
  async prompt() {
    throw new Error(unsupportedMessage);
  },
  async warmup() {
    return this.getStatus();
  },
};

function loadGeminiNanoModule(): ExpoGeminiNanoNativeModule {
  if (Platform.OS !== "android") return unsupportedModule;

  try {
    return requireNativeModule<ExpoGeminiNanoNativeModule>("ExpoGeminiNano");
  } catch {
    return unsupportedModule;
  }
}

export const geminiNanoModule = loadGeminiNanoModule();
