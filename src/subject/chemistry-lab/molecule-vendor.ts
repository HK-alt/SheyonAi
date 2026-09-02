import { Platform } from 'react-native';

import { fetchVendorText, wrapInlineScript } from '@/subject/biology-lab/anatomy-vendor-shared';

export type MoleculeVendorScripts = {
  three: string;
};

export { wrapInlineScript };

const THREE_SOURCES = [
  ...(Platform.OS === 'web' ? ['/biology/vendor/three.min.js'] : []),
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
];

let cached: MoleculeVendorScripts | null = null;

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
    : new Error('Could not load chemistry 3D libraries.');
}

export async function loadMoleculeVendorScripts(): Promise<MoleculeVendorScripts> {
  if (cached) return cached;
  const three = await loadFirst(THREE_SOURCES);
  cached = { three };
  return cached;
}
