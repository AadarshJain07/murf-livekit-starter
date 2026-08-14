export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      escalations: {
        Row: {
          created_at: string
          follow_up_method: string | null
          language_preference: string | null
          phone_number: string | null
          reason: string | null
          reference_id: string
          status: string
          student: string | null
          topic: string | null
          tried: string | null
          urgency: string
        }
        Insert: {
          created_at?: string
          follow_up_method?: string | null
          language_preference?: string | null
          phone_number?: string | null
          reason?: string | null
          reference_id: string
          status?: string
          student?: string | null
          topic?: string | null
          tried?: string | null
          urgency?: string
        }
        Update: {
          created_at?: string
          follow_up_method?: string | null
          language_preference?: string | null
          phone_number?: string | null
          reason?: string | null
          reference_id?: string
          status?: string
          student?: string | null
          topic?: string | null
          tried?: string | null
          urgency?: string
        }
        Relationships: []
      }
      quest_attempts: {
        Row: {
          attempts: number
          concept: string | null
          correct: boolean
          created_at: string
          difficulty: string | null
          id: number
          kind: string
          session_id: string | null
          subject: string | null
          topic: string | null
          user_id: string
          xp_earned: number
        }
        Insert: {
          attempts?: number
          concept?: string | null
          correct?: boolean
          created_at?: string
          difficulty?: string | null
          id?: number
          kind?: string
          session_id?: string | null
          subject?: string | null
          topic?: string | null
          user_id: string
          xp_earned?: number
        }
        Update: {
          attempts?: number
          concept?: string | null
          correct?: boolean
          created_at?: string
          difficulty?: string | null
          id?: number
          kind?: string
          session_id?: string | null
          subject?: string | null
          topic?: string | null
          user_id?: string
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "quest_attempts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "quest_sessions"
            referencedColumns: ["session_id"]
          },
        ]
      }
      quest_sessions: {
        Row: {
          channel: string | null
          ended_at: string | null
          outcome: string | null
          session_id: string
          started_at: string
          subject: string | null
          topic: string | null
          user_id: string
          xp_earned: number
        }
        Insert: {
          channel?: string | null
          ended_at?: string | null
          outcome?: string | null
          session_id: string
          started_at?: string
          subject?: string | null
          topic?: string | null
          user_id: string
          xp_earned?: number
        }
        Update: {
          channel?: string | null
          ended_at?: string | null
          outcome?: string | null
          session_id?: string
          started_at?: string
          subject?: string | null
          topic?: string | null
          user_id?: string
          xp_earned?: number
        }
        Relationships: []
      }
      user_memory: {
        Row: {
          common_mistakes: string | null
          current_level: string | null
          language_preference: string | null
          last_interaction: string
          name: string | null
          topics_covered: string | null
          user_id: string
        }
        Insert: {
          common_mistakes?: string | null
          current_level?: string | null
          language_preference?: string | null
          last_interaction?: string
          name?: string | null
          topics_covered?: string | null
          user_id: string
        }
        Update: {
          common_mistakes?: string | null
          current_level?: string | null
          language_preference?: string | null
          last_interaction?: string
          name?: string | null
          topics_covered?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
