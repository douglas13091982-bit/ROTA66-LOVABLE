## Objetivo

Validar — no preview real, com a sessão atual do entregador — que ao clicar **OFF** os pedidos disponíveis somem na hora e **não** reaparecem após uma reconexão de rede, mesmo que o toggle no header mostre o estado certo.

## O que vou verificar

1. **Estado inicial (ON)** — abrir `/entregador/disponiveis`, conferir que o toggle está ON, `estouOnline=true`, e os cards de rota (ex.: pedido #81) aparecem.
2. **Clicar OFF** — pressionar o toggle e observar:
   - Toggle do header vira "Offline" imediatamente.
   - A lista é substituída pelo banner "VOCÊ ESTÁ OFFLINE" (sem flash de cards).
   - No console: nenhum erro do upsert em `entregador_status`.
   - No banco: `entregador_status.online` do meu user_id = `false`.
3. **Simular reconexão** — com o app offline, simular network flap usando DevTools (Network → Offline → Online) ou apenas esperar 30s e voltar o foco da aba para disparar `visibilitychange`/`focus` listeners do hook. Conferir que:
   - `estouOnline` permanece `false`.
   - A query `pedidos-pool-externo` continua desabilitada (não dispara nenhum request).
   - O toggle continua "Offline".
   - Nenhum heartbeat de sessão antiga ressuscita `online=true` (checar `entregador_status.online` no banco continua `false`).
4. **Voltar ON manualmente** — confirmar que ao clicar ON de novo, é uma nova sessão limpa, cards voltam.

## Pontos de risco já identificados no código

- `EntregadorStatusIndicator` usa `isEffectivelyOnline(online, updated_at, ttlMin)` (TTL), enquanto `usePedidosDisponiveis` usa `!!meuStatus?.online` (raw). Se o banco tiver `online=true` com `updated_at` antigo, o indicador pode mostrar "Offline" mas a lista de pedidos continuar visível. Vou conferir se esse descasamento aparece no teste.
- O realtime de `entregador_status` precisa estar na publication `supabase_realtime`. Se não estiver, o flip depende só do `qc.setQueryData` feito pelo toggle e do refetch de 15s. Vou checar via `supabase--read_query` se a tabela está publicada.
- O `sessionRef` do hook só protege heartbeats em voo do **mesmo mount**. Se a aba é recarregada após a reconexão, um `getCurrentPosition` antigo não escreve mais, mas vou confirmar lendo `entregador_status` antes/depois.

## Saída esperada

Relatório curto com:
- Screenshot do estado ON → OFF → após reconexão.
- Valor de `entregador_status.online` lido do banco em cada etapa.
- Lista de qualquer divergência (ex.: cards reaparecendo, toggle dessincronizado, heartbeat indevido).
- Se algo falhar, descrição da causa raiz e o ajuste proposto (sem implementar — só plano da correção).

## Não está no escopo

- Mudar lógica de online/offline agora — só verificar.
- Mexer no badge "RETORNAR" do card (você pediu para focar no offline).
