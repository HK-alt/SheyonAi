/**
 * When a conversation has an explicit RAG document scope (non-null list),
 * newly uploaded docs must be appended or they stay invisible to retrieval.
 * `null` means “all library docs” — no update needed.
 */
export function nextRagScopeAfterUpload(
  currentScope: string[] | null | undefined,
  newDocumentId: string,
): string[] | undefined {
  if (currentScope == null) return undefined;
  if (currentScope.includes(newDocumentId)) return undefined;
  return [...currentScope, newDocumentId];
}

export function ragUploadSuccessHint(chunksCreated: number): string {
  if (chunksCreated > 0) {
    return `Added to your library (${chunksCreated} sections) — ask in Documents mode to use it.`;
  }
  return 'Added to your library — ask in Documents mode to use it.';
}
