
## Objetivo

Todos os pedidos feitos pelo catálogo público (PIX/Cartão online) passam a ser cobrados **na conta Mercado Pago da plataforma** (a mesma já usada para mensalidades). O valor de cada pedido pago entra como **saldo na carteira da loja**. A loja pode solicitar **1 saque por semana** ao admin, que aprova/paga manualmente (mesmo fluxo já existente para saques de entregador/revendedor).

## Mudanças

### 1. Checkout do catálogo usa a conta da plataforma
- `PagamentoMercadoPago.tsx` e `mercadopago.functions.ts` (`criarPagamentoPedido`) hoje buscam `lojas_pagamento_mp` da loja. Vou trocar para usar `getPlataformaMp()` (de `plataforma-mp.server.ts`).
- Public key exposta ao Brick de cartão passa a ser `mp_platform_public_key`.
- `notification_url` aponta para o webhook único `/api/public/mp-webhook` (que roteia para o dispatcher da plataforma quando o `external_reference` for de pedido).
- Remover UI de configuração de MP por loja em `MercadoPagoConfig.tsx` (some do painel da loja), mantendo a tabela `lojas_pagamento_mp` intacta por compat.

### 2. Crédito automático na carteira ao pagar
- No dispatcher do webhook da plataforma (`mp-webhook-dispatcher.server.ts`), quando o pagamento aprovado for de um pedido do catálogo (external_reference `pedido:<id>`), chamar uma nova função SQL `creditar_carteira_loja_por_pedido(_pedido_id, _mp_payment_id)`:
  - marca `pedidos.mp_payment_status='approved'` (idempotente)
  - insere movimento `credito_venda` em `lojas_saldo_movimentos`
  - atualiza `lojas_saldo.saldo`
  - valor creditado = `valor_produtos` (taxa_entrega continua indo para entregador/plataforma como já é hoje)

### 3. Saques da loja (1 por semana)
Novas tabelas + RPCs espelhando o modelo de `entregador_saques` / `revendedor_saques`:

```text
lojas_saques
├─ id, loja_id, valor, pix_chave
├─ status (solicitado|pago|rejeitado)
├─ solicitado_em, pago_em, rejeitado_em
├─ motivo_rejeicao, observacoes_admin
```

RPCs:
- `loja_saldo_saque_resumo()` → saldo, pode_sacar_hoje (1x/semana), tem_saque_pendente
- `loja_solicitar_saque(_valor, _pix_chave)` → valida saldo, valida janela semanal, debita saldo (movimento `saque_solicitado`), cria saque

RLS: dono da loja lê/insere os próprios; admin lê/atualiza tudo.

### 4. Telas
- **Loja › Financeiro › aba Carteira**: saldo atual, botão "Solicitar saque", histórico de saques e movimentos. Reutiliza componentes do padrão `entregador-carteira`.
- **Admin › Saques das lojas** (nova rota `/admin/saques-lojas`, item de menu ao lado de "Saques dos entregadores/revendedores"): mesma UI de `AdminSaquesRevendedoresPage` adaptada.

### 5. Migração de dados
- Não migra pagamentos antigos.
- Configurações MP por loja permanecem no banco mas ficam sem uso (podem ser removidas depois).

## Detalhes técnicos

- Todas as alterações de schema (tabelas, funções, RLS, GRANTs) em uma migração única.
- Webhook: dispatcher precisa reconhecer `external_reference` iniciado por `pedido:` e chamar o novo RPC via `supabaseAdmin`.
- Idempotência garantida por `mp_payment_id` único no movimento (`descricao` contém o id; adicionar índice único parcial em `lojas_saldo_movimentos(pedido_id) where tipo='credito_venda'`).
- Janela de "1 saque por semana": bloqueia se existir saque `solicitado` OU se algum saque foi criado nos últimos 7 dias com status ≠ `rejeitado`.
- Nada muda em pagamento de entrega ao entregador nem em mensalidades.

## Fora de escopo

- Split automático de pagamento (MP Marketplace) — usaríamos conta única + carteira interna, conforme pedido.
- Saque automático via PIX API — continua manual pelo admin.
