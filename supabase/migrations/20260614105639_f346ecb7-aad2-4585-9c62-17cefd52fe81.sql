CREATE OR REPLACE VIEW public.lojas_publicas AS
SELECT id,
    nome,
    slug,
    telefone,
    endereco,
    endereco_lat,
    endereco_lng,
    cidade,
    estado,
    logo_url,
    taxa_entrega_base,
    horario_funcionamento,
    catalogo_ativo,
    catalogo_slug,
    catalogo_layout,
    ativa,
    status,
    plano_mensal_ativo,
    categoria
   FROM lojas
  WHERE ativa = true AND status = 'aprovado'::status_moderacao;