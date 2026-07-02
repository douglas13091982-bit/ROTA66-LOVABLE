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
      admin_permissoes: {
        Row: {
          area: Database["public"]["Enums"]["admin_area"]
          can_write: boolean
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          area: Database["public"]["Enums"]["admin_area"]
          can_write?: boolean
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          area?: Database["public"]["Enums"]["admin_area"]
          can_write?: boolean
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      agendamento_aceites: {
        Row: {
          aceito_em: string
          agendamento_id: string
          created_at: string
          entregador_id: string
          id: string
        }
        Insert: {
          aceito_em?: string
          agendamento_id: string
          created_at?: string
          entregador_id: string
          id?: string
        }
        Update: {
          aceito_em?: string
          agendamento_id?: string
          created_at?: string
          entregador_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agendamento_aceites_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      agendamento_ofertas: {
        Row: {
          agendamento_id: string
          created_at: string
          entregador_id: string
          expira_em: string
          id: string
          status: Database["public"]["Enums"]["agendamento_oferta_status"]
        }
        Insert: {
          agendamento_id: string
          created_at?: string
          entregador_id: string
          expira_em: string
          id?: string
          status?: Database["public"]["Enums"]["agendamento_oferta_status"]
        }
        Update: {
          agendamento_id?: string
          created_at?: string
          entregador_id?: string
          expira_em?: string
          id?: string
          status?: Database["public"]["Enums"]["agendamento_oferta_status"]
        }
        Relationships: [
          {
            foreignKeyName: "agendamento_ofertas_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      agendamentos: {
        Row: {
          aceito_em: string | null
          cancelado_em: string | null
          concluido_em: string | null
          created_at: string
          data_turno: string
          duracao_horas: number
          entregador_id: string | null
          hora_inicio: string
          id: string
          loja_id: string
          observacoes: string | null
          publicado_em: string | null
          status: Database["public"]["Enums"]["agendamento_status"]
          taxa_por_entrega: number
          updated_at: string
          vagas_preenchidas: number
          vagas_total: number
          valor_por_hora: number
        }
        Insert: {
          aceito_em?: string | null
          cancelado_em?: string | null
          concluido_em?: string | null
          created_at?: string
          data_turno: string
          duracao_horas: number
          entregador_id?: string | null
          hora_inicio: string
          id?: string
          loja_id: string
          observacoes?: string | null
          publicado_em?: string | null
          status?: Database["public"]["Enums"]["agendamento_status"]
          taxa_por_entrega?: number
          updated_at?: string
          vagas_preenchidas?: number
          vagas_total?: number
          valor_por_hora: number
        }
        Update: {
          aceito_em?: string | null
          cancelado_em?: string | null
          concluido_em?: string | null
          created_at?: string
          data_turno?: string
          duracao_horas?: number
          entregador_id?: string | null
          hora_inicio?: string
          id?: string
          loja_id?: string
          observacoes?: string | null
          publicado_em?: string | null
          status?: Database["public"]["Enums"]["agendamento_status"]
          taxa_por_entrega?: number
          updated_at?: string
          vagas_preenchidas?: number
          vagas_total?: number
          valor_por_hora?: number
        }
        Relationships: [
          {
            foreignKeyName: "agendamentos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas_para_entregador"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas_publicas"
            referencedColumns: ["id"]
          },
        ]
      }
      anuncios_entregador: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          image_data_url: string
          link_url: string | null
          ordem: number
          titulo: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          image_data_url: string
          link_url?: string | null
          ordem?: number
          titulo?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          image_data_url?: string
          link_url?: string | null
          ordem?: number
          titulo?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      avatar_audit_log: {
        Row: {
          actor_id: string | null
          created_at: string
          error_code: string | null
          error_message: string | null
          event: string
          id: string
          mime_type: string | null
          new_avatar_url: string | null
          previous_avatar_url: string | null
          size_bytes: number | null
          storage_path: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          event: string
          id?: string
          mime_type?: string | null
          new_avatar_url?: string | null
          previous_avatar_url?: string | null
          size_bytes?: number | null
          storage_path?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          event?: string
          id?: string
          mime_type?: string | null
          new_avatar_url?: string | null
          previous_avatar_url?: string | null
          size_bytes?: number | null
          storage_path?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      cidades: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          slug: string
          uf: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          slug: string
          uf: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          slug?: string
          uf?: string
          updated_at?: string
        }
        Relationships: []
      }
      clientes_loja: {
        Row: {
          complemento: string | null
          created_at: string
          endereco: string | null
          id: string
          loja_id: string
          nome: string
          telefone: string
          updated_at: string
        }
        Insert: {
          complemento?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          loja_id: string
          nome: string
          telefone: string
          updated_at?: string
        }
        Update: {
          complemento?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          loja_id?: string
          nome?: string
          telefone?: string
          updated_at?: string
        }
        Relationships: []
      }
      cobrancas_faturas_mp: {
        Row: {
          created_at: string
          id: string
          loja_id: string
          metodo_pagamento: string | null
          mp_payment_id: string | null
          mp_payment_status: string | null
          mp_pix_expira_em: string | null
          mp_qr_code: string | null
          mp_qr_code_base64: string | null
          mp_ticket_url: string | null
          pago: boolean
          pago_em: string | null
          qtd_cobrancas: number
          updated_at: string
          valor_total: number
        }
        Insert: {
          created_at?: string
          id?: string
          loja_id: string
          metodo_pagamento?: string | null
          mp_payment_id?: string | null
          mp_payment_status?: string | null
          mp_pix_expira_em?: string | null
          mp_qr_code?: string | null
          mp_qr_code_base64?: string | null
          mp_ticket_url?: string | null
          pago?: boolean
          pago_em?: string | null
          qtd_cobrancas: number
          updated_at?: string
          valor_total: number
        }
        Update: {
          created_at?: string
          id?: string
          loja_id?: string
          metodo_pagamento?: string | null
          mp_payment_id?: string | null
          mp_payment_status?: string | null
          mp_pix_expira_em?: string | null
          mp_qr_code?: string | null
          mp_qr_code_base64?: string | null
          mp_ticket_url?: string | null
          pago?: boolean
          pago_em?: string | null
          qtd_cobrancas?: number
          updated_at?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "cobrancas_faturas_mp_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobrancas_faturas_mp_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas_para_entregador"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobrancas_faturas_mp_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas_publicas"
            referencedColumns: ["id"]
          },
        ]
      }
      cobrancas_loja: {
        Row: {
          created_at: string
          fatura_mp_id: string | null
          id: string
          loja_id: string
          mensalidade_id: string | null
          metodo_pagamento: string | null
          mp_payment_id: string | null
          mp_payment_status: string | null
          mp_pix_expira_em: string | null
          mp_qr_code: string | null
          mp_qr_code_base64: string | null
          mp_ticket_url: string | null
          pago: boolean
          pago_em: string | null
          pago_solicitado_em: string | null
          pedido_id: string | null
          periodo_fim: string | null
          periodo_inicio: string | null
          qtd_pedidos: number | null
          updated_at: string
          valor: number
          vencimento: string
        }
        Insert: {
          created_at?: string
          fatura_mp_id?: string | null
          id?: string
          loja_id: string
          mensalidade_id?: string | null
          metodo_pagamento?: string | null
          mp_payment_id?: string | null
          mp_payment_status?: string | null
          mp_pix_expira_em?: string | null
          mp_qr_code?: string | null
          mp_qr_code_base64?: string | null
          mp_ticket_url?: string | null
          pago?: boolean
          pago_em?: string | null
          pago_solicitado_em?: string | null
          pedido_id?: string | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          qtd_pedidos?: number | null
          updated_at?: string
          valor: number
          vencimento: string
        }
        Update: {
          created_at?: string
          fatura_mp_id?: string | null
          id?: string
          loja_id?: string
          mensalidade_id?: string | null
          metodo_pagamento?: string | null
          mp_payment_id?: string | null
          mp_payment_status?: string | null
          mp_pix_expira_em?: string | null
          mp_qr_code?: string | null
          mp_qr_code_base64?: string | null
          mp_ticket_url?: string | null
          pago?: boolean
          pago_em?: string | null
          pago_solicitado_em?: string | null
          pedido_id?: string | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          qtd_pedidos?: number | null
          updated_at?: string
          valor?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "cobrancas_loja_fatura_mp_id_fkey"
            columns: ["fatura_mp_id"]
            isOneToOne: false
            referencedRelation: "cobrancas_faturas_mp"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobrancas_loja_mensalidade_id_fkey"
            columns: ["mensalidade_id"]
            isOneToOne: false
            referencedRelation: "mensalidades_loja"
            referencedColumns: ["id"]
          },
        ]
      }
      config_branding: {
        Row: {
          created_at: string
          id: string
          logo_data_url: string | null
          nome_sistema: string
          singleton: boolean
          suporte_horario: string | null
          suporte_whatsapp: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_data_url?: string | null
          nome_sistema?: string
          singleton?: boolean
          suporte_horario?: string | null
          suporte_whatsapp?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_data_url?: string | null
          nome_sistema?: string
          singleton?: boolean
          suporte_horario?: string | null
          suporte_whatsapp?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      config_creditos_entregador: {
        Row: {
          ativo: boolean
          dia_vencimento: number
          mensalidade_valor: number
          mp_access_token: string | null
          mp_public_key: string | null
          saldo_minimo: number
          singleton: boolean
          updated_at: string
          valores_recarga_sugeridos: number[]
        }
        Insert: {
          ativo?: boolean
          dia_vencimento?: number
          mensalidade_valor?: number
          mp_access_token?: string | null
          mp_public_key?: string | null
          saldo_minimo?: number
          singleton?: boolean
          updated_at?: string
          valores_recarga_sugeridos?: number[]
        }
        Update: {
          ativo?: boolean
          dia_vencimento?: number
          mensalidade_valor?: number
          mp_access_token?: string | null
          mp_public_key?: string | null
          saldo_minimo?: number
          singleton?: boolean
          updated_at?: string
          valores_recarga_sugeridos?: number[]
        }
        Relationships: []
      }
      config_financeiro: {
        Row: {
          created_at: string
          dia_vencimento_padrao: number
          id: string
          mensalidade_valor_padrao: number
          pix_chave_sistema: string | null
          pix_cidade_sistema: string | null
          pix_titular_sistema: string | null
          prazo_pagamento_dias: number
          saque_dia_semana: number
          saque_valor_minimo: number
          singleton: boolean
          taxa_por_pedido: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          dia_vencimento_padrao?: number
          id?: string
          mensalidade_valor_padrao?: number
          pix_chave_sistema?: string | null
          pix_cidade_sistema?: string | null
          pix_titular_sistema?: string | null
          prazo_pagamento_dias?: number
          saque_dia_semana?: number
          saque_valor_minimo?: number
          singleton?: boolean
          taxa_por_pedido?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          dia_vencimento_padrao?: number
          id?: string
          mensalidade_valor_padrao?: number
          pix_chave_sistema?: string | null
          pix_cidade_sistema?: string | null
          pix_titular_sistema?: string | null
          prazo_pagamento_dias?: number
          saque_dia_semana?: number
          saque_valor_minimo?: number
          singleton?: boolean
          taxa_por_pedido?: number
          updated_at?: string
        }
        Relationships: []
      }
      config_notificacao_som: {
        Row: {
          ativo: boolean
          audio_path: string | null
          created_at: string
          duracao_ms: number
          frequencia_final: number
          frequencia_inicial: number
          id: string
          intervalo_ms: number
          repeticoes: number
          scope: string
          singleton: boolean
          tipo_onda: string
          updated_at: string
          vibrar: boolean
          volume: number
        }
        Insert: {
          ativo?: boolean
          audio_path?: string | null
          created_at?: string
          duracao_ms?: number
          frequencia_final?: number
          frequencia_inicial?: number
          id?: string
          intervalo_ms?: number
          repeticoes?: number
          scope?: string
          singleton?: boolean
          tipo_onda?: string
          updated_at?: string
          vibrar?: boolean
          volume?: number
        }
        Update: {
          ativo?: boolean
          audio_path?: string | null
          created_at?: string
          duracao_ms?: number
          frequencia_final?: number
          frequencia_inicial?: number
          id?: string
          intervalo_ms?: number
          repeticoes?: number
          scope?: string
          singleton?: boolean
          tipo_onda?: string
          updated_at?: string
          vibrar?: boolean
          volume?: number
        }
        Relationships: []
      }
      config_roteirizacao: {
        Row: {
          catalogo_horizontal_min_categorias: number
          catalogo_horizontal_min_produtos: number
          created_at: string
          entregador_online_ttl_min: number
          id: string
          max_detour_meters: number
          max_detour_seconds: number
          max_paradas_por_rota: number
          max_paradas_por_rota_carro: number
          pool_aberto_scope: string
          raio_agrupamento_preparo_meters: number
          raio_maximo_coleta_km: number
          singleton: boolean
          updated_at: string
        }
        Insert: {
          catalogo_horizontal_min_categorias?: number
          catalogo_horizontal_min_produtos?: number
          created_at?: string
          entregador_online_ttl_min?: number
          id?: string
          max_detour_meters?: number
          max_detour_seconds?: number
          max_paradas_por_rota?: number
          max_paradas_por_rota_carro?: number
          pool_aberto_scope?: string
          raio_agrupamento_preparo_meters?: number
          raio_maximo_coleta_km?: number
          singleton?: boolean
          updated_at?: string
        }
        Update: {
          catalogo_horizontal_min_categorias?: number
          catalogo_horizontal_min_produtos?: number
          created_at?: string
          entregador_online_ttl_min?: number
          id?: string
          max_detour_meters?: number
          max_detour_seconds?: number
          max_paradas_por_rota?: number
          max_paradas_por_rota_carro?: number
          pool_aberto_scope?: string
          raio_agrupamento_preparo_meters?: number
          raio_maximo_coleta_km?: number
          singleton?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      contratos: {
        Row: {
          ativo: boolean
          conteudo: string
          created_at: string
          id: string
          titulo: string
          updated_at: string
          versao: number
        }
        Insert: {
          ativo?: boolean
          conteudo: string
          created_at?: string
          id?: string
          titulo?: string
          updated_at?: string
          versao: number
        }
        Update: {
          ativo?: boolean
          conteudo?: string
          created_at?: string
          id?: string
          titulo?: string
          updated_at?: string
          versao?: number
        }
        Relationships: []
      }
      entregador_creditos: {
        Row: {
          entregador_id: string
          saldo: number
          ultima_competencia_cobrada: string | null
          updated_at: string
        }
        Insert: {
          entregador_id: string
          saldo?: number
          ultima_competencia_cobrada?: string | null
          updated_at?: string
        }
        Update: {
          entregador_id?: string
          saldo?: number
          ultima_competencia_cobrada?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      entregador_creditos_transacoes: {
        Row: {
          competencia: string | null
          created_at: string
          created_by: string | null
          descricao: string | null
          entregador_id: string
          id: string
          mp_payment_id: string | null
          saldo_apos: number
          tipo: Database["public"]["Enums"]["entregador_credito_tipo"]
          valor: number
        }
        Insert: {
          competencia?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          entregador_id: string
          id?: string
          mp_payment_id?: string | null
          saldo_apos: number
          tipo: Database["public"]["Enums"]["entregador_credito_tipo"]
          valor: number
        }
        Update: {
          competencia?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          entregador_id?: string
          id?: string
          mp_payment_id?: string | null
          saldo_apos?: number
          tipo?: Database["public"]["Enums"]["entregador_credito_tipo"]
          valor?: number
        }
        Relationships: []
      }
      entregador_recargas_mp: {
        Row: {
          created_at: string
          creditado: boolean
          entregador_id: string
          expira_em: string | null
          id: string
          mp_payment_id: string | null
          qr_code: string | null
          qr_code_base64: string | null
          status: string
          ticket_url: string | null
          updated_at: string
          valor: number
        }
        Insert: {
          created_at?: string
          creditado?: boolean
          entregador_id: string
          expira_em?: string | null
          id?: string
          mp_payment_id?: string | null
          qr_code?: string | null
          qr_code_base64?: string | null
          status?: string
          ticket_url?: string | null
          updated_at?: string
          valor: number
        }
        Update: {
          created_at?: string
          creditado?: boolean
          entregador_id?: string
          expira_em?: string | null
          id?: string
          mp_payment_id?: string | null
          qr_code?: string | null
          qr_code_base64?: string | null
          status?: string
          ticket_url?: string | null
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      entregador_saques: {
        Row: {
          comprovante_url: string | null
          created_at: string
          entregador_id: string
          id: string
          motivo_rejeicao: string | null
          observacoes_admin: string | null
          pago_em: string | null
          pix_chave: string
          rejeitado_em: string | null
          solicitado_em: string
          status: string
          updated_at: string
          valor: number
        }
        Insert: {
          comprovante_url?: string | null
          created_at?: string
          entregador_id: string
          id?: string
          motivo_rejeicao?: string | null
          observacoes_admin?: string | null
          pago_em?: string | null
          pix_chave: string
          rejeitado_em?: string | null
          solicitado_em?: string
          status?: string
          updated_at?: string
          valor: number
        }
        Update: {
          comprovante_url?: string | null
          created_at?: string
          entregador_id?: string
          id?: string
          motivo_rejeicao?: string | null
          observacoes_admin?: string | null
          pago_em?: string | null
          pix_chave?: string
          rejeitado_em?: string | null
          solicitado_em?: string
          status?: string
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      entregador_status: {
        Row: {
          entregador_id: string
          lat: number | null
          lng: number | null
          online: boolean
          updated_at: string
        }
        Insert: {
          entregador_id: string
          lat?: number | null
          lng?: number | null
          online?: boolean
          updated_at?: string
        }
        Update: {
          entregador_id?: string
          lat?: number | null
          lng?: number | null
          online?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      entregador_status_conta: {
        Row: {
          created_at: string
          entregador_id: string
          motivo: string | null
          status: Database["public"]["Enums"]["status_moderacao"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          entregador_id: string
          motivo?: string | null
          status?: Database["public"]["Enums"]["status_moderacao"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          entregador_id?: string
          motivo?: string | null
          status?: Database["public"]["Enums"]["status_moderacao"]
          updated_at?: string
        }
        Relationships: []
      }
      entregadores_saldo_saque: {
        Row: {
          entregador_id: string
          saldo: number
          total_recebido: number
          total_sacado: number
          updated_at: string
        }
        Insert: {
          entregador_id: string
          saldo?: number
          total_recebido?: number
          total_sacado?: number
          updated_at?: string
        }
        Update: {
          entregador_id?: string
          saldo?: number
          total_recebido?: number
          total_sacado?: number
          updated_at?: string
        }
        Relationships: []
      }
      entregadores_saldo_saque_movimentos: {
        Row: {
          created_at: string
          descricao: string | null
          entregador_id: string
          id: string
          pedido_id: string | null
          saldo_apos: number
          saque_id: string | null
          tipo: string
          valor: number
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          entregador_id: string
          id?: string
          pedido_id?: string | null
          saldo_apos: number
          saque_id?: string | null
          tipo: string
          valor: number
        }
        Update: {
          created_at?: string
          descricao?: string | null
          entregador_id?: string
          id?: string
          pedido_id?: string | null
          saldo_apos?: number
          saque_id?: string | null
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "entregadores_saldo_saque_movimentos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      franqueados_config: {
        Row: {
          ativo: boolean
          bloqueado_por_inadimplencia: boolean
          cidade: string
          city_id: string | null
          created_at: string
          dia_vencimento: number
          dias_tolerancia: number
          mensalidade_valor: number
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          bloqueado_por_inadimplencia?: boolean
          cidade: string
          city_id?: string | null
          created_at?: string
          dia_vencimento?: number
          dias_tolerancia?: number
          mensalidade_valor?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          bloqueado_por_inadimplencia?: boolean
          cidade?: string
          city_id?: string | null
          created_at?: string
          dia_vencimento?: number
          dias_tolerancia?: number
          mensalidade_valor?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "franqueados_config_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cidades"
            referencedColumns: ["id"]
          },
        ]
      }
      franqueados_faturas: {
        Row: {
          competencia: string
          created_at: string
          franqueado_user_id: string
          id: string
          mp_link: string | null
          mp_payment_id: string | null
          pago_em: string | null
          status: string
          updated_at: string
          valor: number
          vencimento: string
        }
        Insert: {
          competencia: string
          created_at?: string
          franqueado_user_id: string
          id?: string
          mp_link?: string | null
          mp_payment_id?: string | null
          pago_em?: string | null
          status?: string
          updated_at?: string
          valor: number
          vencimento: string
        }
        Update: {
          competencia?: string
          created_at?: string
          franqueado_user_id?: string
          id?: string
          mp_link?: string | null
          mp_payment_id?: string | null
          pago_em?: string | null
          status?: string
          updated_at?: string
          valor?: number
          vencimento?: string
        }
        Relationships: []
      }
      loja_aceites_contrato: {
        Row: {
          aceito_em: string
          contrato_id: string
          full_name_snapshot: string | null
          id: string
          ip: string | null
          loja_id: string
          user_agent: string | null
          versao: number
        }
        Insert: {
          aceito_em?: string
          contrato_id: string
          full_name_snapshot?: string | null
          id?: string
          ip?: string | null
          loja_id: string
          user_agent?: string | null
          versao: number
        }
        Update: {
          aceito_em?: string
          contrato_id?: string
          full_name_snapshot?: string | null
          id?: string
          ip?: string | null
          loja_id?: string
          user_agent?: string | null
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "loja_aceites_contrato_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loja_aceites_contrato_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loja_aceites_contrato_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas_para_entregador"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loja_aceites_contrato_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas_publicas"
            referencedColumns: ["id"]
          },
        ]
      }
      loja_avaliacoes: {
        Row: {
          cliente_user_id: string
          comentario: string | null
          created_at: string
          id: string
          loja_id: string
          nota: number
          pedido_id: string | null
          updated_at: string
        }
        Insert: {
          cliente_user_id: string
          comentario?: string | null
          created_at?: string
          id?: string
          loja_id: string
          nota: number
          pedido_id?: string | null
          updated_at?: string
        }
        Update: {
          cliente_user_id?: string
          comentario?: string | null
          created_at?: string
          id?: string
          loja_id?: string
          nota?: number
          pedido_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "loja_avaliacoes_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loja_avaliacoes_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas_para_entregador"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loja_avaliacoes_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas_publicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loja_avaliacoes_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      loja_categorias: {
        Row: {
          ativo: boolean
          created_at: string
          icone: string | null
          icone_url: string | null
          id: string
          label: string
          ordem: number
          updated_at: string
          value: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          icone?: string | null
          icone_url?: string | null
          id?: string
          label: string
          ordem?: number
          updated_at?: string
          value: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          icone?: string | null
          icone_url?: string | null
          id?: string
          label?: string
          ordem?: number
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      loja_entregadores: {
        Row: {
          ativo: boolean
          created_at: string
          entregador_id: string
          id: string
          loja_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          entregador_id: string
          id?: string
          loja_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          entregador_id?: string
          id?: string
          loja_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loja_entregadores_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loja_entregadores_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas_para_entregador"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loja_entregadores_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas_publicas"
            referencedColumns: ["id"]
          },
        ]
      }
      lojas: {
        Row: {
          ativa: boolean
          bairro: string | null
          catalogo_ativo: boolean
          catalogo_layout: string
          catalogo_slug: string | null
          categoria: Database["public"]["Enums"]["loja_categoria"] | null
          cidade: string | null
          city_id: string | null
          cnpj: string | null
          created_at: string
          dia_vencimento_mensalidade: number | null
          endereco: string | null
          endereco_lat: number | null
          endereco_lng: number | null
          estado: string | null
          fechado_manualmente: boolean
          horario_funcionamento: Json
          id: string
          indicado_por_entregador_id: string | null
          logo_url: string | null
          mensalidade_valor: number | null
          nome: string
          owner_id: string
          plano_id: string | null
          plano_mensal_ativo: boolean
          revendedor_id: string | null
          slug: string
          status: Database["public"]["Enums"]["status_moderacao"]
          taxa_entrega_base: number
          taxa_por_pedido: number
          telefone: string | null
          updated_at: string
          usar_horario_automatico: boolean
        }
        Insert: {
          ativa?: boolean
          bairro?: string | null
          catalogo_ativo?: boolean
          catalogo_layout?: string
          catalogo_slug?: string | null
          categoria?: Database["public"]["Enums"]["loja_categoria"] | null
          cidade?: string | null
          city_id?: string | null
          cnpj?: string | null
          created_at?: string
          dia_vencimento_mensalidade?: number | null
          endereco?: string | null
          endereco_lat?: number | null
          endereco_lng?: number | null
          estado?: string | null
          fechado_manualmente?: boolean
          horario_funcionamento?: Json
          id?: string
          indicado_por_entregador_id?: string | null
          logo_url?: string | null
          mensalidade_valor?: number | null
          nome: string
          owner_id: string
          plano_id?: string | null
          plano_mensal_ativo?: boolean
          revendedor_id?: string | null
          slug: string
          status?: Database["public"]["Enums"]["status_moderacao"]
          taxa_entrega_base?: number
          taxa_por_pedido?: number
          telefone?: string | null
          updated_at?: string
          usar_horario_automatico?: boolean
        }
        Update: {
          ativa?: boolean
          bairro?: string | null
          catalogo_ativo?: boolean
          catalogo_layout?: string
          catalogo_slug?: string | null
          categoria?: Database["public"]["Enums"]["loja_categoria"] | null
          cidade?: string | null
          city_id?: string | null
          cnpj?: string | null
          created_at?: string
          dia_vencimento_mensalidade?: number | null
          endereco?: string | null
          endereco_lat?: number | null
          endereco_lng?: number | null
          estado?: string | null
          fechado_manualmente?: boolean
          horario_funcionamento?: Json
          id?: string
          indicado_por_entregador_id?: string | null
          logo_url?: string | null
          mensalidade_valor?: number | null
          nome?: string
          owner_id?: string
          plano_id?: string | null
          plano_mensal_ativo?: boolean
          revendedor_id?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["status_moderacao"]
          taxa_entrega_base?: number
          taxa_por_pedido?: number
          telefone?: string | null
          updated_at?: string
          usar_horario_automatico?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "lojas_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lojas_indicado_por_entregador_id_fkey"
            columns: ["indicado_por_entregador_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lojas_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos_loja"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lojas_revendedor_id_fkey"
            columns: ["revendedor_id"]
            isOneToOne: false
            referencedRelation: "revendedores"
            referencedColumns: ["user_id"]
          },
        ]
      }
      lojas_enderecos_coleta: {
        Row: {
          created_at: string
          endereco: string
          id: string
          lat: number | null
          lng: number | null
          loja_id: string
          padrao: boolean
          rotulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          endereco: string
          id?: string
          lat?: number | null
          lng?: number | null
          loja_id: string
          padrao?: boolean
          rotulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          endereco?: string
          id?: string
          lat?: number | null
          lng?: number | null
          loja_id?: string
          padrao?: boolean
          rotulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lojas_enderecos_coleta_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lojas_enderecos_coleta_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas_para_entregador"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lojas_enderecos_coleta_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas_publicas"
            referencedColumns: ["id"]
          },
        ]
      }
      lojas_pagamento_mp: {
        Row: {
          access_token: string
          ativo: boolean
          created_at: string
          id: string
          loja_id: string
          public_key: string
          updated_at: string
          webhook_secret: string
        }
        Insert: {
          access_token: string
          ativo?: boolean
          created_at?: string
          id?: string
          loja_id: string
          public_key: string
          updated_at?: string
          webhook_secret?: string
        }
        Update: {
          access_token?: string
          ativo?: boolean
          created_at?: string
          id?: string
          loja_id?: string
          public_key?: string
          updated_at?: string
          webhook_secret?: string
        }
        Relationships: [
          {
            foreignKeyName: "lojas_pagamento_mp_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: true
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lojas_pagamento_mp_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: true
            referencedRelation: "lojas_para_entregador"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lojas_pagamento_mp_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: true
            referencedRelation: "lojas_publicas"
            referencedColumns: ["id"]
          },
        ]
      }
      lojas_recargas_mp: {
        Row: {
          aprovado_em: string | null
          created_at: string
          id: string
          loja_id: string
          mp_payment_id: string | null
          mp_preference_id: string | null
          pix_qrcode: string | null
          pix_qrcode_base64: string | null
          status: string
          updated_at: string
          valor: number
        }
        Insert: {
          aprovado_em?: string | null
          created_at?: string
          id?: string
          loja_id: string
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          pix_qrcode?: string | null
          pix_qrcode_base64?: string | null
          status?: string
          updated_at?: string
          valor: number
        }
        Update: {
          aprovado_em?: string | null
          created_at?: string
          id?: string
          loja_id?: string
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          pix_qrcode?: string | null
          pix_qrcode_base64?: string | null
          status?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "lojas_recargas_mp_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lojas_recargas_mp_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas_para_entregador"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lojas_recargas_mp_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas_publicas"
            referencedColumns: ["id"]
          },
        ]
      }
      lojas_saldo: {
        Row: {
          loja_id: string
          saldo: number
          saldo_vendas: number
          updated_at: string
        }
        Insert: {
          loja_id: string
          saldo?: number
          saldo_vendas?: number
          updated_at?: string
        }
        Update: {
          loja_id?: string
          saldo?: number
          saldo_vendas?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lojas_saldo_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: true
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lojas_saldo_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: true
            referencedRelation: "lojas_para_entregador"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lojas_saldo_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: true
            referencedRelation: "lojas_publicas"
            referencedColumns: ["id"]
          },
        ]
      }
      lojas_saldo_movimentos: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          loja_id: string
          pedido_id: string | null
          saldo_apos: number
          tipo: string
          valor: number
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          loja_id: string
          pedido_id?: string | null
          saldo_apos: number
          tipo: string
          valor: number
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          loja_id?: string
          pedido_id?: string | null
          saldo_apos?: number
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "lojas_saldo_movimentos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lojas_saldo_movimentos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas_para_entregador"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lojas_saldo_movimentos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas_publicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lojas_saldo_movimentos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      lojas_saques: {
        Row: {
          comprovante_url: string | null
          created_at: string
          id: string
          loja_id: string
          motivo_rejeicao: string | null
          observacoes_admin: string | null
          pago_em: string | null
          pix_chave: string
          rejeitado_em: string | null
          solicitado_em: string
          status: string
          updated_at: string
          valor: number
        }
        Insert: {
          comprovante_url?: string | null
          created_at?: string
          id?: string
          loja_id: string
          motivo_rejeicao?: string | null
          observacoes_admin?: string | null
          pago_em?: string | null
          pix_chave: string
          rejeitado_em?: string | null
          solicitado_em?: string
          status?: string
          updated_at?: string
          valor: number
        }
        Update: {
          comprovante_url?: string | null
          created_at?: string
          id?: string
          loja_id?: string
          motivo_rejeicao?: string | null
          observacoes_admin?: string | null
          pago_em?: string | null
          pix_chave?: string
          rejeitado_em?: string | null
          solicitado_em?: string
          status?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "lojas_saques_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lojas_saques_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas_para_entregador"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lojas_saques_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas_publicas"
            referencedColumns: ["id"]
          },
        ]
      }
      mensalidades_loja: {
        Row: {
          competencia: string
          created_at: string
          id: string
          loja_id: string
          metodo_pagamento: string | null
          mp_payment_id: string | null
          mp_payment_status: string | null
          mp_pix_expira_em: string | null
          mp_qr_code: string | null
          mp_qr_code_base64: string | null
          mp_ticket_url: string | null
          pago: boolean
          pago_em: string | null
          pago_solicitado_em: string | null
          updated_at: string
          valor: number
          valor_tarifas_pedidos: number
          valor_total: number | null
          vencimento: string
        }
        Insert: {
          competencia: string
          created_at?: string
          id?: string
          loja_id: string
          metodo_pagamento?: string | null
          mp_payment_id?: string | null
          mp_payment_status?: string | null
          mp_pix_expira_em?: string | null
          mp_qr_code?: string | null
          mp_qr_code_base64?: string | null
          mp_ticket_url?: string | null
          pago?: boolean
          pago_em?: string | null
          pago_solicitado_em?: string | null
          updated_at?: string
          valor: number
          valor_tarifas_pedidos?: number
          valor_total?: number | null
          vencimento: string
        }
        Update: {
          competencia?: string
          created_at?: string
          id?: string
          loja_id?: string
          metodo_pagamento?: string | null
          mp_payment_id?: string | null
          mp_payment_status?: string | null
          mp_pix_expira_em?: string | null
          mp_qr_code?: string | null
          mp_qr_code_base64?: string | null
          mp_ticket_url?: string | null
          pago?: boolean
          pago_em?: string | null
          pago_solicitado_em?: string | null
          updated_at?: string
          valor?: number
          valor_tarifas_pedidos?: number
          valor_total?: number | null
          vencimento?: string
        }
        Relationships: []
      }
      password_reset_requests: {
        Row: {
          created_at: string
          email: string
          id: string
          observacao: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          token: string | null
          token_expires_at: string | null
          updated_at: string
          used_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          observacao?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          used_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          observacao?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          used_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      pedido_mensagens: {
        Row: {
          created_at: string
          id: string
          lida_em: string | null
          mensagem: string
          pedido_id: string
          sender_id: string
          sender_role: string
        }
        Insert: {
          created_at?: string
          id?: string
          lida_em?: string | null
          mensagem: string
          pedido_id: string
          sender_id: string
          sender_role: string
        }
        Update: {
          created_at?: string
          id?: string
          lida_em?: string | null
          mensagem?: string
          pedido_id?: string
          sender_id?: string
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedido_mensagens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_ofertas: {
        Row: {
          ciclo: number
          created_at: string
          entregador_id: string
          expira_em: string
          id: string
          ofertado_em: string
          pedido_id: string
          status: string
        }
        Insert: {
          ciclo?: number
          created_at?: string
          entregador_id: string
          expira_em: string
          id?: string
          ofertado_em?: string
          pedido_id: string
          status?: string
        }
        Update: {
          ciclo?: number
          created_at?: string
          entregador_id?: string
          expira_em?: string
          id?: string
          ofertado_em?: string
          pedido_id?: string
          status?: string
        }
        Relationships: []
      }
      pedidos: {
        Row: {
          arquivado: boolean
          atribuido_automaticamente: boolean
          bonus_entregador: number
          cidade: string | null
          cliente_nome: string
          cliente_telefone: string
          cliente_user_id: string | null
          codigo_coleta: string | null
          codigo_entrega: string | null
          coleta_confirmada_em: string | null
          complemento: string | null
          created_at: string
          distancia_metros: number | null
          duracao_estimada_seg: number | null
          endereco_coleta: string | null
          endereco_coleta_lat: number | null
          endereco_coleta_lng: number | null
          endereco_entrega: string
          endereco_entrega_lat: number | null
          endereco_entrega_lng: number | null
          entrega_confirmada_em: string | null
          entrega_paga: boolean
          entrega_paga_em: string | null
          entregador_id: string | null
          eta_chegada_at: string | null
          forma_pagamento: Database["public"]["Enums"]["forma_pagamento"]
          id: string
          itens: Json
          loja_id: string
          mp_payment_id: string | null
          mp_payment_status: string | null
          mp_pix_expira_em: string | null
          numero: number
          observacoes: string | null
          pagamento_aprovado_em: string | null
          rota_id: string | null
          rota_ordem: number | null
          status: Database["public"]["Enums"]["pedido_status"]
          taxa_entrega: number
          troco_para: number | null
          updated_at: string
          valor_produtos: number
          valor_total: number
        }
        Insert: {
          arquivado?: boolean
          atribuido_automaticamente?: boolean
          bonus_entregador?: number
          cidade?: string | null
          cliente_nome: string
          cliente_telefone: string
          cliente_user_id?: string | null
          codigo_coleta?: string | null
          codigo_entrega?: string | null
          coleta_confirmada_em?: string | null
          complemento?: string | null
          created_at?: string
          distancia_metros?: number | null
          duracao_estimada_seg?: number | null
          endereco_coleta?: string | null
          endereco_coleta_lat?: number | null
          endereco_coleta_lng?: number | null
          endereco_entrega: string
          endereco_entrega_lat?: number | null
          endereco_entrega_lng?: number | null
          entrega_confirmada_em?: string | null
          entrega_paga?: boolean
          entrega_paga_em?: string | null
          entregador_id?: string | null
          eta_chegada_at?: string | null
          forma_pagamento?: Database["public"]["Enums"]["forma_pagamento"]
          id?: string
          itens?: Json
          loja_id: string
          mp_payment_id?: string | null
          mp_payment_status?: string | null
          mp_pix_expira_em?: string | null
          numero?: number
          observacoes?: string | null
          pagamento_aprovado_em?: string | null
          rota_id?: string | null
          rota_ordem?: number | null
          status?: Database["public"]["Enums"]["pedido_status"]
          taxa_entrega?: number
          troco_para?: number | null
          updated_at?: string
          valor_produtos?: number
          valor_total?: number
        }
        Update: {
          arquivado?: boolean
          atribuido_automaticamente?: boolean
          bonus_entregador?: number
          cidade?: string | null
          cliente_nome?: string
          cliente_telefone?: string
          cliente_user_id?: string | null
          codigo_coleta?: string | null
          codigo_entrega?: string | null
          coleta_confirmada_em?: string | null
          complemento?: string | null
          created_at?: string
          distancia_metros?: number | null
          duracao_estimada_seg?: number | null
          endereco_coleta?: string | null
          endereco_coleta_lat?: number | null
          endereco_coleta_lng?: number | null
          endereco_entrega?: string
          endereco_entrega_lat?: number | null
          endereco_entrega_lng?: number | null
          entrega_confirmada_em?: string | null
          entrega_paga?: boolean
          entrega_paga_em?: string | null
          entregador_id?: string | null
          eta_chegada_at?: string | null
          forma_pagamento?: Database["public"]["Enums"]["forma_pagamento"]
          id?: string
          itens?: Json
          loja_id?: string
          mp_payment_id?: string | null
          mp_payment_status?: string | null
          mp_pix_expira_em?: string | null
          numero?: number
          observacoes?: string | null
          pagamento_aprovado_em?: string | null
          rota_id?: string | null
          rota_ordem?: number | null
          status?: Database["public"]["Enums"]["pedido_status"]
          taxa_entrega?: number
          troco_para?: number | null
          updated_at?: string
          valor_produtos?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas_para_entregador"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas_publicas"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_pendentes_pagamento: {
        Row: {
          created_at: string
          dados: Json
          forma_pagamento: string
          id: string
          loja_id: string
          mp_payment_id: string | null
          mp_payment_status: string | null
          mp_pix_expira_em: string | null
          mp_pix_qr_base64: string | null
          mp_pix_qr_code: string | null
          pedido_id: string | null
          status: string
          updated_at: string
          valor_total: number
        }
        Insert: {
          created_at?: string
          dados: Json
          forma_pagamento: string
          id?: string
          loja_id: string
          mp_payment_id?: string | null
          mp_payment_status?: string | null
          mp_pix_expira_em?: string | null
          mp_pix_qr_base64?: string | null
          mp_pix_qr_code?: string | null
          pedido_id?: string | null
          status?: string
          updated_at?: string
          valor_total: number
        }
        Update: {
          created_at?: string
          dados?: Json
          forma_pagamento?: string
          id?: string
          loja_id?: string
          mp_payment_id?: string | null
          mp_payment_status?: string | null
          mp_pix_expira_em?: string | null
          mp_pix_qr_base64?: string | null
          mp_pix_qr_code?: string | null
          pedido_id?: string | null
          status?: string
          updated_at?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_pendentes_pagamento_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_pendentes_pagamento_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas_para_entregador"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_pendentes_pagamento_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas_publicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_pendentes_pagamento_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      planos_loja: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          destaque: boolean
          dia_vencimento: number
          id: string
          mensalidade_valor: number
          nome: string
          ordem: number
          taxa_por_pedido: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          destaque?: boolean
          dia_vencimento?: number
          id?: string
          mensalidade_valor?: number
          nome: string
          ordem?: number
          taxa_por_pedido?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          destaque?: boolean
          dia_vencimento?: number
          id?: string
          mensalidade_valor?: number
          nome?: string
          ordem?: number
          taxa_por_pedido?: number
          updated_at?: string
        }
        Relationships: []
      }
      private_config: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      produtos: {
        Row: {
          ativo: boolean
          categoria: string | null
          created_at: string
          descricao: string | null
          estoque: number | null
          estoque_ilimitado: boolean
          id: string
          imagem_url: string | null
          loja_id: string
          nome: string
          ordem: number
          preco: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          estoque?: number | null
          estoque_ilimitado?: boolean
          id?: string
          imagem_url?: string | null
          loja_id: string
          nome: string
          ordem?: number
          preco?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          estoque?: number | null
          estoque_ilimitado?: boolean
          id?: string
          imagem_url?: string | null
          loja_id?: string
          nome?: string
          ordem?: number
          preco?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          aceita_pedidos_externos: boolean
          avatar_url: string | null
          cidade: string | null
          city_id: string | null
          codigo_indicacao: string | null
          cpf: string | null
          created_at: string
          endereco: string | null
          endereco_lat: number | null
          endereco_lng: number | null
          estado: string | null
          full_name: string | null
          id: string
          phone: string | null
          pix_chave: string | null
          tipo_veiculo: Database["public"]["Enums"]["tipo_veiculo"]
          updated_at: string
        }
        Insert: {
          aceita_pedidos_externos?: boolean
          avatar_url?: string | null
          cidade?: string | null
          city_id?: string | null
          codigo_indicacao?: string | null
          cpf?: string | null
          created_at?: string
          endereco?: string | null
          endereco_lat?: number | null
          endereco_lng?: number | null
          estado?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          pix_chave?: string | null
          tipo_veiculo?: Database["public"]["Enums"]["tipo_veiculo"]
          updated_at?: string
        }
        Update: {
          aceita_pedidos_externos?: boolean
          avatar_url?: string | null
          cidade?: string | null
          city_id?: string | null
          codigo_indicacao?: string | null
          cpf?: string | null
          created_at?: string
          endereco?: string | null
          endereco_lat?: number | null
          endereco_lng?: number | null
          estado?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          pix_chave?: string | null
          tipo_veiculo?: Database["public"]["Enums"]["tipo_veiculo"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cidades"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      revendedor_cobrancas: {
        Row: {
          competencia: string
          created_at: string
          id: string
          metodo_pagamento: string | null
          mp_payment_id: string | null
          mp_payment_status: string | null
          mp_pix_expira_em: string | null
          mp_qr_code: string | null
          mp_qr_code_base64: string | null
          mp_ticket_url: string | null
          pago: boolean
          pago_em: string | null
          receita_base: number
          revendedor_id: string
          updated_at: string
          valor_mensalidade: number
          valor_percentual: number
          valor_total: number | null
          vencimento: string
        }
        Insert: {
          competencia: string
          created_at?: string
          id?: string
          metodo_pagamento?: string | null
          mp_payment_id?: string | null
          mp_payment_status?: string | null
          mp_pix_expira_em?: string | null
          mp_qr_code?: string | null
          mp_qr_code_base64?: string | null
          mp_ticket_url?: string | null
          pago?: boolean
          pago_em?: string | null
          receita_base?: number
          revendedor_id: string
          updated_at?: string
          valor_mensalidade?: number
          valor_percentual?: number
          valor_total?: number | null
          vencimento: string
        }
        Update: {
          competencia?: string
          created_at?: string
          id?: string
          metodo_pagamento?: string | null
          mp_payment_id?: string | null
          mp_payment_status?: string | null
          mp_pix_expira_em?: string | null
          mp_qr_code?: string | null
          mp_qr_code_base64?: string | null
          mp_ticket_url?: string | null
          pago?: boolean
          pago_em?: string | null
          receita_base?: number
          revendedor_id?: string
          updated_at?: string
          valor_mensalidade?: number
          valor_percentual?: number
          valor_total?: number | null
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "revendedor_cobrancas_revendedor_id_fkey"
            columns: ["revendedor_id"]
            isOneToOne: false
            referencedRelation: "revendedores"
            referencedColumns: ["user_id"]
          },
        ]
      }
      revendedor_saques: {
        Row: {
          created_at: string
          id: string
          motivo_rejeicao: string | null
          observacoes: string | null
          observacoes_admin: string | null
          pago_em: string | null
          pix_chave: string
          rejeitado_em: string | null
          revendedor_user_id: string
          status: string
          updated_at: string
          valor: number
        }
        Insert: {
          created_at?: string
          id?: string
          motivo_rejeicao?: string | null
          observacoes?: string | null
          observacoes_admin?: string | null
          pago_em?: string | null
          pix_chave: string
          rejeitado_em?: string | null
          revendedor_user_id: string
          status?: string
          updated_at?: string
          valor: number
        }
        Update: {
          created_at?: string
          id?: string
          motivo_rejeicao?: string | null
          observacoes?: string | null
          observacoes_admin?: string | null
          pago_em?: string | null
          pix_chave?: string
          rejeitado_em?: string | null
          revendedor_user_id?: string
          status?: string
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      revendedores: {
        Row: {
          ativo: boolean
          codigo_indicacao: string | null
          created_at: string
          dia_vencimento: number
          documento: string | null
          email: string
          mensalidade_valor: number
          nome: string
          observacoes: string | null
          percentual_receita: number
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          codigo_indicacao?: string | null
          created_at?: string
          dia_vencimento?: number
          documento?: string | null
          email: string
          mensalidade_valor?: number
          nome: string
          observacoes?: string | null
          percentual_receita?: number
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          codigo_indicacao?: string | null
          created_at?: string
          dia_vencimento?: number
          documento?: string | null
          email?: string
          mensalidade_valor?: number
          nome?: string
          observacoes?: string | null
          percentual_receita?: number
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suporte_mensagens: {
        Row: {
          autor_id: string
          autor_tipo: Database["public"]["Enums"]["suporte_autor_tipo"]
          created_at: string
          id: string
          mensagem: string
          ticket_id: string
        }
        Insert: {
          autor_id: string
          autor_tipo: Database["public"]["Enums"]["suporte_autor_tipo"]
          created_at?: string
          id?: string
          mensagem: string
          ticket_id: string
        }
        Update: {
          autor_id?: string
          autor_tipo?: Database["public"]["Enums"]["suporte_autor_tipo"]
          created_at?: string
          id?: string
          mensagem?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suporte_mensagens_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "suporte_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      suporte_tickets: {
        Row: {
          assunto: string
          created_at: string
          criado_por: string
          id: string
          loja_id: string
          nao_lidas_admin: number
          nao_lidas_loja: number
          prioridade: Database["public"]["Enums"]["suporte_ticket_prioridade"]
          status: Database["public"]["Enums"]["suporte_ticket_status"]
          ultima_mensagem_em: string
          updated_at: string
        }
        Insert: {
          assunto: string
          created_at?: string
          criado_por: string
          id?: string
          loja_id: string
          nao_lidas_admin?: number
          nao_lidas_loja?: number
          prioridade?: Database["public"]["Enums"]["suporte_ticket_prioridade"]
          status?: Database["public"]["Enums"]["suporte_ticket_status"]
          ultima_mensagem_em?: string
          updated_at?: string
        }
        Update: {
          assunto?: string
          created_at?: string
          criado_por?: string
          id?: string
          loja_id?: string
          nao_lidas_admin?: number
          nao_lidas_loja?: number
          prioridade?: Database["public"]["Enums"]["suporte_ticket_prioridade"]
          status?: Database["public"]["Enums"]["suporte_ticket_status"]
          ultima_mensagem_em?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suporte_tickets_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suporte_tickets_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas_para_entregador"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suporte_tickets_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas_publicas"
            referencedColumns: ["id"]
          },
        ]
      }
      system_alerts: {
        Row: {
          created_at: string
          id: string
          mensagem: string
          metadata: Json | null
          metric_value: number | null
          resolvido: boolean
          resolvido_em: string | null
          resolvido_por: string | null
          severidade: string
          threshold: number | null
          tipo: string
        }
        Insert: {
          created_at?: string
          id?: string
          mensagem: string
          metadata?: Json | null
          metric_value?: number | null
          resolvido?: boolean
          resolvido_em?: string | null
          resolvido_por?: string | null
          severidade: string
          threshold?: number | null
          tipo: string
        }
        Update: {
          created_at?: string
          id?: string
          mensagem?: string
          metadata?: Json | null
          metric_value?: number | null
          resolvido?: boolean
          resolvido_em?: string | null
          resolvido_por?: string | null
          severidade?: string
          threshold?: number | null
          tipo?: string
        }
        Relationships: []
      }
      system_alerts_config: {
        Row: {
          connections_crit: number
          connections_warn: number
          pedidos_pagamento_pendente_min: number
          query_max_ms_crit: number
          query_mean_ms_crit: number
          query_mean_ms_warn: number
          singleton: boolean
          updated_at: string
        }
        Insert: {
          connections_crit?: number
          connections_warn?: number
          pedidos_pagamento_pendente_min?: number
          query_max_ms_crit?: number
          query_mean_ms_crit?: number
          query_mean_ms_warn?: number
          singleton?: boolean
          updated_at?: string
        }
        Update: {
          connections_crit?: number
          connections_warn?: number
          pedidos_pagamento_pendente_min?: number
          query_max_ms_crit?: number
          query_mean_ms_crit?: number
          query_mean_ms_warn?: number
          singleton?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      tarifas_globais: {
        Row: {
          ativa: boolean
          created_at: string
          faixa_km_max: number
          faixa_km_min: number
          id: string
          tipo_veiculo: Database["public"]["Enums"]["tipo_veiculo"]
          updated_at: string
          valor: number
          valor_minimo: number
          valor_por_km: number
        }
        Insert: {
          ativa?: boolean
          created_at?: string
          faixa_km_max: number
          faixa_km_min?: number
          id?: string
          tipo_veiculo: Database["public"]["Enums"]["tipo_veiculo"]
          updated_at?: string
          valor: number
          valor_minimo?: number
          valor_por_km?: number
        }
        Update: {
          ativa?: boolean
          created_at?: string
          faixa_km_max?: number
          faixa_km_min?: number
          id?: string
          tipo_veiculo?: Database["public"]["Enums"]["tipo_veiculo"]
          updated_at?: string
          valor?: number
          valor_minimo?: number
          valor_por_km?: number
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
      lojas_para_entregador: {
        Row: {
          categoria: Database["public"]["Enums"]["loja_categoria"] | null
          cidade: string | null
          endereco: string | null
          endereco_lat: number | null
          endereco_lng: number | null
          estado: string | null
          horario_funcionamento: Json | null
          id: string | null
          logo_url: string | null
          nome: string | null
          slug: string | null
          status: Database["public"]["Enums"]["status_moderacao"] | null
        }
        Insert: {
          categoria?: Database["public"]["Enums"]["loja_categoria"] | null
          cidade?: string | null
          endereco?: string | null
          endereco_lat?: number | null
          endereco_lng?: number | null
          estado?: string | null
          horario_funcionamento?: Json | null
          id?: string | null
          logo_url?: string | null
          nome?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["status_moderacao"] | null
        }
        Update: {
          categoria?: Database["public"]["Enums"]["loja_categoria"] | null
          cidade?: string | null
          endereco?: string | null
          endereco_lat?: number | null
          endereco_lng?: number | null
          estado?: string | null
          horario_funcionamento?: Json | null
          id?: string | null
          logo_url?: string | null
          nome?: string | null
          slug?: string | null
          status?: Database["public"]["Enums"]["status_moderacao"] | null
        }
        Relationships: []
      }
      lojas_publicas: {
        Row: {
          ativa: boolean | null
          catalogo_ativo: boolean | null
          catalogo_layout: string | null
          catalogo_slug: string | null
          categoria: Database["public"]["Enums"]["loja_categoria"] | null
          cidade: string | null
          endereco: string | null
          endereco_lat: number | null
          endereco_lng: number | null
          estado: string | null
          horario_funcionamento: Json | null
          id: string | null
          logo_url: string | null
          nome: string | null
          plano_mensal_ativo: boolean | null
          slug: string | null
          status: Database["public"]["Enums"]["status_moderacao"] | null
          taxa_entrega_base: number | null
          taxa_por_pedido: number | null
          telefone: string | null
          usar_horario_automatico: boolean | null
        }
        Insert: {
          ativa?: never
          catalogo_ativo?: boolean | null
          catalogo_layout?: string | null
          catalogo_slug?: string | null
          categoria?: Database["public"]["Enums"]["loja_categoria"] | null
          cidade?: string | null
          endereco?: string | null
          endereco_lat?: number | null
          endereco_lng?: number | null
          estado?: string | null
          horario_funcionamento?: Json | null
          id?: string | null
          logo_url?: string | null
          nome?: string | null
          plano_mensal_ativo?: boolean | null
          slug?: string | null
          status?: Database["public"]["Enums"]["status_moderacao"] | null
          taxa_entrega_base?: number | null
          taxa_por_pedido?: number | null
          telefone?: string | null
          usar_horario_automatico?: boolean | null
        }
        Update: {
          ativa?: never
          catalogo_ativo?: boolean | null
          catalogo_layout?: string | null
          catalogo_slug?: string | null
          categoria?: Database["public"]["Enums"]["loja_categoria"] | null
          cidade?: string | null
          endereco?: string | null
          endereco_lat?: number | null
          endereco_lng?: number | null
          estado?: string | null
          horario_funcionamento?: Json | null
          id?: string | null
          logo_url?: string | null
          nome?: string | null
          plano_mensal_ativo?: boolean | null
          slug?: string | null
          status?: Database["public"]["Enums"]["status_moderacao"] | null
          taxa_entrega_base?: number | null
          taxa_por_pedido?: number | null
          telefone?: string | null
          usar_horario_automatico?: boolean | null
        }
        Relationships: []
      }
    }
    Functions: {
      aceitar_convite_loja: { Args: { _token: string }; Returns: Json }
      aceitar_pedido_externo: {
        Args: { _pedido_id: string }
        Returns: {
          arquivado: boolean
          atribuido_automaticamente: boolean
          bonus_entregador: number
          cidade: string | null
          cliente_nome: string
          cliente_telefone: string
          cliente_user_id: string | null
          codigo_coleta: string | null
          codigo_entrega: string | null
          coleta_confirmada_em: string | null
          complemento: string | null
          created_at: string
          distancia_metros: number | null
          duracao_estimada_seg: number | null
          endereco_coleta: string | null
          endereco_coleta_lat: number | null
          endereco_coleta_lng: number | null
          endereco_entrega: string
          endereco_entrega_lat: number | null
          endereco_entrega_lng: number | null
          entrega_confirmada_em: string | null
          entrega_paga: boolean
          entrega_paga_em: string | null
          entregador_id: string | null
          eta_chegada_at: string | null
          forma_pagamento: Database["public"]["Enums"]["forma_pagamento"]
          id: string
          itens: Json
          loja_id: string
          mp_payment_id: string | null
          mp_payment_status: string | null
          mp_pix_expira_em: string | null
          numero: number
          observacoes: string | null
          pagamento_aprovado_em: string | null
          rota_id: string | null
          rota_ordem: number | null
          status: Database["public"]["Enums"]["pedido_status"]
          taxa_entrega: number
          troco_para: number | null
          updated_at: string
          valor_produtos: number
          valor_total: number
        }
        SetofOptions: {
          from: "*"
          to: "pedidos"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      aceitar_turno: {
        Args: { _agendamento_id: string }
        Returns: {
          aceito_em: string | null
          cancelado_em: string | null
          concluido_em: string | null
          created_at: string
          data_turno: string
          duracao_horas: number
          entregador_id: string | null
          hora_inicio: string
          id: string
          loja_id: string
          observacoes: string | null
          publicado_em: string | null
          status: Database["public"]["Enums"]["agendamento_status"]
          taxa_por_entrega: number
          updated_at: string
          vagas_preenchidas: number
          vagas_total: number
          valor_por_hora: number
        }
        SetofOptions: {
          from: "*"
          to: "agendamentos"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_listar_tickets_suporte: {
        Args: never
        Returns: {
          assunto: string
          created_at: string
          id: string
          loja_id: string
          loja_nome: string
          nao_lidas_admin: number
          nao_lidas_loja: number
          prioridade: Database["public"]["Enums"]["suporte_ticket_prioridade"]
          status: Database["public"]["Enums"]["suporte_ticket_status"]
          ultima_mensagem_em: string
        }[]
      }
      admin_ve_cidade: {
        Args: { _cidade: string; _uid: string }
        Returns: boolean
      }
      admin_ve_city_id: {
        Args: { _city_id: string; _uid: string }
        Returns: boolean
      }
      admin_ve_loja: {
        Args: { _loja_id: string; _uid: string }
        Returns: boolean
      }
      admin_ve_profile: {
        Args: { _profile_id: string; _uid: string }
        Returns: boolean
      }
      aplicar_credito_entregador: {
        Args: {
          _competencia?: string
          _created_by?: string
          _delta: number
          _descricao?: string
          _entregador_id: string
          _mp_payment_id?: string
          _tipo: Database["public"]["Enums"]["entregador_credito_tipo"]
        }
        Returns: number
      }
      aplicar_movimento_entregador_saque: {
        Args: {
          _delta: number
          _descricao: string
          _entregador_id: string
          _pedido_id: string
          _saque_id: string
          _tipo: string
        }
        Returns: number
      }
      aplicar_movimento_loja_saldo: {
        Args: {
          _delta: number
          _descricao: string
          _loja_id: string
          _pedido_id: string
          _tipo: string
        }
        Returns: number
      }
      aprovar_reset_senha: { Args: { _request_id: string }; Returns: Json }
      buscar_entregador: {
        Args: { termo: string }
        Returns: {
          full_name: string
          id: string
          phone: string
        }[]
      }
      buscar_indicador_por_codigo: {
        Args: { _codigo: string }
        Returns: {
          full_name: string
          id: string
        }[]
      }
      buscar_revendedor_por_codigo: {
        Args: { _codigo: string }
        Returns: {
          nome: string
          user_id: string
        }[]
      }
      calcular_tarifa_global: { Args: { _km: number }; Returns: number }
      calcular_taxa_publica: {
        Args: { _entrega_lat: number; _entrega_lng: number; _loja_id: string }
        Returns: Json
      }
      cancelar_turno: { Args: { _agendamento_id: string }; Returns: undefined }
      check_system_alerts: { Args: never; Returns: number }
      cidade_do_franqueado: { Args: { _uid: string }; Returns: string }
      cidade_id_do_franqueado: { Args: { _uid: string }; Returns: string }
      cidade_slug: { Args: { _nome: string; _uf: string }; Returns: string }
      cobrar_mensalidades_entregador: { Args: never; Returns: number }
      conceder_admin: {
        Args: { _email: string; _permissoes: Json }
        Returns: string
      }
      concluir_turno: { Args: { _agendamento_id: string }; Returns: undefined }
      confirmar_coleta: {
        Args: { _codigo: string; _pedido_id: string }
        Returns: boolean
      }
      confirmar_entrega: {
        Args: { _codigo: string; _pedido_id: string }
        Returns: boolean
      }
      confirmar_pagamento_pedido_legado: {
        Args: { _mp_payment_id: string; _mp_status: string; _pedido_id: string }
        Returns: {
          id: string
          numero: number
          status: Database["public"]["Enums"]["pedido_status"]
        }[]
      }
      consolidar_mensalidade_loja: {
        Args: { _competencia?: string; _loja_id: string }
        Returns: string
      }
      contrato_ativo: {
        Args: never
        Returns: {
          atualizado_em: string
          conteudo: string
          id: string
          titulo: string
          versao: number
        }[]
      }
      convite_loja_publico: {
        Args: { _token: string }
        Returns: {
          email_destinatario: string
          expira_em: string
          loja_nome: string
          status: Database["public"]["Enums"]["convite_loja_status"]
          tem_revendedor_alvo: boolean
        }[]
      }
      cpf_disponivel: { Args: { _cpf: string }; Returns: boolean }
      desmarcar_turno_entregador: {
        Args: { _agendamento_id: string }
        Returns: undefined
      }
      entregador_pagar_mensalidade_com_saldo: {
        Args: { _valor: number }
        Returns: {
          saldo_creditos: number
          saldo_saque: number
        }[]
      }
      entregador_pode_receber_ofertas: {
        Args: { _entregador_id: string }
        Returns: boolean
      }
      entregador_saldo_atual: {
        Args: never
        Returns: {
          ativo: boolean
          bloqueado: boolean
          competencia_atual: string
          data_vencimento_atual: string
          dia_vencimento: number
          mensalidade_paga: boolean
          mensalidade_valor: number
          saldo: number
          saldo_minimo: number
        }[]
      }
      entregador_saldo_saque_resumo: {
        Args: never
        Returns: {
          dia_semana_permitido: number
          pode_sacar_hoje: boolean
          saldo: number
          tem_saque_pendente: boolean
          total_recebido: number
          total_sacado: number
          valor_minimo: number
        }[]
      }
      entregador_solicitar_saque: {
        Args: { _pix_chave: string; _valor: number }
        Returns: string
      }
      entregadores_online_admin: {
        Args: never
        Returns: {
          entregador_id: string
          full_name: string
          lat: number
          lng: number
          phone: string
          updated_at: string
        }[]
      }
      entregadores_online_loja: {
        Args: { _loja_id: string }
        Returns: {
          entregador_id: string
          full_name: string
          lat: number
          lng: number
          phone: string
          updated_at: string
        }[]
      }
      fechar_ticket_suporte: {
        Args: { _ticket_id: string }
        Returns: undefined
      }
      gerar_cobrancas_revendedores_mensal: { Args: never; Returns: undefined }
      gerar_cobrancas_semanais_lojas: { Args: never; Returns: number }
      gerar_codigo_indicacao: { Args: never; Returns: string }
      gerar_codigo_revendedor: { Args: never; Returns: string }
      gerar_faturas_franquia: { Args: never; Returns: number }
      gerar_mensalidades_do_dia: { Args: never; Returns: number }
      gerar_mensalidades_mes: { Args: never; Returns: number }
      get_config_creditos_admin: {
        Args: never
        Returns: {
          ativo: boolean
          dia_vencimento: number
          mensalidade_valor: number
          mp_access_token_masked: string
          mp_configurado: boolean
          mp_public_key: string
          saldo_minimo: number
          valores_recarga_sugeridos: number[]
        }[]
      }
      get_config_creditos_entregador: {
        Args: never
        Returns: {
          ativo: boolean
          dia_vencimento: number
          mensalidade_valor: number
          mp_configurado: boolean
          saldo_minimo: number
          valores_recarga_sugeridos: number[]
        }[]
      }
      get_entregador_pedido: {
        Args: { _pedido_id: string }
        Returns: {
          avatar_url: string
          entregador_id: string
          full_name: string
          phone: string
          pix_chave: string
        }[]
      }
      get_entregadores_turnos_loja: {
        Args: { _loja_id: string }
        Returns: {
          aceito_em: string
          agendamento_id: string
          avatar_url: string
          entregador_id: string
          full_name: string
        }[]
      }
      get_ganho_hoje: { Args: { _entregador_id: string }; Returns: number }
      get_mp_config_dono: {
        Args: { _loja_id: string }
        Returns: {
          access_token_masked: string
          ativo: boolean
          configurado: boolean
          public_key: string
          webhook_secret_configurado: boolean
          webhook_secret_masked: string
        }[]
      }
      get_mp_public_config: {
        Args: { _loja_id: string }
        Returns: {
          ativo: boolean
          public_key: string
        }[]
      }
      get_pix_sistema: {
        Args: never
        Returns: {
          mensalidade_valor_padrao: number
          pix_chave_sistema: string
          pix_cidade_sistema: string
          pix_titular_sistema: string
          prazo_pagamento_dias: number
        }[]
      }
      get_private_config: { Args: { _key: string }; Returns: string }
      get_taxa_sistema: { Args: never; Returns: number }
      get_taxa_sistema_loja: { Args: { _loja_id: string }; Returns: number }
      has_admin_area: {
        Args: {
          _area: Database["public"]["Enums"]["admin_area"]
          _need_write?: boolean
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      haversine_km: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      is_entregador_aprovado: { Args: { _user_id: string }; Returns: boolean }
      is_franquia_owner: { Args: { _uid: string }; Returns: boolean }
      is_loja_owner: {
        Args: { _loja_id: string; _user_id: string }
        Returns: boolean
      }
      is_revendedor_da_loja: { Args: { _loja_id: string }; Returns: boolean }
      is_valid_cnpj: { Args: { _cnpj: string }; Returns: boolean }
      is_valid_cpf: { Args: { _cpf: string }; Returns: boolean }
      listar_admins: {
        Args: never
        Returns: {
          email: string
          full_name: string
          is_super: boolean
          permissoes: Json
          user_id: string
        }[]
      }
      listar_entregadores_loja: {
        Args: { _loja_id: string }
        Returns: {
          ativo: boolean
          avatar_url: string
          created_at: string
          entregador_id: string
          full_name: string
          phone: string
          vinculo_id: string
        }[]
      }
      listar_meus_turnos_entregador: {
        Args: never
        Returns: {
          aceito_em: string
          data_turno: string
          duracao_horas: number
          hora_inicio: string
          id: string
          loja_endereco: string
          loja_endereco_lat: number
          loja_endereco_lng: number
          loja_id: string
          loja_nome: string
          loja_telefone: string
          observacoes: string
          status: Database["public"]["Enums"]["agendamento_status"]
          taxa_por_entrega: number
          vagas_preenchidas: number
          vagas_total: number
          valor_por_hora: number
        }[]
      }
      listar_turnos_disponiveis_entregador: {
        Args: never
        Returns: {
          agendamento_id: string
          data_turno: string
          duracao_horas: number
          expira_em: string
          hora_inicio: string
          loja_id: string
          loja_nome: string
          observacoes: string
          taxa_por_entrega: number
          vagas_preenchidas: number
          vagas_total: number
          valor_por_hora: number
        }[]
      }
      log_avatar_event: {
        Args: {
          _error_code?: string
          _error_message?: string
          _event: string
          _mime_type?: string
          _size_bytes?: number
          _storage_path?: string
          _user_agent?: string
        }
        Returns: string
      }
      loja_aberta_agora: {
        Args: {
          _ativa: boolean
          _horario: Json
          _now?: string
          _usar_automatico: boolean
        }
        Returns: boolean
      }
      loja_precisa_aceitar_contrato: {
        Args: { _loja_id: string }
        Returns: boolean
      }
      loja_recarregar_saldo_manual: {
        Args: { _descricao: string; _loja_id: string; _valor: number }
        Returns: number
      }
      loja_saldo_saque_resumo: {
        Args: { _loja_id: string }
        Returns: {
          pode_sacar_hoje: boolean
          saldo: number
          tem_saque_pendente: boolean
          ultimo_saque_em: string
          valor_minimo: number
        }[]
      }
      loja_solicitar_saque: {
        Args: { _loja_id: string; _pix_chave: string; _valor: number }
        Returns: string
      }
      loja_tem_catalogo_publico: {
        Args: { _loja_id: string }
        Returns: boolean
      }
      loja_tem_entregador_proprio_online: {
        Args: { _loja_id: string }
        Returns: boolean
      }
      marcar_ticket_lido: { Args: { _ticket_id: string }; Returns: undefined }
      materializar_pedido_pendente: {
        Args: {
          _mp_payment_id: string
          _mp_status: string
          _pendente_id: string
        }
        Returns: string
      }
      minhas_areas_admin: {
        Args: never
        Returns: {
          area: string
          can_write: boolean
          is_super: boolean
        }[]
      }
      pedidos_pool_externo: {
        Args: never
        Returns: {
          arquivado: boolean
          atribuido_automaticamente: boolean
          bonus_entregador: number
          cidade: string
          cliente_nome: string
          cliente_telefone: string
          cliente_user_id: string
          codigo_coleta: string
          codigo_entrega: string
          coleta_confirmada_em: string
          complemento: string
          created_at: string
          distancia_metros: number
          duracao_estimada_seg: number
          endereco_coleta: string
          endereco_coleta_lat: number
          endereco_coleta_lng: number
          endereco_entrega: string
          endereco_entrega_lat: number
          endereco_entrega_lng: number
          entrega_confirmada_em: string
          entrega_paga: boolean
          entrega_paga_em: string
          entregador_id: string
          eta_chegada_at: string
          forma_pagamento: Database["public"]["Enums"]["forma_pagamento"]
          id: string
          itens: Json
          loja_bairro: string
          loja_id: string
          loja_nome: string
          loja_plano_mensal_ativo: boolean
          loja_taxa_por_pedido: number
          numero: number
          observacoes: string
          oferta_expira_em: string
          rota_id: string
          rota_ordem: number
          status: Database["public"]["Enums"]["pedido_status"]
          taxa_entrega: number
          troco_para: number
          updated_at: string
          valor_produtos: number
          valor_total: number
        }[]
      }
      pode_acessar_chat_pedido: {
        Args: { _pedido_id: string; _user_id: string }
        Returns: boolean
      }
      processar_ofertas_externas: { Args: never; Returns: number }
      publicar_turno: { Args: { _agendamento_id: string }; Returns: number }
      rastrear_pedido: {
        Args: { _pedido_id: string }
        Returns: {
          cliente_nome: string
          codigo_entrega: string
          coleta_confirmada_em: string
          complemento: string
          created_at: string
          endereco_entrega: string
          entrega_confirmada_em: string
          id: string
          loja_nome: string
          numero: number
          status: Database["public"]["Enums"]["pedido_status"]
        }[]
      }
      rejeitar_reset_senha: {
        Args: { _motivo?: string; _request_id: string }
        Returns: Json
      }
      resolver_system_alert: { Args: { _alert_id: string }; Returns: undefined }
      revogar_admin: { Args: { _user_id: string }; Returns: undefined }
      salvar_config_creditos: {
        Args: {
          _ativo: boolean
          _dia: number
          _mensalidade: number
          _mp_access_token: string
          _mp_public_key: string
          _saldo_minimo: number
          _valores_sugeridos: number[]
        }
        Returns: undefined
      }
      salvar_mp_config:
        | {
            Args: {
              _access_token: string
              _ativo: boolean
              _loja_id: string
              _public_key: string
            }
            Returns: undefined
          }
        | {
            Args: {
              _access_token: string
              _ativo: boolean
              _loja_id: string
              _public_key: string
              _webhook_secret?: string
            }
            Returns: undefined
          }
      solicitar_reset_senha: { Args: { _email: string }; Returns: Json }
      status_pagamento_pedido: {
        Args: { _pedido_id: string }
        Returns: {
          mp_payment_status: string
          pagamento_aprovado_em: string
          status: Database["public"]["Enums"]["pedido_status"]
        }[]
      }
      super_admin_ajustar_saldo: {
        Args: { _delta: number; _descricao: string; _entregador_id: string }
        Returns: number
      }
      super_admin_listar_creditos: {
        Args: never
        Returns: {
          entregador_id: string
          full_name: string
          phone: string
          saldo: number
          status_conta: string
          ultima_competencia_cobrada: string
        }[]
      }
      super_admin_listar_saldos_lojas: {
        Args: never
        Returns: {
          loja_id: string
          loja_nome: string
          saldo: number
          updated_at: string
        }[]
      }
      super_admin_listar_saques: {
        Args: never
        Returns: {
          entregador_id: string
          entregador_nome: string
          entregador_phone: string
          id: string
          motivo_rejeicao: string
          pago_em: string
          pix_chave: string
          solicitado_em: string
          status: string
          valor: number
        }[]
      }
      super_admin_marcar_saque_pago: {
        Args: { _comprovante_url: string; _saque_id: string }
        Returns: undefined
      }
      super_admin_rejeitar_saque: {
        Args: { _motivo: string; _saque_id: string }
        Returns: undefined
      }
      unificar_lote_coleta: {
        Args: {
          _codigo_coleta?: string
          _pedido_ids: string[]
          _rota_id?: string
        }
        Returns: {
          codigo_coleta: string
          id: string
          rota_id: string
          rota_ordem: number
        }[]
      }
      validar_token_reset: { Args: { _token: string }; Returns: Json }
    }
    Enums: {
      admin_area:
        | "lojas"
        | "entregadores"
        | "financeiro"
        | "creditos"
        | "tarifas"
        | "roteirizacao"
        | "branding"
        | "anuncios"
        | "notificacao_som"
        | "pedidos"
        | "app_apk"
        | "contratos"
      agendamento_oferta_status: "ativo" | "aceito" | "expirado" | "recusado"
      agendamento_status:
        | "rascunho"
        | "publicado"
        | "aceito"
        | "concluido"
        | "cancelado"
      app_role:
        | "super_admin"
        | "loja_admin"
        | "entregador"
        | "cliente"
        | "admin"
        | "revendedor"
      convite_loja_status: "pendente" | "aceito" | "expirado" | "cancelado"
      entregador_credito_tipo:
        | "recarga"
        | "mensalidade"
        | "ajuste_manual"
        | "estorno"
      forma_pagamento:
        | "pix"
        | "dinheiro"
        | "cartao_credito"
        | "cartao_debito"
        | "pix_online"
        | "cartao_online"
        | "cartao"
      loja_categoria:
        | "restaurante"
        | "mercado"
        | "farmacia"
        | "auto_pecas"
        | "moto_pecas"
        | "lanchonete"
        | "sorveteria"
        | "pizzaria"
        | "bebidas"
        | "doceria"
        | "pet_shop"
        | "acougue"
        | "padaria"
        | "hortifruti"
        | "roupas"
        | "calcados"
        | "material_construcao"
        | "eletronicos"
        | "floricultura"
        | "livraria"
        | "conveniencia"
        | "outros"
      pedido_status:
        | "novo"
        | "aceito"
        | "em_preparo"
        | "pronto"
        | "em_rota"
        | "coletado"
        | "entregue"
        | "cancelado"
        | "aguardando_pagamento"
      status_moderacao: "pendente" | "aprovado" | "bloqueado"
      suporte_autor_tipo: "loja" | "admin"
      suporte_ticket_prioridade: "normal" | "alta"
      suporte_ticket_status: "aberto" | "respondido" | "fechado"
      tipo_veiculo: "moto" | "carro" | "caminhonete" | "bike_eletrica"
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
      admin_area: [
        "lojas",
        "entregadores",
        "financeiro",
        "creditos",
        "tarifas",
        "roteirizacao",
        "branding",
        "anuncios",
        "notificacao_som",
        "pedidos",
        "app_apk",
        "contratos",
      ],
      agendamento_oferta_status: ["ativo", "aceito", "expirado", "recusado"],
      agendamento_status: [
        "rascunho",
        "publicado",
        "aceito",
        "concluido",
        "cancelado",
      ],
      app_role: [
        "super_admin",
        "loja_admin",
        "entregador",
        "cliente",
        "admin",
        "revendedor",
      ],
      convite_loja_status: ["pendente", "aceito", "expirado", "cancelado"],
      entregador_credito_tipo: [
        "recarga",
        "mensalidade",
        "ajuste_manual",
        "estorno",
      ],
      forma_pagamento: [
        "pix",
        "dinheiro",
        "cartao_credito",
        "cartao_debito",
        "pix_online",
        "cartao_online",
        "cartao",
      ],
      loja_categoria: [
        "restaurante",
        "mercado",
        "farmacia",
        "auto_pecas",
        "moto_pecas",
        "lanchonete",
        "sorveteria",
        "pizzaria",
        "bebidas",
        "doceria",
        "pet_shop",
        "acougue",
        "padaria",
        "hortifruti",
        "roupas",
        "calcados",
        "material_construcao",
        "eletronicos",
        "floricultura",
        "livraria",
        "conveniencia",
        "outros",
      ],
      pedido_status: [
        "novo",
        "aceito",
        "em_preparo",
        "pronto",
        "em_rota",
        "coletado",
        "entregue",
        "cancelado",
        "aguardando_pagamento",
      ],
      status_moderacao: ["pendente", "aprovado", "bloqueado"],
      suporte_autor_tipo: ["loja", "admin"],
      suporte_ticket_prioridade: ["normal", "alta"],
      suporte_ticket_status: ["aberto", "respondido", "fechado"],
      tipo_veiculo: ["moto", "carro", "caminhonete", "bike_eletrica"],
    },
  },
} as const
