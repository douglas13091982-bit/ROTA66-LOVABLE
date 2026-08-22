# Mapa de Reconhecimento do Projeto - ROTA 66

Este documento fornece uma visão completa da arquitetura, dados e interface do sistema ROTA 66.

## 1. Stack Tecnológica e Bibliotecas
*   **Framework:** TanStack Start v1 (React 19, Vite, Nitro para processamento server-side).
*   **Roteamento:** TanStack Router (File-based, com suporte a search params e loaders).
*   **Gerenciamento de Dados:** TanStack Query (React Query) com caching configurado em `src/router.tsx`.
*   **Backend:** Supabase (PostgreSQL, Auth com RLS, Realtime para monitoramento ao vivo).
*   **Estilização:** Tailwind CSS v4.
*   **UI Components:** shadcn/ui (Radix UI).
*   **Mapas e Rotas:** Mapbox GL JS (utilizado em `react-map-gl` e APIs internas de roteamento).
*   **Formulários:** React Hook Form + Zod para validação estrita.
*   **Integrações:** Mercado Pago (Webhooks para pagamentos via PIX e cartão).
*   **Funcionalidades Específicas:** PWA (Service Workers em `src/lib/register-sw.ts`), Geração de WebP, Notificações Push VAPID.

## 2. Páginas e Rotas Existentes
O sistema utiliza rotas baseadas em arquivos em `src/routes/`.
*   **Públicas:**
    *   `/`: Página inicial/Splash.
    *   `/login` / `/cadastro`: Acesso e registro.
    *   `/calcular-frete`: Simulador de entrega para clientes.
    *   `/c.$slug`: Catálogo de loja via slug (ex: rotas66.com.br/c/loja-exemplo).
    *   `/clientes.$cidade`: Marketplace urbano.
    *   `/rastreio.$pedidoId`: Acompanhamento de entregas.
*   **Privadas (Autenticadas em `/_authenticated`):**
    *   **Admin (`/admin`):** Dashboard central, gestão de entregadores, lojas, finanças, configurações de mapas, auditoria de documentos e controle de franqueados.
    *   **Loja (`/loja`):** Operação de pedidos, gestão de produtos, financeiro (faturas/saques), mapa de entregas e suporte.
    *   **Entregador (`/entregador`):** Lista de pedidos disponíveis, entregas ativas, histórico, carteira, turnos e documentos.

## 3. Banco de Dados: Tabelas e Campos Chave
O banco de dados PostgreSQL (Supabase) possui RLS (Row Level Security) e funções de segurança (`has_role`).

*   **`pedidos`**: `id`, `status`, `valor_total`, `valor_frete`, `loja_id`, `entregador_id`, `endereco_entrega`, `lat_entrega`, `lng_entrega`, `codigo_entrega`.
*   **`lojas`**: `id`, `nome`, `slug`, `cidade_id`, `status` (ativo/inativo), `plano_id`, `logo_url`.
*   **`entregadores`**: `id`, `nome`, `status_online` (booleano), `cidade_id`, `veiculo_tipo`, `documentos_aprovados`.
*   **`user_roles`**: `user_id`, `role` (`super_admin`, `admin`, `loja`, `entregador`, `funcionario`).
*   **`transacoes_loja` / `transacoes_entregador`**: `id`, `valor`, `tipo` (crédito/débito), `descricao`.
*   **`agendamentos` (Turnos)**: `id`, `loja_id`, `data_turno`, `hora_inicio`, `valor_por_hora`.
*   **`config_frete`**: `id` (singleton), `mapbox_token`, `distancia_maxima`, `taxa_base`.
*   **`cidades`**: `id`, `nome`, `slug`, `uf`, `ativo`.

## 4. Origem dos Dados (Fluxo)
*   **Dados Estáticos:** Configurações de branding e textos fixos.
*   **Dados de API (Supabase):** Consumidos via `useQuery` no frontend. Os filtros de cidade/permissão são aplicados via RLS e search params da rota.
*   **Dados Geográficos:** Mapbox provê coordenadas via autocompletar e distâncias para cálculo de frete.
*   **Saldos Financeiros:** Calculados via triggers no banco de dados e refletidos em tempo real via Realtime.

## 5. Padrão Visual Adotado
*   **Tema:** Light (Fundo Branco).
*   **Cores Identitárias:** Azul Navy (`#0d2c54`) e Vermelho (`#e3000f` / `#AE0000`).
*   **Estilo UI:** Cards com sombras suaves, bordas levemente arredondadas (ou quadradas em áreas administrativas), ícones Lucide consistentes.
*   **UX Mobile:** App do entregador focado em botões grandes e navegação inferior (Bottom Nav). Painel da loja focado em colunas de status (Kanban para pedidos).

---
**Confirmação:** O reconhecimento foi concluído. Estou pronto para receber as próximas solicitações e atuar conforme o mapeamento acima.
