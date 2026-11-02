const fs = require("node:fs");
const path = require("node:path");

const modulePath = path.join(
  __dirname,
  "..",
  "node_modules",
  "expo-gemini-nano",
  "android",
  "src",
  "main",
  "java",
  "expo",
  "modules",
  "gemininano",
  "ExpoGeminiNanoModule.kt",
);
const staleImport = "import com.google.mlkit.common.FeatureStatus";
const currentImport = "import com.google.mlkit.genai.common.FeatureStatus";
const source = fs.readFileSync(modulePath, "utf8");

if (source.includes(currentImport)) {
  process.exit(0);
}

if (!source.includes(staleImport)) {
  throw new Error(
    "expo-gemini-nano FeatureStatus import changed; review the postinstall compatibility patch.",
  );
}

fs.writeFileSync(modulePath, source.replace(staleImport, currentImport));
console.log("Patched expo-gemini-nano FeatureStatus import for the ML Kit GenAI API.");
