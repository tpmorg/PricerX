import { CameraType } from "expo-camera";
import * as ImagePicker from "expo-image-picker";

export const DEFAULT_CAMERA_FACING: CameraType = "back";

export async function pickPhotoFromLibrary(): Promise<string> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Photo library permission is required to choose an item photo.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: false,
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
  });

  if (result.canceled || !result.assets[0]?.uri) {
    throw new Error("Photo selection was canceled.");
  }

  return result.assets[0].uri;
}
