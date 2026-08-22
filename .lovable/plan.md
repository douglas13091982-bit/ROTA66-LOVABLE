# Mapa de Reconhecimento do Projeto - ROTA 66

O ROTA 66 é uma plataforma robusta de delivery e logística integrada, composta por três ecossistemas principais: **Administrativo**, **Lojista** e **Entregador**, com um **Marketplace Público** voltado ao consumidor final.

## 1. Stack Tecnológica
*   **Framework:** TanStack Start v1 (React 19, Vite, Nitro).
*   **Roteamento:** TanStack Router (File-based routing com loaders e search params).
*   **Estado e Dados:** TanStack Query (React Query) para sincronização de estado do servidor.
*   **Backend:** Supabase (Auth, PostgreSQL com RLS, Realtime para saldos e mapas).
*   **Estilização:** Tailwind CSS v4.
*   **Componentes UI:** shadcn/ui (Radix UI).
*   **Geolocalização:** Mapbox GL JS (API integrada para rotas e autocompletar).
*   **Pagamentos:** Mercado Pago (integração via webhooks e server functions).
*   **Mobile/PWA:** Service Workers personalizados e manifest para suporte a APK/TWA.

## 2. Páginas e Rotas Principais
### Área Pública
*   `/`: Splash e entrada do sistema.
*   `/login` & `/cadastro`: Fluxo de autenticação e onboarding de novos parceiros.
*   `/clientes.$cidade`: Marketplace filtrado por cidade.
*   `/c.$slug`: Catálogo público direto de uma loja.
*   `/rastreio.$pedidoId`: Acompanhamento em tempo real para o cliente final.
*   `/calcular-frete`: Simulador público de taxas de entrega.

### Área Autenticada (`/_authenticated`)
*   **Admin (`/admin`):** Gestão global de pedidos, lojas, entregadores, franqueados, taxas, notificações push, configurações de marca e APKs.
*   **Loja (`/loja`):** Painel de controle, criação de pedidos manuais, gestão de catálogo (produtos e categorias), controle financeiro e funcionários.
*   **Entregador (`/entregador`):** Pool de entregas disponíveis, histórico de ganhos, gestão de documentos, carteira e turnos de trabalho.

## 3. Banco de Dados e Tabelas (Supabase)
### Tabelas Centrais
*   `pedidos`: Registro de entregas, coordenadas, status e valores.
*   `lojas`: Configurações de planos, cidade, taxas e branding das lojas.
*   `entregadores`: Dados do veículo, status (online/offline) e avaliação.
*   `user_roles`: Controle de acesso granular (`super_admin`, `admin`, `loja`, `entregador`, `funcionario`).
*   `transacoes_loja` / `transacoes_entregador`: Histórico de crédito, débito e saques.
*   `config_frete`: Configurações globais de API (Mapbox) e regras de cálculo.
*   `documentos_entregador`: Arquivos de verificação de identidade e veículo.
*   `cidades`: Delimitação geográfica das operações.

## 4. Fluxo de Dados
*   **Consumo:** TanStack Query utiliza o cliente Supabase gerado em `@/integrations/supabase/client`. As rotas utilizam `loaders` para pré-carregar dados essenciais via `ensureQueryData`.
*   **Lógica de Servidor:** Funções sensíveis (frete, rotas, pagamentos) residem em `src/lib/*.functions.ts` e `src/lib/*.server.ts` usando `createServerFn`.
*   **Tempo Real:** Supabase Realtime monitora alterações em saldos e posições de entregadores no mapa.
*   **Webhooks:** Rotas sob `/api/public/` recebem notificações externas (Mercado Pago) para processar pagamentos sem autenticação de usuário.

## 5. Padrão Visual e Design
*   **Paleta de Cores:** Fundo branco (Tema Claro), Navy Blue (`#0d2c54`) para elementos estruturais e Vermelho vibrante (`#cc2229` / `#e3000f`) para ações primárias e alertas.
*   **Tipografia:** Mix premium com `Barlow`, `Bebas Neue` (headings), `Sora` e `Manrope`.
*   **Componentes:** Uso de bordas quadradas ou levemente arredondadas, sombras destacadas para cards e layouts mobile-first (especialmente para o app do entregador).

---
Estou pronto para as próximas solicitações. O projeto está mapeado e compreendido.
