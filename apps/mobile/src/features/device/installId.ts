import { File, Paths } from "expo-file-system";

const INSTALL_ID_FILE_NAME = "install-id";
const INSTALL_ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/;

let cachedInstallId: string | null = null;

// A random per-install id sent with cloud lookups so the backend can rate-limit
// by device. It is not an account and identifies nothing about the user.
export function getInstallId(): string {
  if (cachedInstallId) return cachedInstallId;

  const file = new File(Paths.document, INSTALL_ID_FILE_NAME);
  if (file.exists) {
    const stored = file.textSync().trim();
    if (INSTALL_ID_PATTERN.test(stored)) {
      cachedInstallId = stored;
      return stored;
    }
  }

  const installId = createInstallId();
  if (!file.exists) file.create();
  file.write(installId);
  cachedInstallId = installId;
  return installId;
}

function createInstallId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `install-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
