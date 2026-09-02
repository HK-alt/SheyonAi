/** Web: expo-file-system is unsupported — use fetch/ArrayBuffer instead. */
export async function readViaFileSystem(
  _uri: string,
): Promise<{ body: Uint8Array; size: number } | null> {
  return null;
}
