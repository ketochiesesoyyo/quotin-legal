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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          new_values: Json | null
          old_values: Json | null
          record_id: string
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id: string
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      case_activities: {
        Row: {
          action: string
          case_id: string
          created_at: string
          details: Json | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          case_id: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          case_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_activities_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_documents: {
        Row: {
          case_id: string
          checklist_item_id: string | null
          created_at: string
          file_url: string | null
          id: string
          name: string
          notes: string | null
          status: Database["public"]["Enums"]["document_status"]
          updated_at: string
          uploaded_at: string | null
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          case_id: string
          checklist_item_id?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          name: string
          notes?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          updated_at?: string
          uploaded_at?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          case_id?: string
          checklist_item_id?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          name?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          updated_at?: string
          uploaded_at?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_documents_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "checklist_items"
            referencedColumns: ["id"]
          },
        ]
      }
      case_services: {
        Row: {
          case_id: string
          created_at: string
          custom_text: string | null
          id: string
          service_id: string
          sort_order: number | null
        }
        Insert: {
          case_id: string
          created_at?: string
          custom_text?: string | null
          id?: string
          service_id: string
          sort_order?: number | null
        }
        Update: {
          case_id?: string
          created_at?: string
          custom_text?: string | null
          id?: string
          service_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "case_services_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          ai_analysis: Json | null
          ai_analyzed_at: string | null
          ai_status: string | null
          assigned_to: string | null
          client_id: string
          complexity: Database["public"]["Enums"]["level_indicator"] | null
          created_at: string
          created_by: string | null
          custom_initial_payment: number | null
          custom_monthly_retainer: number | null
          custom_retainer_months: number | null
          id: string
          is_recurring_client: boolean | null
          need_type: string | null
          notes: string | null
          price_sensitivity:
            | Database["public"]["Enums"]["level_indicator"]
            | null
          project_reason: string | null
          proposal_content: Json | null
          result_reason: string | null
          scope: Database["public"]["Enums"]["scope_level"] | null
          selected_pricing_id: string | null
          selected_template_id: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["case_status"]
          title: string
          updated_at: string
          urgency: Database["public"]["Enums"]["urgency_level"] | null
        }
        Insert: {
          ai_analysis?: Json | null
          ai_analyzed_at?: string | null
          ai_status?: string | null
          assigned_to?: string | null
          client_id: string
          complexity?: Database["public"]["Enums"]["level_indicator"] | null
          created_at?: string
          created_by?: string | null
          custom_initial_payment?: number | null
          custom_monthly_retainer?: number | null
          custom_retainer_months?: number | null
          id?: string
          is_recurring_client?: boolean | null
          need_type?: string | null
          notes?: string | null
          price_sensitivity?:
            | Database["public"]["Enums"]["level_indicator"]
            | null
          project_reason?: string | null
          proposal_content?: Json | null
          result_reason?: string | null
          scope?: Database["public"]["Enums"]["scope_level"] | null
          selected_pricing_id?: string | null
          selected_template_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["case_status"]
          title: string
          updated_at?: string
          urgency?: Database["public"]["Enums"]["urgency_level"] | null
        }
        Update: {
          ai_analysis?: Json | null
          ai_analyzed_at?: string | null
          ai_status?: string | null
          assigned_to?: string | null
          client_id?: string
          complexity?: Database["public"]["Enums"]["level_indicator"] | null
          created_at?: string
          created_by?: string | null
          custom_initial_payment?: number | null
          custom_monthly_retainer?: number | null
          custom_retainer_months?: number | null
          id?: string
          is_recurring_client?: boolean | null
          need_type?: string | null
          notes?: string | null
          price_sensitivity?:
            | Database["public"]["Enums"]["level_indicator"]
            | null
          project_reason?: string | null
          proposal_content?: Json | null
          result_reason?: string | null
          scope?: Database["public"]["Enums"]["scope_level"] | null
          selected_pricing_id?: string | null
          selected_template_id?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["case_status"]
          title?: string
          updated_at?: string
          urgency?: Database["public"]["Enums"]["urgency_level"] | null
        }
        Relationships: [
          {
            foreignKeyName: "cases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_selected_pricing_id_fkey"
            columns: ["selected_pricing_id"]
            isOneToOne: false
            referencedRelation: "pricing_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_selected_template_id_fkey"
            columns: ["selected_template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      client_contacts: {
        Row: {
          client_id: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_primary: boolean | null
          phone: string | null
          position: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_primary?: boolean | null
          phone?: string | null
          position?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_primary?: boolean | null
          phone?: string | null
          position?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_documents: {
        Row: {
          created_at: string | null
          document_type: string
          entity_id: string
          file_name: string | null
          file_url: string | null
          id: string
          notes: string | null
          status: string | null
          updated_at: string | null
          uploaded_at: string | null
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          created_at?: string | null
          document_type: string
          entity_id: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          created_at?: string | null
          document_type?: string
          entity_id?: string
          file_name?: string | null
          file_url?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          updated_at?: string | null
          uploaded_at?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_documents_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "client_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      client_entities: {
        Row: {
          client_id: string
          created_at: string
          id: string
          legal_name: string
          rfc: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          legal_name: string
          rfc?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          legal_name?: string
          rfc?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_entities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          alias: string | null
          annual_revenue: string | null
          created_at: string
          created_by: string | null
          employee_count: number | null
          group_name: string
          id: string
          industry: string | null
          notes: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          alias?: string | null
          annual_revenue?: string | null
          created_at?: string
          created_by?: string | null
          employee_count?: number | null
          group_name: string
          id?: string
          industry?: string | null
          notes?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          alias?: string | null
          annual_revenue?: string | null
          created_at?: string
          created_by?: string | null
          employee_count?: number | null
          group_name?: string
          id?: string
          industry?: string | null
          notes?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      document_templates: {
        Row: {
          content: Json | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          content?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          content?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      firm_settings: {
        Row: {
          address: string | null
          closing_text: string | null
          created_at: string
          disclaimers_text: string | null
          email: string | null
          guarantees_text: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          closing_text?: string | null
          created_at?: string
          disclaimers_text?: string | null
          email?: string | null
          guarantees_text?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          closing_text?: string | null
          created_at?: string
          disclaimers_text?: string | null
          email?: string | null
          guarantees_text?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      pricing_templates: {
        Row: {
          created_at: string
          exclusions_text: string | null
          id: string
          initial_payment: number | null
          initial_payment_split: string | null
          is_active: boolean | null
          monthly_retainer: number | null
          name: string
          retainer_months: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          exclusions_text?: string | null
          id?: string
          initial_payment?: number | null
          initial_payment_split?: string | null
          is_active?: boolean | null
          monthly_retainer?: number | null
          name: string
          retainer_months?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          exclusions_text?: string | null
          id?: string
          initial_payment?: number | null
          initial_payment_split?: string | null
          is_active?: boolean | null
          monthly_retainer?: number | null
          name?: string
          retainer_months?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      proposal_versions: {
        Row: {
          case_id: string
          content: Json
          created_at: string
          created_by: string | null
          id: string
          version_number: number
        }
        Insert: {
          case_id: string
          content: Json
          created_at?: string
          created_by?: string | null
          id?: string
          version_number?: number
        }
        Update: {
          case_id?: string
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposal_versions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
          standard_text: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
          standard_text?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
          standard_text?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "abogado" | "asistente"
      case_status:
        | "nuevo"
        | "docs_solicitados"
        | "docs_recibidos"
        | "en_analisis"
        | "borrador"
        | "revision"
        | "enviada"
        | "negociacion"
        | "ganada"
        | "perdida"
      document_status: "pendiente" | "recibido" | "validado" | "rechazado"
      level_indicator: "baja" | "media" | "alta"
      scope_level:
        | "diagnostico"
        | "diagnostico_implementacion"
        | "acompanamiento_continuo"
      urgency_level: "inmediata" | "30_dias" | "90_dias"
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
    Enums: {
      app_role: ["admin", "abogado", "asistente"],
      case_status: [
        "nuevo",
        "docs_solicitados",
        "docs_recibidos",
        "en_analisis",
        "borrador",
        "revision",
        "enviada",
        "negociacion",
        "ganada",
        "perdida",
      ],
      document_status: ["pendiente", "recibido", "validado", "rechazado"],
      level_indicator: ["baja", "media", "alta"],
      scope_level: [
        "diagnostico",
        "diagnostico_implementacion",
        "acompanamiento_continuo",
      ],
      urgency_level: ["inmediata", "30_dias", "90_dias"],
    },
  },
} as const
