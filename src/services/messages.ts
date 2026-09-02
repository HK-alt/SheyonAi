import { supabase } from '@/lib/supabase';
import type { MessageAttachment } from '@/types/chat';
import type { MessageRow } from '@/types/database';

/** Strip client-only fields so Storage/DB payloads stay RLS-safe. */
export function sanitizeAttachmentsForDb(
  attachments: MessageAttachment[] = [],
): Pick<MessageAttachment, 'path' | 'mimeType' | 'name' | 'size'>[] {
  return attachments.map((item) => ({
    path: item.path,
    mimeType: item.mimeType,
    name: item.name,
    size: item.size,
  }));
}

/** Oldest first, ready for rendering. */
export async function fetchMessages(conversationId: string): Promise<MessageRow[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`Failed to load messages: ${error.message}`);
  return data;
}

/**
 * Inserts a user message. Assistant messages are written exclusively by the
 * deepseek-chat Edge Function (RLS blocks role='assistant' from clients).
 */
export async function insertUserMessage(
  conversationId: string,
  userId: string,
  content: string,
  attachments: MessageAttachment[] = [],
): Promise<MessageRow> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const sessionUserId = session?.user?.id;
  if (!sessionUserId) {
    throw new Error('Your session expired. Please sign in again.');
  }
  if (sessionUserId !== userId) {
    throw new Error('Your session does not match this account. Please sign in again.');
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      user_id: sessionUserId,
      role: 'user',
      content,
      attachments: sanitizeAttachmentsForDb(attachments),
    })
    .select()
    .single();
  if (error) throw new Error(`Failed to send message: ${error.message}`);
  return data;
}

export async function deleteMessage(id: string): Promise<void> {
  const { error } = await supabase.from('messages').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete message: ${error.message}`);
}
