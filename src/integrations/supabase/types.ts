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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      gt_checks: {
        Row: {
          ai_authorship: Json | null
          answer: string | null
          created_at: string
          grounding_score: number | null
          id: string
          image_url: string | null
          input_kind: string
          input_text: string
          ocr_text: string | null
          retrieval_stats: Json | null
          user_id: string | null
        }
        Insert: {
          ai_authorship?: Json | null
          answer?: string | null
          created_at?: string
          grounding_score?: number | null
          id?: string
          image_url?: string | null
          input_kind?: string
          input_text: string
          ocr_text?: string | null
          retrieval_stats?: Json | null
          user_id?: string | null
        }
        Update: {
          ai_authorship?: Json | null
          answer?: string | null
          created_at?: string
          grounding_score?: number | null
          id?: string
          image_url?: string | null
          input_kind?: string
          input_text?: string
          ocr_text?: string | null
          retrieval_stats?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      gt_claims: {
        Row: {
          check_id: string
          context: string | null
          created_at: string
          drift: Json | null
          id: string
          justification: string | null
          position: number
          status: string
          text: string
          user_id: string | null
        }
        Insert: {
          check_id: string
          context?: string | null
          created_at?: string
          drift?: Json | null
          id?: string
          justification?: string | null
          position: number
          status?: string
          text: string
          user_id?: string | null
        }
        Update: {
          check_id?: string
          context?: string | null
          created_at?: string
          drift?: Json | null
          id?: string
          justification?: string | null
          position?: number
          status?: string
          text?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gt_claims_check_id_fkey"
            columns: ["check_id"]
            isOneToOne: false
            referencedRelation: "gt_checks"
            referencedColumns: ["id"]
          },
        ]
      }
      gt_firecrawl_usage: {
        Row: {
          calls: number
          day: string
          updated_at: string
        }
        Insert: {
          calls?: number
          day: string
          updated_at?: string
        }
        Update: {
          calls?: number
          day?: string
          updated_at?: string
        }
        Relationships: []
      }
      gt_page_cache: {
        Row: {
          canonical_url: string | null
          content: string | null
          fetched_at: string
          published_at: string | null
          source_name: string | null
          title: string | null
          url: string
        }
        Insert: {
          canonical_url?: string | null
          content?: string | null
          fetched_at?: string
          published_at?: string | null
          source_name?: string | null
          title?: string | null
          url: string
        }
        Update: {
          canonical_url?: string | null
          content?: string | null
          fetched_at?: string
          published_at?: string | null
          source_name?: string | null
          title?: string | null
          url?: string
        }
        Relationships: []
      }
      gt_search_cache: {
        Row: {
          fetched_at: string
          query: string
          results: Json
        }
        Insert: {
          fetched_at?: string
          query: string
          results?: Json
        }
        Update: {
          fetched_at?: string
          query?: string
          results?: Json
        }
        Relationships: []
      }
      gt_sources: {
        Row: {
          canonical_url: string | null
          check_id: string
          citation_index: number
          claim_id: string
          created_at: string
          id: string
          published_at: string | null
          snippet: string | null
          source_name: string | null
          tier: number
          title: string | null
          url: string
          user_id: string | null
        }
        Insert: {
          canonical_url?: string | null
          check_id: string
          citation_index: number
          claim_id: string
          created_at?: string
          id?: string
          published_at?: string | null
          snippet?: string | null
          source_name?: string | null
          tier?: number
          title?: string | null
          url: string
          user_id?: string | null
        }
        Update: {
          canonical_url?: string | null
          check_id?: string
          citation_index?: number
          claim_id?: string
          created_at?: string
          id?: string
          published_at?: string | null
          snippet?: string | null
          source_name?: string | null
          tier?: number
          title?: string | null
          url?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gt_sources_check_id_fkey"
            columns: ["check_id"]
            isOneToOne: false
            referencedRelation: "gt_checks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gt_sources_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "gt_claims"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      gt_reserve_firecrawl_calls: {
        Args: { _count: number; _daily_budget: number }
        Returns: number
      }
      gt_reserve_firecrawl_calls_v2: {
        Args: { _count: number; _daily_budget: number; _event_budget: number }
        Returns: Json
      }
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
