## O que vai mudar

Hoje cada loja só tem um boolean `plano_mensal_ativo` + valor de mensalidade ajustado manualmente pelo super admin. Vou trocar isso por **planos configuráveis** que o super admin gerencia, e a loja escolhe um plano no momento da criação.

## 1. Banco de dados (migration)

Nova tabela `public.planos_loja`:
- `nome` (ex: "Básico", "Pro", "Premium")
- `descricao` (texto curto, opcional)
- `mensalidade_valor` (numeric) — quanto a loja paga por mês
- `taxa_por_pedido` (numeric) — taxa cobrada por pedido entregue (0 = isento, igual ao "plano mensal ativo" de hoje)
- `dia_vencimento` (1–28)
- `destaque` (boolean) — marca o plano "recomendado"
- `ordem` (int) — ordenação na tela
- `ativo` (boolean) — se aparece para novas lojas
- GRANTs: `SELECT` para `anon` e `authenticated` (página de criação precisa listar), full p/ `service_role`. INSERT/UPDATE/DELETE só `super_admin` via RLS.

Em `public.lojas`:
- adicionar coluna `plano_id uuid REFERENCES planos_loja(id)` (nullable, para lojas antigas).

Trigger `lojas_aplicar_plano`: quando `plano_id` é setado/alterado, copia `mensalidade_valor`, `dia_vencimento_mensalidade`, e ajusta `plano_mensal_ativo` conforme `taxa_por_pedido = 0`. Assim o restante do sistema (cobranças, financeiro) continua funcionando sem mudanças.

Atualizar `lojas_update_guard`: permitir que `owner` da loja altere `plano_id` apenas se a loja ainda não tem plano (escolha inicial). Trocas posteriores ficam restritas a `super_admin`.

Seed: criar 1 plano default ("Básico — sem mensalidade, R$ 2 por pedido") para não quebrar o fluxo antes do admin configurar.

## 2. Super Admin — CRUD de planos

Nova rota `/admin/planos` (`src/routes/_authenticated/admin/planos.tsx`) + feature `src/features/admin-planos/`:
- Lista de planos em cards (nome, valores, ativo, destaque, ordem).
- Form lateral para criar/editar/desativar/excluir.
- Botão "Marcar como destaque" (apenas 1 destaque por vez).
- Link no menu do `AdminShell`.

## 3. Loja — seleção do plano na criação

No `CriarLojaForm` adicionar **etapa 2** após preencher os dados:
- Lista os planos ativos (`SELECT * FROM planos_loja WHERE ativo ORDER BY ordem`).
- Cards lado a lado com nome, valor mensal, taxa por pedido, badge "Recomendado" no destaque.
- Loja escolhe um plano antes de finalizar; `useCriarLoja` envia `plano_id` no `INSERT`.
- Se nenhum plano ativo existir ainda, mostra o card sem opção (fallback do plano default seedado).

Loja já criada sem plano: mostrar no Dashboard um aviso "Escolha seu plano" que abre a mesma tela de seleção (uma única vez — depois passa a ser super admin).

## 4. Admin de lojas

Em `LojaCard` substituir o toggle "Plano mensal ativo" + campo de mensalidade por um **select de plano** + resumo dos valores (vindos do plano). Edição da mensalidade individual fica como override opcional só para super admin.

## Detalhes técnicos

- Tabela `planos_loja` é pública para leitura porque a tela de criação roda antes da loja existir e o cadastro é autenticado mas a UI precisa renderizar antes do `INSERT`. Sem dados sensíveis.
- A trigger garante que `lojas.mensalidade_valor` e `plano_mensal_ativo` continuem sendo a "fonte da verdade" usada por triggers existentes (`gerar_cobranca_pedido_entregue`, `gerar_mensalidades_do_dia`, `enforce_plano_para_vincular_entregador`), evitando refatorar todo o financeiro.
- Não mexo em entregadores, pedidos, ou financeiro de cobranças — só na origem dos valores.

## Fora do escopo

- Cobrança automática da mensalidade do primeiro mês (continua via job `gerar_mensalidades_do_dia`).
- Mudar plano com prorata / período de teste — adicionamos depois se quiser.
