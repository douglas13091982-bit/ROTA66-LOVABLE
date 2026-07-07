## Objetivo

Transformar a página `/calcular-frete` num ponto de partida real: depois de calcular, o cliente clica em **"Solicitar entregador agora"**, informa nome, telefone e o que vai ser entregue, paga o frete via PIX (Mercado Pago da plataforma) e o pedido cai automaticamente na fila dos entregadores.

## Modelo escolhido

- **Loja avulsa da plataforma** — 1 loja institucional (`"Entregas Avulsas ROTA 66"`) recebe todos esses pedidos, reaproveitando 100% do fluxo atual (oferta, aceite, rastreio, código de entrega, chat, saque do entregador).
- **PIX obrigatório antes** — mesmo motor do checkout de catálogo: cria `pedidos_pendentes_pagamento` → gera PIX MP → webhook confirma → `materializar_pedido_pendente` cria o pedido de verdade em `em_preparo`/`pronto`.
- **Entregadores** veem o pedido pelo pool externo já existente (`pedidos_pool_externo` respeita o escopo configurado no admin — se estiver em `somente_vinculados`, admin precisará mudar para `vinculados_e_externos`).

## O que muda

### 1. Banco (uma migration só)

- Adicionar coluna `lojas.avulsa_plataforma boolean not null default false`.
- Adicionar `private_config.loja_avulsa_id uuid` (ou reaproveitar `config_financeiro`) apontando para a loja avulsa oficial.
- Criar a loja avulsa (owner = admin do sistema, status `aprovado`, `ativa=true`, `catalogo_ativo=false`, endereço genérico da cidade principal, `plano_mensal_ativo=true` para não cobrar taxa por pedido).
- **Não** mexe em RLS de `pedidos` — a loja avulsa se comporta como qualquer outra loja.

### 2. Server function nova: `criarPedidoAvulso` (`src/lib/frete.functions.ts`)

Espelha `criarPedidoCatalogo`, mas sem produtos:
- Input Zod: nome, telefone, descrição do item (obrigatória, 3–200 chars), endereços com lat/lng (obrigatórios), taxa_entrega já calculada no cliente (revalidada no server via `calcularTarifaPorFaixa` + `calcularDistanciaDirigindo` para evitar fraude de valor).
- Cria `pedidos_pendentes_pagamento` com `loja_id = loja_avulsa_id`, `forma_pagamento="pix_online"`, `valor_produtos=0`, `itens=[{ nome: descrição, qtd:1, preco:0 }]`.
- Retorna `{ pendente_id, valor_total }` — o cliente reutiliza `criarPagamentoPix` já existente.

### 3. UI em `/calcular-frete`

Depois que o resultado do frete aparece, mostra botão **"Solicitar entregador — R$ X,XX"**. Ao clicar, abre um modal em 2 passos:

1. **Dados do pedido** (nome, WhatsApp, "o que vai ser entregue?", CPF do pagador para o MP, e-mail).
2. **PIX** — reutiliza `<PixPagamentoDialog>` existente (QR + copia-e-cola + polling via `consultarStatusPagamento`).

Ao confirmar pagamento → toast de sucesso + link do rastreio (`/rastreio/{pedidoId}`) + botão "Copiar link para o WhatsApp".

### 4. Preflight

Se a loja avulsa não estiver configurada, o botão fica desabilitado com aviso "Solicitação de entregador temporariamente indisponível".

## Fora do escopo (não vou mexer agora)

- Regra de comissão específica pra pedido avulso (por ora o valor total do frete vai pro saldo da loja avulsa; admin transfere manualmente).
- Cobrar taxa da plataforma sobre o pedido avulso (fica no plano mensal padrão).
- Cadastro de múltiplas lojas avulsas por cidade.

## Detalhes técnicos

- Arquivos novos: nenhum (adiciona `criarPedidoAvulso` em `src/lib/frete.functions.ts` e um componente `SolicitarEntregadorDialog.tsx` em `src/features/calcular-frete/`).
- Reuso: `PixPagamentoDialog`, `criarPagamentoPix`, `consultarStatusPagamento`, `mp-webhook`, `materializar_pedido_pendente`.
- Migration cria a loja avulsa via `INSERT ... ON CONFLICT DO NOTHING` usando um UUID fixo para idempotência.
- Depois da migration eu confirmo o `loja_avulsa_id` e sigo com o código.

Confirma que posso ir por esse caminho?