import Constants from 'expo-constants';
import { Platform } from 'react-native';

type VisionCameraModule = typeof import('react-native-vision-camera');

let visionCameraModule: VisionCameraModule | null | undefined;

async function loadVisionCamera(): Promise<VisionCameraModule | null> {
  if (visionCameraModule !== undefined) return visionCameraModule;
  if (Platform.OS === 'web') {
    visionCameraModule = null;
    return null;
  }
  try {
    visionCameraModule = await import('react-native-vision-camera');
    return visionCameraModule;
  } catch {
    visionCameraModule = null;
    return null;
  }
}

export function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

export async function isOcrAvailable(): Promise<boolean> {
  if (Platform.OS === 'web' || isExpoGo()) return false;
  const visionCamera = await loadVisionCamera();
  return visionCamera !== null;
}

export async function requestOcrPermission(): Promise<boolean> {
  const visionCamera = await loadVisionCamera();
  if (!visionCamera) return false;

  const status = visionCamera.Camera.getCameraPermissionStatus();
  if (status === 'granted') return true;
  if (status === 'denied' || status === 'restricted') return false;

  const result = await visionCamera.Camera.requestCameraPermission();
  return result === 'granted';
}
