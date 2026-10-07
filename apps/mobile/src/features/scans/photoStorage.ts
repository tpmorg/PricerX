import { Directory, File, Paths } from "expo-file-system";

const PHOTO_DIRECTORY_NAME = "item-photos";

// Camera and picker results live in the OS cache directory, which the system
// may purge. Saved items must point at a copy in the document directory.
export async function persistPhoto(sourceUri: string, photoId: string): Promise<string> {
  if (!sourceUri.startsWith("file://")) return sourceUri;

  const directory = getPhotoDirectory();
  if (sourceUri.startsWith(directory.uri)) return sourceUri;

  const destination = new File(directory, `${photoId}.${getExtension(sourceUri)}`);
  await new File(sourceUri).copy(destination, { overwrite: true });
  return destination.uri;
}

export function deletePersistedPhotos(uris: string[]): void {
  const directory = getPhotoDirectory();

  for (const uri of new Set(uris)) {
    if (!uri.startsWith(directory.uri)) continue;
    try {
      const file = new File(uri);
      if (file.exists) file.delete();
    } catch (caught) {
      console.warn("[photos] Could not delete stored photo", { uri, caught });
    }
  }
}

export function deleteAllPersistedPhotos(): void {
  const directory = new Directory(Paths.document, PHOTO_DIRECTORY_NAME);
  if (directory.exists) directory.delete();
}

function getPhotoDirectory(): Directory {
  const directory = new Directory(Paths.document, PHOTO_DIRECTORY_NAME);
  if (!directory.exists) directory.create({ intermediates: true });
  return directory;
}

function getExtension(uri: string): string {
  const match = uri.split("?")[0]?.match(/\.([A-Za-z0-9]{2,5})$/);
  return match?.[1]?.toLowerCase() ?? "jpg";
}
