## Objetivo

Criar um canal de **Suporte** no painel da Loja para que ela abra chamados (tickets) e converse diretamente com o administrador. O administrador terá uma aba equivalente para visualizar todos os chamados de todas as lojas e responder.

## Como o usuário vai usar

**Loja**
- Novo item de menu lateral "Suporte" (após Financeiro).
- Página com lista de chamados (assunto, status, última atualização, indicador de mensagens novas).
- Botão "Abrir novo chamado" → modal com assunto + mensagem inicial.
- Ao abrir um chamado, vê um chat estilo conversa (mensagens da loja à direita, do admin à esquerda) com input para nova mensagem.
- Pode marcar o chamado como "resolvido" para fechar.

**Admin**
- Novo item de menu lateral "Suporte".
- Lista de **todos** os chamados de todas as lojas, com filtro por status (Abertos / Respondidos / Fechados) e busca por loja/assunto.
- Indicação de "novo" quando há mensagem da loja não lida pelo admin.
- Mesmo chat ao abrir um chamado, podendo responder e reabrir/fechar.

**Tempo real**
- A lista de chamados e o chat atualizam sozinhos (sem precisar dar refresh) usando Realtime — assim que a loja manda, o admin recebe na hora e vice-versa.

## Mudanças técnicas

### Banco (1 migration)
- Tabela `suporte_tickets`:
  - `loja_id` (FK lojas), `assunto`, `status` (`aberto` | `respondido` | `fechado`), `prioridade` (`normal` | `alta`), `criado_por` (uuid), `ultima_mensagem_em`, `nao_lidas_loja` (int), `nao_lidas_admin` (int).
- Tabela `suporte_mensagens`:
  - `ticket_id` (FK), `autor_id` (uuid), `autor_tipo` (`loja` | `admin`), `mensagem`.
- Trigger ao inserir mensagem: atualiza `ultima_mensagem_em`, status e incrementa o contador de não-lidas do lado oposto.
- RLS:
  - Loja: SELECT/INSERT/UPDATE apenas em tickets/mensagens da própria loja (via `loja_id` no perfil).
  - Admin (`admin` ou `super_admin` via `has_role`): acesso total.
- GRANTs para `authenticated` e `service_role`.
- `REPLICA IDENTITY FULL` e `ALTER PUBLICATION supabase_realtime ADD TABLE` para ambas.
- RPC `marcar_ticket_lido(ticket_id)` que zera o contador do lado do chamador (loja ou admin).

### Frontend
- `src/features/suporte/` compartilhado entre loja e admin:
  - `hooks/use-suporte.ts` (queries de tickets/mensagens + subscriptions Realtime + mutations).
  - `components/TicketsList.tsx`, `TicketChat.tsx`, `NovoTicketDialog.tsx`.
- `src/features/loja-suporte/SuportePage.tsx` e `src/features/admin-suporte/SuportePage.tsx` que reutilizam os componentes com o "modo" (loja/admin).
- Rotas: `src/routes/_authenticated/loja/suporte.tsx` e `src/routes/_authenticated/admin/suporte.tsx`.
- Menu:
  - `LojaShell.tsx`: adicionar item "Suporte" (ícone `LifeBuoy`) com badge quando `nao_lidas_loja > 0` em algum ticket.
  - `AdminShell.tsx`: adicionar item "Suporte" com a mesma lógica para `nao_lidas_admin`.
- Hook `useSuporteBadgeGlobal()` para alimentar o contador no menu (similar ao `useChatNaoLidasGlobal` já existente).

## Fora do escopo
- Anexos/imagens nas mensagens (pode ser adicionado depois).
- E-mail/notificação push quando há nova mensagem (apenas badge no painel por enquanto).
- Atribuição do chamado a um admin específico (todos os admins veem todos).
