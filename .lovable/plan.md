## Objetivo

Quando o entregador aceita um pedido, o sistema calcula um prazo máximo para ele chegar até a coleta com base na distância. Se estourar, o pedido é retirado dele e volta para todos os entregadores.

## Regra do tempo

Fórmula configurável em **Admin → Roteirização**:

```text
prazo_min = tempo_base_min + (distancia_km × min_por_km)
```

Defaults sugeridos (baseado no exemplo "5 km → 8 min"):
- `tempo_base_min = 0`
- `min_por_km = 1.6`
- `prazo_min_absoluto = 4` (piso, para coletas muito próximas)
- `prazo_max_absoluto = 30` (teto de segurança)

A distância usada é a linha reta (haversine) entre a posição do entregador no momento do aceite e o endereço de coleta. Se a posição não estiver disponível, cai para `tempo_base_min + 10 min` (fallback).

## Fluxo

1. Entregador aceita o pedido (`aceitar_pedido` RPC).
2. Trigger calcula `deadline_coleta_at = now() + prazo_min` e grava em `pedidos`.
3. UI do entregador em **Ativos** mostra um cronômetro "Chegar em MM:SS" no card do pedido enquanto o status for aceito/a caminho e antes da coleta (`confirmar_coleta`).
4. Job `expirar_coletas_atrasadas()` roda a cada 1 min via pg_cron:
   - Seleciona pedidos com `deadline_coleta_at < now()`, status ainda pré-coleta (não coletado) e `entregador_id NOT NULL`.
   - Zera `entregador_id`, `rota_id`, `deadline_coleta_at`, `codigo_coleta`.
   - Volta status para `disponivel`.
   - Registra evento e notifica loja + entregador ("prazo estourado, pedido devolvido ao pool").
5. Quando o entregador confirma coleta, `deadline_coleta_at` é limpo (não expira mais).

## UI

**Admin → Roteirização** ganha seção "Prazo de coleta":
- Tempo base (min)
- Minutos por km
- Piso (min) / Teto (min)

**App entregador → Ativos**: badge com cronômetro no card do pedido; fica âmbar nos últimos 3 min, vermelho quando estoura. Ao expirar, o card some com toast "Prazo excedido — pedido devolvido ao pool".

## Detalhes técnicos

- Migration:
  - `config_roteirizacao`: `+ coleta_tempo_base_min int default 0`, `+ coleta_min_por_km numeric default 1.6`, `+ coleta_prazo_min_absoluto int default 4`, `+ coleta_prazo_max_absoluto int default 30`.
  - `pedidos`: `+ deadline_coleta_at timestamptz`.
  - Função `calcular_prazo_coleta_min(dist_km numeric) returns int`.
  - Atualizar RPC `aceitar_pedido` (ou trigger `after update` em `pedidos` quando `entregador_id` passa a NOT NULL e status=`aceito`) para setar `deadline_coleta_at` usando distância entre `entregador_status.lat/lng` e `pedidos.endereco_coleta_lat/lng`.
  - Função `expirar_coletas_atrasadas()` + cron a cada minuto (`pg_cron`).
  - Limpar `deadline_coleta_at` no `confirmar_coleta`.
- Realtime: já existe subscription em `pedidos`; ao devolver ao pool, o card do entregador atual some e reaparece para todos.
- Hook novo `use-coleta-countdown.ts` para o timer no frontend.
- Sem alterar taxas nem lógica de pagamento.

## Fora de escopo

- Não muda tempo de entrega (só coleta).
- Não penaliza o entregador (score/multa) — só devolve o pedido.
