import { File } from 'expo-file-system';

/** Native: read bytes via expo-file-system File API. */
export async function readViaFileSystem(
  uri: string,
): Promise<{ body: Uint8Array; size: number } | null> {
  try {
    const file = new File(uri);
    const bytes = await file.bytes();
    if (bytes.byteLength > 0) {
      return { body: bytes, size: bytes.byteLength };
    }
  } catch {
    // Fall through for content:// or remote URIs file-system cannot open.
  }
  return null;
}
