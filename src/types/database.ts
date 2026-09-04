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
      app_config: {
        Row: {
          key: string;
          value: Json;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: Json;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          user_id: string;
          role: AppRole;
          is_disabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          role?: AppRole;
          is_disabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          role?: AppRole;
          is_disabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_roles_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
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
      update_user_role: {
        Args: { p_user_id: string; p_role: AppRole };
        Returns: void;
      };
      admin_message_counts: {
        Args: { days_back?: number };
        Returns: { day: string; total: number }[];
      };
      admin_role_counts: {
        Args: Record<string, never>;
        Returns: { role: AppRole; total: number }[];
      };
      admin_list_users: {
        Args: Record<string, never>;
        Returns: {
          user_id: string;
          email: string;
          full_name: string | null;
          role: AppRole;
          is_disabled: boolean;
          created_at: string;
          last_sign_in_at: string | null;
        }[];
      };
      admin_set_user_disabled: {
        Args: { p_user_id: string; p_disabled: boolean };
        Returns: void;
      };
      admin_check_user_status: {
        Args: { p_user_id?: string };
        Returns: { role: AppRole; is_disabled: boolean };
      };
      admin_usage_summary: {
        Args: { days_back?: number };
        Returns: {
          total_prompt_tokens: number;
          total_completion_tokens: number;
          by_model: {
            model: string;
            prompt_tokens: number;
            completion_tokens: number;
            calls: number;
          }[];
          top_users: {
            email: string;
            prompt_tokens: number;
            completion_tokens: number;
            calls: number;
          }[];
        };
      };
      admin_list_conversations: {
        Args: { p_limit?: number; p_offset?: number; p_search?: string | null };
        Returns: {
          id: string;
          title: string;
          user_email: string;
          user_id: string;
          message_count: number;
          updated_at: string;
          created_at: string;
        }[];
      };
      admin_conversation_messages: {
        Args: { p_conversation_id: string };
        Returns: { id: string; role: string; content: string; created_at: string }[];
      };
      admin_recent_activity: {
        Args: { p_limit?: number };
        Returns: {
          event_type: string;
          label: string;
          detail: string;
          occurred_at: string;
        }[];
      };
      admin_get_config: {
        Args: Record<string, never>;
        Returns: Json;
      };
      admin_set_config: {
        Args: { p_key: string; p_value: Json };
        Returns: void;
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: {
      app_role: AppRole;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// ============================================================
// App-level role type
// ============================================================

export type AppRole = 'admin' | 'teacher' | 'student';

// Legacy aliases used elsewhere in the app
export type MessageRole = 'user' | 'assistant';

export type ConversationRow = Database['public']['Tables']['conversations']['Row'];
export type MessageRow = Database['public']['Tables']['messages']['Row'];
export type UsageLogRow = Database['public']['Tables']['usage_log']['Row'];

export type UserRoleRow = Database['public']['Tables']['user_roles']['Row'];

export type MessageAttachmentRow = {
  path: string;
  mimeType: string;
  name: string;
  size?: number;
};
