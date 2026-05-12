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
      atividades: {
        Row: {
          card_id: string | null
          cliente_id: string | null
          created_at: string
          data: string
          descricao: string | null
          duracao: number | null
          id: string
          responsavel_id: string | null
          status: string
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          card_id?: string | null
          cliente_id?: string | null
          created_at?: string
          data: string
          descricao?: string | null
          duracao?: number | null
          id?: string
          responsavel_id?: string | null
          status?: string
          tipo: string
          titulo: string
          updated_at?: string
        }
        Update: {
          card_id?: string | null
          cliente_id?: string | null
          created_at?: string
          data?: string
          descricao?: string | null
          duracao?: number | null
          id?: string
          responsavel_id?: string | null
          status?: string
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "atividades_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cards_pipeline: {
        Row: {
          cliente_id: string
          consultor_id: string | null
          created_at: string
          dias_na_etapa_desde: string
          id: string
          motivo_perda: string | null
          origem: string
          potencia_kwp: number
          stage: string
          updated_at: string
          valor_estimado: number
        }
        Insert: {
          cliente_id: string
          consultor_id?: string | null
          created_at?: string
          dias_na_etapa_desde?: string
          id?: string
          motivo_perda?: string | null
          origem?: string
          potencia_kwp?: number
          stage?: string
          updated_at?: string
          valor_estimado?: number
        }
        Update: {
          cliente_id?: string
          consultor_id?: string | null
          created_at?: string
          dias_na_etapa_desde?: string
          id?: string
          motivo_perda?: string | null
          origem?: string
          potencia_kwp?: number
          stage?: string
          updated_at?: string
          valor_estimado?: number
        }
        Relationships: [
          {
            foreignKeyName: "cards_pipeline_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_pipeline_consultor_id_fkey"
            columns: ["consultor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          ativo: boolean
          bairro: string | null
          cep: string | null
          cidade: string | null
          concessionaria: string | null
          consultor_id: string | null
          consumo_medio: number | null
          created_at: string
          created_by: string | null
          documento: string | null
          email: string | null
          grupo_tarifario: string | null
          id: string
          nome: string
          numero: string | null
          observacoes: string | null
          origem: string
          rede: string | null
          rua: string | null
          segmento: string
          tarifa: number | null
          telefone: string | null
          tipo: string
          uc: string | null
          uf: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          concessionaria?: string | null
          consultor_id?: string | null
          consumo_medio?: number | null
          created_at?: string
          created_by?: string | null
          documento?: string | null
          email?: string | null
          grupo_tarifario?: string | null
          id?: string
          nome: string
          numero?: string | null
          observacoes?: string | null
          origem?: string
          rede?: string | null
          rua?: string | null
          segmento?: string
          tarifa?: number | null
          telefone?: string | null
          tipo?: string
          uc?: string | null
          uf?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          ativo?: boolean
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          concessionaria?: string | null
          consultor_id?: string | null
          consumo_medio?: number | null
          created_at?: string
          created_by?: string | null
          documento?: string | null
          email?: string | null
          grupo_tarifario?: string | null
          id?: string
          nome?: string
          numero?: string | null
          observacoes?: string | null
          origem?: string
          rede?: string | null
          rua?: string | null
          segmento?: string
          tarifa?: number | null
          telefone?: string | null
          tipo?: string
          uc?: string | null
          uf?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_consultor_id_fkey"
            columns: ["consultor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      config_global: {
        Row: {
          empresa: Json
          id: number
          metas: Json
          sla: Json
          updated_at: string
        }
        Insert: {
          empresa?: Json
          id?: number
          metas?: Json
          sla?: Json
          updated_at?: string
        }
        Update: {
          empresa?: Json
          id?: number
          metas?: Json
          sla?: Json
          updated_at?: string
        }
        Relationships: []
      }
      etapas_projeto: {
        Row: {
          created_at: string
          data_prevista: string | null
          data_real: string | null
          etapa_id: string
          extra: Json | null
          id: string
          observacoes_internas: string | null
          ordem: number
          projeto_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_prevista?: string | null
          data_real?: string | null
          etapa_id: string
          extra?: Json | null
          id?: string
          observacoes_internas?: string | null
          ordem?: number
          projeto_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_prevista?: string | null
          data_real?: string | null
          etapa_id?: string
          extra?: Json | null
          id?: string
          observacoes_internas?: string | null
          ordem?: number
          projeto_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "etapas_projeto_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
        ]
      }
      interacoes: {
        Row: {
          cliente_id: string
          created_at: string
          data: string
          descricao: string | null
          id: string
          tipo: string
          titulo: string
          usuario_id: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data?: string
          descricao?: string | null
          id?: string
          tipo: string
          titulo: string
          usuario_id?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data?: string
          descricao?: string | null
          id?: string
          tipo?: string
          titulo?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interacoes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      motivos_perda: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          texto: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          texto: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          texto?: string
        }
        Relationships: []
      }
      notificacoes: {
        Row: {
          created_at: string
          id: string
          lida: boolean
          link: string | null
          mensagem: string | null
          resolvida: boolean
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lida?: boolean
          link?: string | null
          mensagem?: string | null
          resolvida?: boolean
          tipo: string
          titulo: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lida?: boolean
          link?: string | null
          mensagem?: string | null
          resolvida?: boolean
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean
          categoria: string
          created_at: string
          detalhes: string | null
          fabricante: string | null
          garantia_anos: number | null
          id: string
          nome: string
          potencia_kw: number | null
          potencia_w: number | null
          preco_custo: number
          preco_venda: number
          unidade: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria: string
          created_at?: string
          detalhes?: string | null
          fabricante?: string | null
          garantia_anos?: number | null
          id?: string
          nome: string
          potencia_kw?: number | null
          potencia_w?: number | null
          preco_custo?: number
          preco_venda?: number
          unidade?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          detalhes?: string | null
          fabricante?: string | null
          garantia_anos?: number | null
          id?: string
          nome?: string
          potencia_kw?: number | null
          potencia_w?: number | null
          preco_custo?: number
          preco_venda?: number
          unidade?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ativo: boolean
          avatar_url: string | null
          cor: string
          created_at: string
          email: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          avatar_url?: string | null
          cor?: string
          created_at?: string
          email?: string | null
          id: string
          nome: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          avatar_url?: string | null
          cor?: string
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      projetos: {
        Row: {
          card_id: string
          cliente_id: string
          consultor_id: string | null
          created_at: string
          id: string
          potencia_kwp: number
          tecnico_id: string | null
          token_ativo: boolean
          token_publico: string
          updated_at: string
          valor_investimento: number
        }
        Insert: {
          card_id: string
          cliente_id: string
          consultor_id?: string | null
          created_at?: string
          id?: string
          potencia_kwp?: number
          tecnico_id?: string | null
          token_ativo?: boolean
          token_publico?: string
          updated_at?: string
          valor_investimento?: number
        }
        Update: {
          card_id?: string
          cliente_id?: string
          consultor_id?: string | null
          created_at?: string
          id?: string
          potencia_kwp?: number
          tecnico_id?: string | null
          token_ativo?: boolean
          token_publico?: string
          updated_at?: string
          valor_investimento?: number
        }
        Relationships: [
          {
            foreignKeyName: "projetos_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: true
            referencedRelation: "cards_pipeline"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projetos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projetos_consultor_id_fkey"
            columns: ["consultor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projetos_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      proposta_aberturas: {
        Row: {
          aberto_em: string
          id: string
          ip: string | null
          proposta_id: string
          referer: string | null
          share_id: string
          user_agent: string | null
        }
        Insert: {
          aberto_em?: string
          id?: string
          ip?: string | null
          proposta_id: string
          referer?: string | null
          share_id: string
          user_agent?: string | null
        }
        Update: {
          aberto_em?: string
          id?: string
          ip?: string | null
          proposta_id?: string
          referer?: string | null
          share_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposta_aberturas_share_id_fkey"
            columns: ["share_id"]
            isOneToOne: false
            referencedRelation: "propostas_compartilhadas"
            referencedColumns: ["id"]
          },
        ]
      }
      proposta_itens: {
        Row: {
          created_at: string
          id: string
          ordem: number
          preco_unitario: number
          produto_id: string | null
          proposta_id: string
          quantidade: number
        }
        Insert: {
          created_at?: string
          id?: string
          ordem?: number
          preco_unitario?: number
          produto_id?: string | null
          proposta_id: string
          quantidade?: number
        }
        Update: {
          created_at?: string
          id?: string
          ordem?: number
          preco_unitario?: number
          produto_id?: string | null
          proposta_id?: string
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposta_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposta_itens_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "propostas"
            referencedColumns: ["id"]
          },
        ]
      }
      propostas: {
        Row: {
          cliente_id: string
          cobertura: number | null
          consultor_id: string | null
          created_at: string
          eficiencia: number | null
          id: string
          inflacao: number | null
          irradiacao: number | null
          kit_consumo_kwh: number | null
          kit_nome: string | null
          mostrar_como_kit: boolean
          numero: string
          observacoes: string | null
          status: string
          taxa_cartao: number | null
          taxa_financiamento: number | null
          updated_at: string
          validade_ate: string
          versao: number
        }
        Insert: {
          cliente_id: string
          cobertura?: number | null
          consultor_id?: string | null
          created_at?: string
          eficiencia?: number | null
          id?: string
          inflacao?: number | null
          irradiacao?: number | null
          kit_consumo_kwh?: number | null
          kit_nome?: string | null
          mostrar_como_kit?: boolean
          numero: string
          observacoes?: string | null
          status?: string
          taxa_cartao?: number | null
          taxa_financiamento?: number | null
          updated_at?: string
          validade_ate: string
          versao?: number
        }
        Update: {
          cliente_id?: string
          cobertura?: number | null
          consultor_id?: string | null
          created_at?: string
          eficiencia?: number | null
          id?: string
          inflacao?: number | null
          irradiacao?: number | null
          kit_consumo_kwh?: number | null
          kit_nome?: string | null
          mostrar_como_kit?: boolean
          numero?: string
          observacoes?: string | null
          status?: string
          taxa_cartao?: number | null
          taxa_financiamento?: number | null
          updated_at?: string
          validade_ate?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "propostas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_consultor_id_fkey"
            columns: ["consultor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      propostas_compartilhadas: {
        Row: {
          ativo: boolean
          cliente_nome: string
          criado_em: string
          expira_em: string
          id: string
          pdf_path: string
          proposta_id: string
          proposta_numero: string
          token: string
          total_aberturas: number
          ultima_abertura: string | null
        }
        Insert: {
          ativo?: boolean
          cliente_nome: string
          criado_em?: string
          expira_em: string
          id?: string
          pdf_path: string
          proposta_id: string
          proposta_numero: string
          token: string
          total_aberturas?: number
          ultima_abertura?: string | null
        }
        Update: {
          ativo?: boolean
          cliente_nome?: string
          criado_em?: string
          expira_em?: string
          id?: string
          pdf_path?: string
          proposta_id?: string
          proposta_numero?: string
          token?: string
          total_aberturas?: number
          ultima_abertura?: string | null
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
          role: Database["public"]["Enums"]["app_role"]
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
      get_projeto_publico: { Args: { p_token: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "gestor" | "consultor" | "tecnico"
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
      app_role: ["admin", "gestor", "consultor", "tecnico"],
    },
  },
} as const
