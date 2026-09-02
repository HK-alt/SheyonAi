import { Platform } from 'react-native';

import {
  fetchVendorText,
  wrapInlineScript,
  type AnatomyVendorScripts,
} from '@/subject/biology-lab/anatomy-vendor-shared';

export type { AnatomyVendorScripts };
export { wrapInlineScript };

const THREE_SOURCES = [
  ...(Platform.OS === 'web' ? ['/biology/vendor/three.min.js'] : []),
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
];

const LOADER_SOURCES = [
  ...(Platform.OS === 'web' ? ['/biology/vendor/GLTFLoader.js'] : []),
  'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/js/loaders/GLTFLoader.js',
];

let cached: AnatomyVendorScripts | null = null;

async function loadFirst(urls: string[]): Promise<string> {
  let lastError: unknown;
  for (const url of urls) {
    try {
      return await fetchVendorText(url);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('Could not load anatomy 3D libraries.');
}

export async function loadAnatomyVendorScripts(): Promise<AnatomyVendorScripts> {
  if (cached) return cached;
  const [three, loader] = await Promise.all([
    loadFirst(THREE_SOURCES),
    loadFirst(LOADER_SOURCES),
  ]);
  cached = { three, loader };
  return cached;
}
