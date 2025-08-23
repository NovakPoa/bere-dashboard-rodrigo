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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      alimentacao: {
        Row: {
          calorias_kcal: number | null
          carboidrato_g: number | null
          data: string | null
          gordura_g: number | null
          id: number
          origem: string | null
          proteina_g: number | null
          refeicao: string | null
          texto: string | null
          tipo: string | null
          ts: string | null
          user_id: string | null
          wa_id: string | null
        }
        Insert: {
          calorias_kcal?: number | null
          carboidrato_g?: number | null
          data?: string | null
          gordura_g?: number | null
          id?: number
          origem?: string | null
          proteina_g?: number | null
          refeicao?: string | null
          texto?: string | null
          tipo?: string | null
          ts?: string | null
          user_id?: string | null
          wa_id?: string | null
        }
        Update: {
          calorias_kcal?: number | null
          carboidrato_g?: number | null
          data?: string | null
          gordura_g?: number | null
          id?: number
          origem?: string | null
          proteina_g?: number | null
          refeicao?: string | null
          texto?: string | null
          tipo?: string | null
          ts?: string | null
          user_id?: string | null
          wa_id?: string | null
        }
        Relationships: []
      }
      atividade_fisica: {
        Row: {
          calorias: number | null
          created_at: string
          data: string | null
          distancia_km: number | null
          duracao_min: number | null
          id: number
          modalidade: string | null
          origem: string | null
          texto: string | null
          tipo: string | null
          ts: string | null
          user_id: string | null
          wa_id: string | null
        }
        Insert: {
          calorias?: number | null
          created_at?: string
          data?: string | null
          distancia_km?: number | null
          duracao_min?: number | null
          id?: number
          modalidade?: string | null
          origem?: string | null
          texto?: string | null
          tipo?: string | null
          ts?: string | null
          user_id?: string | null
          wa_id?: string | null
        }
        Update: {
          calorias?: number | null
          created_at?: string
          data?: string | null
          distancia_km?: number | null
          duracao_min?: number | null
          id?: number
          modalidade?: string | null
          origem?: string | null
          texto?: string | null
          tipo?: string | null
          ts?: string | null
          user_id?: string | null
          wa_id?: string | null
        }
        Relationships: []
      }
      cultura: {
        Row: {
          data: string | null
          id: number
          nota: number | null
          origem: string | null
          status: string | null
          texto: string | null
          tipo: string | null
          tipo_item: string | null
          titulo: string | null
          ts: string | null
          user_id: string | null
          wa_id: string | null
        }
        Insert: {
          data?: string | null
          id?: number
          nota?: number | null
          origem?: string | null
          status?: string | null
          texto?: string | null
          tipo?: string | null
          tipo_item?: string | null
          titulo?: string | null
          ts?: string | null
          user_id?: string | null
          wa_id?: string | null
        }
        Update: {
          data?: string | null
          id?: number
          nota?: number | null
          origem?: string | null
          status?: string | null
          texto?: string | null
          tipo?: string | null
          tipo_item?: string | null
          titulo?: string | null
          ts?: string | null
          user_id?: string | null
          wa_id?: string | null
        }
        Relationships: []
      }
      financeiro: {
        Row: {
          categoria: string | null
          data: string | null
          descricao: string | null
          forma_pagamento: string | null
          id: number
          origem: string | null
          texto: string | null
          tipo: string | null
          ts: string | null
          user_id: string | null
          valor: number | null
          wa_id: string | null
        }
        Insert: {
          categoria?: string | null
          data?: string | null
          descricao?: string | null
          forma_pagamento?: string | null
          id?: number
          origem?: string | null
          texto?: string | null
          tipo?: string | null
          ts?: string | null
          user_id?: string | null
          valor?: number | null
          wa_id?: string | null
        }
        Update: {
          categoria?: string | null
          data?: string | null
          descricao?: string | null
          forma_pagamento?: string | null
          id?: number
          origem?: string | null
          texto?: string | null
          tipo?: string | null
          ts?: string | null
          user_id?: string | null
          valor?: number | null
          wa_id?: string | null
        }
        Relationships: []
      }
      habitos: {
        Row: {
          data: string | null
          id: number
          nome: string | null
          origem: string | null
          quantidade_sessoes: number | null
          tempo_total_sessoes: number | null
          texto: string | null
          tipo: string | null
          ts: string | null
          user_id: string | null
          wa_id: string | null
        }
        Insert: {
          data?: string | null
          id?: number
          nome?: string | null
          origem?: string | null
          quantidade_sessoes?: number | null
          tempo_total_sessoes?: number | null
          texto?: string | null
          tipo?: string | null
          ts?: string | null
          user_id?: string | null
          wa_id?: string | null
        }
        Update: {
          data?: string | null
          id?: number
          nome?: string | null
          origem?: string | null
          quantidade_sessoes?: number | null
          tempo_total_sessoes?: number | null
          texto?: string | null
          tipo?: string | null
          ts?: string | null
          user_id?: string | null
          wa_id?: string | null
        }
        Relationships: []
      }
      org_blocks: {
        Row: {
          bold: boolean
          child_page_id: string | null
          color: string
          content: string | null
          created_at: string
          id: string
          order_index: number
          page_id: string
          type: string
          updated_at: string
        }
        Insert: {
          bold?: boolean
          child_page_id?: string | null
          color?: string
          content?: string | null
          created_at?: string
          id?: string
          order_index?: number
          page_id: string
          type: string
          updated_at?: string
        }
        Update: {
          bold?: boolean
          child_page_id?: string | null
          color?: string
          content?: string | null
          created_at?: string
          id?: string
          order_index?: number
          page_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_blocks_child_page_id_fkey"
            columns: ["child_page_id"]
            isOneToOne: false
            referencedRelation: "org_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_blocks_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "org_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      org_pages: {
        Row: {
          category: string
          content: string | null
          created_at: string
          favorite_order: number
          id: string
          is_favorite: boolean
          parent_id: string | null
          sort_index: number
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          category?: string
          content?: string | null
          created_at?: string
          favorite_order?: number
          id?: string
          is_favorite?: boolean
          parent_id?: string | null
          sort_index?: number
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          category?: string
          content?: string | null
          created_at?: string
          favorite_order?: number
          id?: string
          is_favorite?: boolean
          parent_id?: string | null
          sort_index?: number
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_pages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "org_pages"
            referencedColumns: ["id"]
          },
        ]
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
