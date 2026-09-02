import { useEffect, useRef } from 'react';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { MessageRow } from '@/types/database';

/**
 * Subscribes to INSERTs on the messages table for one conversation, so new
 * messages (e.g. from another device, or persisted by the Edge Function)
 * appear live. RLS limits events to the signed-in user's own rows.
 */
export function useRealtimeMessages(
  conversationId: string | null,
  onInsert: (message: MessageRow) => void,
) {
  // Keep the latest callback without resubscribing on each render.
  const onInsertRef = useRef(onInsert);
  useEffect(() => {
    onInsertRef.current = onInsert;
  }, [onInsert]);

  useEffect(() => {
    if (!conversationId || !isSupabaseConfigured) return;
    // Local draft conversations don't exist in the DB yet.
    if (conversationId.startsWith('draft-')) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          onInsertRef.current(payload.new as MessageRow);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);
}
