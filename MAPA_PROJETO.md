## Mapa do Projeto ROTA 66

### 1. Stack e Bibliotecas Principais
*   **Framework:** TanStack Start v1 (React 19 + TanStack Router).
*   **Estilização:** Tailwind CSS v4.
*   **Backend & Auth:** Lovable Cloud (Supabase).
*   **Banco de Dados:** PostgreSQL (Supabase).
*   **Mapas & Geolocalização:** Mapbox (Autocomplete, Roteirização, Rastreio).
*   **Pagamentos:** Mercado Pago (Webhooks e automação de PIX).
*   **Notificações:** Web Push API (VAPID).
*   **Internacionalização:** i18n configurado para `pt-BR` (BRL) e `es-MX` (MXN).

### 2. Rotas e Páginas Principais
*   **Público:**
    *   `/`: Home/Landing page.
    *   `/login` / `/cadastro`: Autenticação.
    *   `/clientes`: Marketplace (Detecção de cidade via GPS).
    *   `/c/$slug`: Catálogo público de lojas.
    *   `/rastreio/$pedidoId`: Rastreio em tempo real para o cliente final.
    *   `/baixar-app`: Redirecionamento para APK/TWA.
*   **Entregador (`/_authenticated/entregador`):**
    *   `/ativos`: Pedidos em entrega.
    *   `/disponiveis`: Pool de pedidos (Marketplace de entregas).
    *   `/carteira`: Saldo, extrato e saques.
    *   `/documentos`: Upload de documentos para aprovação.
    *   `/turnos`: Gestão de turnos/escala.
*   **Loja (`/_authenticated/loja`):**
    *   `/pedidos`: Painel Kanban de pedidos (Gestão em tempo real).
    *   `/produtos`: Gestão de catálogo.
    *   `/financeiro`: Saldo da loja e faturamento.
    *   `/novo-pedido`: Formulário de criação de pedidos manuais/IFood.
*   **Admin/Franqueado (`/_authenticated/admin`):**
    *   `/dashboard`: Métricas globais.
    *   `/entregadores`: Gestão e aprovação de entregadores.
    *   `/lojas`: Gestão de lojas e planos.
    *   `/faturamento-sistema`: Visão financeira da plataforma/franquia.
    *   `/mapa`: Monitoramento de entregadores em tempo real.

### 3. Banco de Dados (Tabelas Principais)
*   **`profiles`**: Dados básicos de usuários (UUID, nome, tipo: admin, loja, entregador).
*   **`lojas`**: Configurações da loja, cidade, plano ativo, iFood tokens.
*   **`pedidos`**: Coração do sistema (status, valores, taxas, coordenadas, entregador vinculado).
*   **`entregador_status`**: Estado atual do entregador (online/offline, coordenadas, bateria).
*   **`lojas_saldo_movimentos` / `entregadores_saldo_saque_movimentos`**: Ledger financeiro detalhado.
*   **`config_frete`**: Configurações de chaves Mapbox e regras globais.
*   **`user_roles`**: Controle de permissões (super_admin, admin, franqueado, cco, loja, entregador).

### 4. Origem dos Dados
*   **Dashboard Loja/Admin**: `createServerFn` e Supabase Realtime para atualizações imediatas.
*   **Marketplace**: `lojas_publicas` (view ou tabela otimizada) filtrada por geolocalização.
*   **Frete**: Calculado via `frete.functions.ts` usando Mapbox Matrix/Directions API.
*   **Financeiro**: Triggers no banco de dados garantem a integridade dos débitos de taxas e créditos de corridas.

### 5. Padrão Visual
*   **Tema:** Light (Claro) por padrão.
*   **Paleta:** Navy Blue (`#0d2c54`) para elementos estruturais e Red (`#AE0000`) para ações e alertas.
*   **Tipografia:** *Bebas Neue* para títulos de marca e fontes sans-serif limpas para interface.
*   **UI:** Componentes baseados em shadcn/ui, otimizados para mobile (PWA).

---
**Confirmação:** O reconhecimento foi concluído. Estou pronto para receber as próximas solicitações.