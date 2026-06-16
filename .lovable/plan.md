
# Pool aberto de pedidos + filtro de ordenação

## Resumo

Mudar o modelo de "oferta direcionada a 1 entregador por vez" para "pool aberto — todos os entregadores elegíveis veem ao mesmo tempo, primeiro a aceitar leva". O escopo (vinculados / todos / vinculados + externos) é configurável pelo Super Admin. No app do entregador, um toggle simples permite ordenar a lista por **Mais próximos** (default) ou **Maior valor**. A roteirização automática continua existindo apenas para **encaixe em rota ativa** do mesmo entregador (mesma loja).

---

## 1. Banco (1 migration)

### `config_roteirizacao`
- Adicionar coluna `pool_aberto_scope text NOT NULL DEFAULT 'vinculados_e_externos'`
- Valores aceitos via CHECK: `'somente_vinculados'`, `'somente_externos'`, `'vinculados_e_externos'`
  - `somente_vinculados`: entregador só vê pedidos das lojas em que está vinculado e ativo
  - `somente_externos`: entregador só vê pedidos que estão liberados como externos (loja sem entregador próprio online)
  - `vinculados_e_externos` (padrão): vê os dois conjuntos somados

### `pedidos_pool_externo()` (substituir)
Reescrever a função para retornar **todo pedido `pronto` sem entregador** elegível ao usuário atual, sem depender de `pedido_ofertas`. Regras dentro da função:
- usuário precisa estar aprovado (`is_entregador_aprovado`)
- aplica o `pool_aberto_scope` lido de `config_roteirizacao`
- inclui pedidos de lojas vinculadas E/OU pedidos de lojas sem entregador próprio online (conforme escopo)
- mantém as colunas hoje retornadas (sem `oferta_expira_em` — passa a vir `NULL`)
- ordena por `created_at ASC`

### `aceitar_pedido_externo(_pedido_id)` (relaxar)
- Remover a exigência de existir oferta ativa em `pedido_ofertas`
- Manter todas as outras validações (aprovado, `entregador_id IS NULL`, `status = 'pronto'`, etc.)
- Manter o recálculo de taxa e o dobro para cartão
- O `UPDATE ... WHERE entregador_id IS NULL AND status = 'pronto'` já é a trava anti-corrida

### `pedido_ofertas`
Não mexer no schema. A roteirização automática continua podendo criar ofertas para encaixe em rota ativa (item 2), mas o pool aberto não depende mais delas.

---

## 2. Server function `atribuirPedido` (`src/lib/rota.functions.ts`)

Simplificar para fazer **somente encaixe em rota ativa**:
- Mantém o bloco "1. Tenta agrupar em rotas ativas da mesma loja"
- Se nenhuma rota cabe: **NÃO escolhe entregador novo**. Retorna `{ ok: false, reason: 'pool_aberto' }`. O pedido fica `pronto` e aparece para todos no pool.
- Remover a chamada a `pickEntregador` no fluxo principal (deixa a função no arquivo apenas se outro lugar usar; senão remover).

---

## 3. Admin — página Roteirização

`src/features/admin-roteirizacao/`:
- `logic/form.ts`: adicionar `pool_aberto_scope` ao tipo, `INITIAL_FORM`, `fromRow`, e ao `payload` retornado por `validateAndBuild`
- `components/RoteirizacaoForm.tsx`: novo campo (radio ou select) com 3 opções e ajuda textual explicando cada uma

---

## 4. App entregador — `usePedidosDisponiveis` e tela

`src/hooks/use-pedidos-disponiveis.ts`:
- A query de `pedidos-pool-externo` deixa de depender do flag `aceita_pedidos_externos` (ou continua, mas a função decide). Simplificar: chamar `pedidos_pool_externo()` para todo entregador aprovado e deixar a SQL filtrar.
- O hook continua mesclando vinculados + pool, mas isso será apenas para o caso `somente_vinculados` antigo (a função do banco já entrega o conjunto certo). Para evitar duplicidade, **passar a usar SOMENTE `pedidos_pool_externo()`** como fonte da lista. A query de "vinculados via tabela `pedidos`" deixa de ser necessária. Manter `lojaIds` apenas para Realtime filtering e para o estado `semVinculoNemExterno`.
- Manter Realtime em `pedidos` para invalidar a query única.

`src/hooks/use-acoes-pedido.ts`:
- Atualmente diferencia "externo" vs "vinculado" via `_externo`. Como a fonte passa a ser única, todo aceite vai pelo caminho `aceitar_pedido_externo` (RPC) — que continua válido para pedidos vinculados também depois das mudanças do item 1.
- Em caso de erro `Pedido já foi aceito por outro entregador` (ou qualquer falha do RPC): toast vermelho "Pedido já foi aceito" + invalidar lista + dismissar localmente o `id` para sumir imediatamente da tela.

### Novo: toggle Ordenação
Criar componente `OrdenacaoToggle` em `src/features/entregador-disponiveis/components/`:
- Dois botões "Mais próximos" / "Maior valor" estilo segmented control
- Estado persistido em `localStorage` chave `entregador:ordenacao-pedidos` (default `proximos`)

Em `RotasDisponiveisList`:
- Adicionar prop `ordenacao`
- Ordenar `grupos` antes do `.map`:
  - **proximos**: distância haversine de `minhaPos` até `endereco_coleta_lat/lng` do primeiro item do grupo; grupos sem coords ou sem `minhaPos` vão para o fim
  - **valor**: soma de `taxaParaExibir(p)` de cada item do grupo, decrescente

Em `DisponiveisPage`:
- Ler ordenação do hook local, renderizar `OrdenacaoToggle` acima da lista

---

## 5. Anti-corrida

Já garantido pelo `UPDATE ... WHERE entregador_id IS NULL` (na RPC). UX: ao receber erro do RPC, mostrar `toast.error("Pedido já foi aceito por outro entregador")` e remover o grupo da lista local via `dismiss(grupo.key)` antes do invalidate.

---

## Resumo de arquivos

**Migration nova**:
- `supabase/migrations/<timestamp>_pool_aberto.sql` — coluna `pool_aberto_scope`, reescrita de `pedidos_pool_externo()` e `aceitar_pedido_externo()`

**Editar**:
- `src/lib/rota.functions.ts` — `atribuirPedido` só faz encaixe em rota ativa
- `src/features/admin-roteirizacao/logic/form.ts` — campo `pool_aberto_scope`
- `src/features/admin-roteirizacao/components/RoteirizacaoForm.tsx` — UI do novo campo
- `src/hooks/use-pedidos-disponiveis.ts` — fonte única via RPC
- `src/hooks/use-acoes-pedido.ts` — caminho único de aceite + tratamento de race
- `src/features/entregador-disponiveis/DisponiveisPage.tsx` — integração do toggle
- `src/features/entregador-disponiveis/components/RotasDisponiveisList.tsx` — ordenação

**Criar**:
- `src/features/entregador-disponiveis/components/OrdenacaoToggle.tsx`
- `src/features/entregador-disponiveis/hooks/use-ordenacao-pedidos.ts` (estado + persistência)

---

## Riscos / pontos de atenção

- A flag `aceita_pedidos_externos` do perfil hoje gatekeeping o pool externo. Decisão: **manter como gate para `somente_externos` e `vinculados_e_externos`**, mas para `somente_vinculados` o gate é apenas a vinculação. Isso preserva a intenção atual (entregador escolhe se quer pegar fora das lojas dele).
- Pedidos novos ainda passam por `atribuirPedido` quando viram `pronto`. Se a função não atribuir, eles ficam disponíveis no pool — comportamento desejado.
- A coluna `oferta_expira_em` continua no retorno do RPC (= `NULL`) para não quebrar tipos do front; o timer/countdown na UI de oferta direcionada deixa de aparecer.
