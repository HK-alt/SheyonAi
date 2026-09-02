/**
 * Generated from Supabase project via MCP generate_typescript_types.
 * Regenerate with: supabase gen types typescript --linked
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      chunks: {
        Row: {
          content: string;
          created_at: string;
          document_id: string;
          embedding: string | null;
          id: string;
          metadata: Json;
        };
        Insert: {
          content: string;
          created_at?: string;
          document_id: string;
          embedding?: string | null;
          id?: string;
          metadata?: Json;
        };
        Update: {
          content?: string;
          created_at?: string;
          document_id?: string;
          embedding?: string | null;
          id?: string;
          metadata?: Json;
        };
        Relationships: [
          {
            foreignKeyName: 'chunks_document_id_fkey';
            columns: ['document_id'];
            isOneToOne: false;
            referencedRelation: 'documents';
            referencedColumns: ['id'];
          },
        ];
      };
      conversations: {
        Row: {
          created_at: string;
          id: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          title?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          created_at: string;
          file_size: number | null;
          filename: string;
          id: string;
          is_curriculum: boolean;
          mime_type: string | null;
          storage_path: string;
          subject: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          file_size?: number | null;
          filename: string;
          id?: string;
          is_curriculum?: boolean;
          mime_type?: string | null;
          storage_path: string;
          subject?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          file_size?: number | null;
          filename?: string;
          id?: string;
          is_curriculum?: boolean;
          mime_type?: string | null;
          storage_path?: string;
          subject?: string | null;
          user_id?: string | null;
        };
        Relationships: [];
      };
      edge_secrets: {
        Row: {
          name: string;
          updated_at: string;
          value: string;
        };
        Insert: {
          name: string;
          updated_at?: string;
          value: string;
        };
        Update: {
          name?: string;
          updated_at?: string;
          value?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          attachments: Json;
          content: string;
          conversation_id: string;
          created_at: string;
          id: string;
          role: string;
          sources: Json | null;
          user_id: string;
        };
        Insert: {
          attachments?: Json;
          content: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          role: string;
          sources?: Json | null;
          user_id: string;
        };
        Update: {
          attachments?: Json;
          content?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          role?: string;
          sources?: Json | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
        ];
      };
      rag_messages: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          role: string;
          session_id: string;
          sources: Json | null;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          role: string;
          session_id: string;
          sources?: Json | null;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          role?: string;
          session_id?: string;
          sources?: Json | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'rag_messages_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'rag_sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      rag_sessions: {
        Row: {
          created_at: string;
          id: string;
          title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          title?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      usage_log: {
        Row: {
          completion_tokens: number;
          created_at: string;
          id: string;
          model: string;
          prompt_tokens: number;
          user_id: string;
        };
        Insert: {
          completion_tokens?: number;
          created_at?: string;
          id?: string;
          model: string;
          prompt_tokens?: number;
          user_id: string;
        };
        Update: {
          completion_tokens?: number;
          created_at?: string;
          id?: string;
          model?: string;
          prompt_tokens?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      user_sidebar_org: {
        Row: {
          folder_by_conversation_id: Json;
          folders: Json;
          pinned_ids: Json;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          folder_by_conversation_id?: Json;
          folders?: Json;
          pinned_ids?: Json;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          folder_by_conversation_id?: Json;
          folders?: Json;
          pinned_ids?: Json;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      search_chunks: {
        Args: {
          match_count?: number;
          match_threshold?: number;
          p_subject?: string;
          p_user_id?: string;
          query_embedding: string;
        };
        Returns: {
          content: string;
          document_id: string;
          filename: string;
          id: string;
          metadata: Json;
          similarity: number;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// Legacy aliases used elsewhere in the app
export type MessageRole = 'user' | 'assistant';

export type ConversationRow = Database['public']['Tables']['conversations']['Row'];
export type MessageRow = Database['public']['Tables']['messages']['Row'];
export type UsageLogRow = Database['public']['Tables']['usage_log']['Row'];

export type MessageAttachmentRow = {
  path: string;
  mimeType: string;
  name: string;
  size?: number;
};
