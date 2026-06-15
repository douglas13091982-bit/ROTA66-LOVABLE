
-- pedidos: códigos, ofertas, push, guard, cobrança, updated_at
DROP TRIGGER IF EXISTS trg_gerar_codigos_pedido ON public.pedidos;
CREATE TRIGGER trg_gerar_codigos_pedido
  BEFORE INSERT ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.gerar_codigos_pedido();

DROP TRIGGER IF EXISTS trg_processar_ofertas ON public.pedidos;
CREATE TRIGGER trg_processar_ofertas
  AFTER INSERT OR UPDATE ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.trigger_processar_ofertas();

DROP TRIGGER IF EXISTS trg_notificar_entregador_pedido ON public.pedidos;
CREATE TRIGGER trg_notificar_entregador_pedido
  AFTER UPDATE ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.notificar_entregador_pedido();

DROP TRIGGER IF EXISTS trg_pedidos_entregador_update_guard ON public.pedidos;
CREATE TRIGGER trg_pedidos_entregador_update_guard
  BEFORE UPDATE ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.pedidos_entregador_update_guard();

DROP TRIGGER IF EXISTS trg_gerar_cobranca_pedido_entregue ON public.pedidos;
CREATE TRIGGER trg_gerar_cobranca_pedido_entregue
  AFTER UPDATE ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.gerar_cobranca_pedido_entregue();

DROP TRIGGER IF EXISTS trg_pedidos_updated_at ON public.pedidos;
CREATE TRIGGER trg_pedidos_updated_at
  BEFORE UPDATE ON public.pedidos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- auth.users: criar profile + role no signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- lojas_enderecos_coleta: único padrão por loja
DROP TRIGGER IF EXISTS trg_lojas_enderecos_coleta_unique_padrao ON public.lojas_enderecos_coleta;
CREATE TRIGGER trg_lojas_enderecos_coleta_unique_padrao
  BEFORE INSERT OR UPDATE ON public.lojas_enderecos_coleta
  FOR EACH ROW EXECUTE FUNCTION public.lojas_enderecos_coleta_unique_padrao();

-- updated_at em tabelas com a coluna
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_lojas_updated_at ON public.lojas;
CREATE TRIGGER trg_lojas_updated_at BEFORE UPDATE ON public.lojas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_clientes_loja_updated_at ON public.clientes_loja;
CREATE TRIGGER trg_clientes_loja_updated_at BEFORE UPDATE ON public.clientes_loja
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_lojas_enderecos_coleta_updated_at ON public.lojas_enderecos_coleta;
CREATE TRIGGER trg_lojas_enderecos_coleta_updated_at BEFORE UPDATE ON public.lojas_enderecos_coleta
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_tarifas_loja_updated_at ON public.tarifas_loja;
CREATE TRIGGER trg_tarifas_loja_updated_at BEFORE UPDATE ON public.tarifas_loja
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_tarifas_globais_updated_at ON public.tarifas_globais;
CREATE TRIGGER trg_tarifas_globais_updated_at BEFORE UPDATE ON public.tarifas_globais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_cobrancas_loja_updated_at ON public.cobrancas_loja;
CREATE TRIGGER trg_cobrancas_loja_updated_at BEFORE UPDATE ON public.cobrancas_loja
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_mensalidades_loja_updated_at ON public.mensalidades_loja;
CREATE TRIGGER trg_mensalidades_loja_updated_at BEFORE UPDATE ON public.mensalidades_loja
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_entregador_status_updated_at ON public.entregador_status;
CREATE TRIGGER trg_entregador_status_updated_at BEFORE UPDATE ON public.entregador_status
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_entregador_status_conta_updated_at ON public.entregador_status_conta;
CREATE TRIGGER trg_entregador_status_conta_updated_at BEFORE UPDATE ON public.entregador_status_conta
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_config_branding_updated_at ON public.config_branding;
CREATE TRIGGER trg_config_branding_updated_at BEFORE UPDATE ON public.config_branding
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_config_financeiro_updated_at ON public.config_financeiro;
CREATE TRIGGER trg_config_financeiro_updated_at BEFORE UPDATE ON public.config_financeiro
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_config_roteirizacao_updated_at ON public.config_roteirizacao;
CREATE TRIGGER trg_config_roteirizacao_updated_at BEFORE UPDATE ON public.config_roteirizacao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_config_notificacao_som_updated_at ON public.config_notificacao_som;
CREATE TRIGGER trg_config_notificacao_som_updated_at BEFORE UPDATE ON public.config_notificacao_som
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_config_notif_som();

DROP TRIGGER IF EXISTS trg_anuncios_entregador_updated_at ON public.anuncios_entregador;
CREATE TRIGGER trg_anuncios_entregador_updated_at BEFORE UPDATE ON public.anuncios_entregador
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_push_subscriptions_updated_at ON public.push_subscriptions;
CREATE TRIGGER trg_push_subscriptions_updated_at BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Realtime para pedido_ofertas
ALTER TABLE public.pedido_ofertas REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'pedido_ofertas'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.pedido_ofertas';
  END IF;
END $$;
