import { supabase } from '@/lib/supabase';
import type { ConversationRow } from '@/types/database';

/** Most recently active conversations first. */
export async function fetchConversations(): Promise<ConversationRow[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw new Error(`Failed to load conversations: ${error.message}`);
  return data;
}

export async function createConversation(
  userId: string,
  title: string,
): Promise<ConversationRow> {
  const { data, error } = await supabase
    .from('conversations')
    .insert({ user_id: userId, title })
    .select()
    .single();
  if (error) throw new Error(`Failed to create conversation: ${error.message}`);
  return data;
}

/**
 * Returns conversationId when it exists and belongs to the user; otherwise
 * creates a new conversation (handles orphaned local cache IDs that fail RLS).
 */
export async function ensureOwnedConversation(
  conversationId: string,
  userId: string,
  title: string,
): Promise<{ id: string; created: boolean }> {
  const { data, error } = await supabase
    .from('conversations')
    .select('id')
    .eq('id', conversationId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!error && data?.id) {
    return { id: data.id, created: false };
  }

  const row = await createConversation(userId, title);
  return { id: row.id, created: true };
}

export async function renameConversation(id: string, title: string): Promise<void> {
  const { error } = await supabase.from('conversations').update({ title }).eq('id', id);
  if (error) throw new Error(`Failed to rename conversation: ${error.message}`);
}

/** Messages are removed too via ON DELETE CASCADE. */
export async function deleteConversation(id: string): Promise<void> {
  const { error } = await supabase.from('conversations').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete conversation: ${error.message}`);
}

export async function deleteAllConversations(userId: string): Promise<void> {
  const { error } = await supabase.from('conversations').delete().eq('user_id', userId);
  if (error) throw new Error(`Failed to clear conversations: ${error.message}`);
}

/** Persists the per-conversation RAG document scope. Pass null to search all docs. */
export async function updateRagDocumentIds(
  id: string,
  documentIds: string[] | null,
): Promise<void> {
  const { error } = await supabase
    .from('conversations')
    .update({ rag_document_ids: documentIds })
    .eq('id', id);
  if (error) throw new Error(`Failed to update document scope: ${error.message}`);
}

/** Fetches the current rag_document_ids for a conversation. */
export async function fetchRagDocumentIds(id: string): Promise<string[] | null> {
  const { data, error } = await supabase
    .from('conversations')
    .select('rag_document_ids')
    .eq('id', id)
    .single();
  if (error) return null;
  const ids = data?.rag_document_ids;
  return Array.isArray(ids) && ids.length > 0 ? (ids as string[]) : null;
}
