import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'sheyonai.cache.v2.';

/** Removes persisted chat snapshot for a user (e.g. on sign-in/out to avoid stale conversation ids). */
export async function clearChatCacheForUser(userId: string | null | undefined): Promise<void> {
  if (!userId) return;
  try {
    await AsyncStorage.removeItem(`${CACHE_PREFIX}${userId}`);
  } catch {
    // Non-fatal.
  }
}
