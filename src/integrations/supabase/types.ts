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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      alunos: {
        Row: {
          activo: boolean
          classe: string
          contacto: string | null
          created_at: string
          data_nascimento: string
          encarregado: string | null
          id: string
          nome: string
          numero_processo: string
          status: string
          turma_id: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          classe: string
          contacto?: string | null
          created_at?: string
          data_nascimento: string
          encarregado?: string | null
          id?: string
          nome: string
          numero_processo: string
          status?: string
          turma_id?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          classe?: string
          contacto?: string | null
          created_at?: string
          data_nascimento?: string
          encarregado?: string | null
          id?: string
          nome?: string
          numero_processo?: string
          status?: string
          turma_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alunos_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          target_audience: string[]
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          target_audience?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          target_audience?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      bank_details: {
        Row: {
          banco: string
          express: string | null
          iban: string
          id: string
          instrucoes: string | null
          titular: string
          updated_at: string
        }
        Insert: {
          banco?: string
          express?: string | null
          iban?: string
          id?: string
          instrucoes?: string | null
          titular?: string
          updated_at?: string
        }
        Update: {
          banco?: string
          express?: string | null
          iban?: string
          id?: string
          instrucoes?: string | null
          titular?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_channels: {
        Row: {
          aluno_id: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          turma_id: string | null
          type: Database["public"]["Enums"]["channel_type"]
        }
        Insert: {
          aluno_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          turma_id?: string | null
          type: Database["public"]["Enums"]["channel_type"]
        }
        Update: {
          aluno_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          turma_id?: string | null
          type?: Database["public"]["Enums"]["channel_type"]
        }
        Relationships: [
          {
            foreignKeyName: "chat_channels_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_channels_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_members: {
        Row: {
          channel_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          channel_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          channel_id: string
          content: string | null
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          channel_id: string
          content?: string | null
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          channel_id?: string
          content?: string | null
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      frequencia: {
        Row: {
          aluno_id: string
          created_at: string
          data: string
          id: string
          observacao: string | null
          presente: boolean
        }
        Insert: {
          aluno_id: string
          created_at?: string
          data: string
          id?: string
          observacao?: string | null
          presente?: boolean
        }
        Update: {
          aluno_id?: string
          created_at?: string
          data?: string
          id?: string
          observacao?: string | null
          presente?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "frequencia_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
        ]
      }
      notas: {
        Row: {
          aluno_id: string
          ano_letivo: number
          created_at: string
          disciplina: string
          id: string
          media: number | null
          n1: number | null
          n2: number | null
          n3: number | null
          trimestre: number
          updated_at: string
        }
        Insert: {
          aluno_id: string
          ano_letivo?: number
          created_at?: string
          disciplina: string
          id?: string
          media?: number | null
          n1?: number | null
          n2?: number | null
          n3?: number | null
          trimestre: number
          updated_at?: string
        }
        Update: {
          aluno_id?: string
          ano_letivo?: number
          created_at?: string
          disciplina?: string
          id?: string
          media?: number | null
          n1?: number | null
          n2?: number | null
          n3?: number | null
          trimestre?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notas_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      pagamentos: {
        Row: {
          aluno_id: string
          ano_referencia: number
          chat_channel_id: string | null
          comprovativo_status: string | null
          comprovativo_url: string | null
          created_at: string
          data_pagamento: string | null
          encarregado_id: string | null
          id: string
          mes_referencia: number
          multa: number
          pago: boolean
          recibo_codigo: string | null
          tipo: string
          updated_at: string
          valor: number
        }
        Insert: {
          aluno_id: string
          ano_referencia: number
          chat_channel_id?: string | null
          comprovativo_status?: string | null
          comprovativo_url?: string | null
          created_at?: string
          data_pagamento?: string | null
          encarregado_id?: string | null
          id?: string
          mes_referencia: number
          multa?: number
          pago?: boolean
          recibo_codigo?: string | null
          tipo?: string
          updated_at?: string
          valor: number
        }
        Update: {
          aluno_id?: string
          ano_referencia?: number
          chat_channel_id?: string | null
          comprovativo_status?: string | null
          comprovativo_url?: string | null
          created_at?: string
          data_pagamento?: string | null
          encarregado_id?: string | null
          id?: string
          mes_referencia?: number
          multa?: number
          pago?: boolean
          recibo_codigo?: string | null
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_chat_channel_id_fkey"
            columns: ["chat_channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ano_ultima_classe: string | null
          avatar_url: string | null
          classe: string | null
          created_at: string
          data_nascimento: string | null
          email: string
          grau_parentesco: string | null
          id: string
          nome: string
          numero_identificacao: string | null
          numero_processo: string | null
          tipo_identificacao: string | null
          ultima_turma: string | null
          updated_at: string
          whatsapp: boolean | null
        }
        Insert: {
          ano_ultima_classe?: string | null
          avatar_url?: string | null
          classe?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string
          grau_parentesco?: string | null
          id: string
          nome?: string
          numero_identificacao?: string | null
          numero_processo?: string | null
          tipo_identificacao?: string | null
          ultima_turma?: string | null
          updated_at?: string
          whatsapp?: boolean | null
        }
        Update: {
          ano_ultima_classe?: string | null
          avatar_url?: string | null
          classe?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string
          grau_parentesco?: string | null
          id?: string
          nome?: string
          numero_identificacao?: string | null
          numero_processo?: string | null
          tipo_identificacao?: string | null
          ultima_turma?: string | null
          updated_at?: string
          whatsapp?: boolean | null
        }
        Relationships: []
      }
      staff_profiles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          classes: string[] | null
          created_at: string
          disciplinas: string[] | null
          employee_id: string | null
          especialidade: string | null
          id: string
          rejection_reason: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: string
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          classes?: string[] | null
          created_at?: string
          disciplinas?: string[] | null
          employee_id?: string | null
          especialidade?: string | null
          id?: string
          rejection_reason?: string | null
          role: Database["public"]["Enums"]["app_role"]
          status?: string
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          classes?: string[] | null
          created_at?: string
          disciplinas?: string[] | null
          employee_id?: string | null
          especialidade?: string | null
          id?: string
          rejection_reason?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      turmas: {
        Row: {
          ano_letivo: number
          classe: string
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          ano_letivo?: number
          classe: string
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          ano_letivo?: number
          classe?: string
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      ensure_staff_channel: { Args: never; Returns: string }
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
      is_channel_member: {
        Args: { _channel_id: string; _user_id: string }
        Returns: boolean
      }
      is_staff_approved: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "professor" | "aluno" | "encarregado" | "secretario"
      channel_type: "staff" | "turma" | "pagamento"
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
      app_role: ["admin", "professor", "aluno", "encarregado", "secretario"],
      channel_type: ["staff", "turma", "pagamento"],
    },
  },
} as const
