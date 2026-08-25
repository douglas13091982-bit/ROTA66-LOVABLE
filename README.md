# ROTA 66 V.2

Crie um sistema SaaS completo chamado **ROTA 66 Entregas e Coletas**, com design inspirado

no estilo americano Route 66 — cores predominantes: vermelho (#CC2229), azul-marinho

(#1B2A4A) e branco. Logo com escudo Route 66 com asas. Tipografia bold e impactante.

Interface dark com acentos vermelhos.

---

## VISÃO GERAL DO SISTEMA

Plataforma multi-tenant de gestão de entregas e coletas com:

- Portal do cliente (loja/restaurante/mercado)

- Catálogo de produtos com pagamento

- App PWA para entregadores

- Painel Super Admin

- Tudo em tempo real via WebSocket

---

## MÓDULOS DO SISTEMA

### 1. SUPER ADMIN PANEL

- Dashboard com métricas globais: lojas ativas, entregadores, pedidos/dia, faturamento

- CRUD completo de lojas (aceitar, suspender, excluir)

- CRUD de entregadores (aprovar cadastro, suspender, excluir)

- Configuração global de tarifas por tipo de veículo:

  - Moto, Carro, Caminhonete

  - Tarifa base + por km + por pedido adicional agregado

- Gestão de taxas da plataforma (% por pedido)

- Editor de configurações globais (logo, nome, cores por loja)

- Visualização de todas as entregas em tempo real

- Logs e auditoria

### 2. PAINEL DA LOJA (multi-tenant)

Cada loja tem seu próprio painel com:

**Configurações da Loja:**

- Cadastro: nome, logo, endereço, horários, tipo (restaurante/mercado/loja)

- Integração de pagamento: Pix (chave manual) e/ou gateway (Mercado Pago/PagSeguro via API)

- Modo de operação:

  - COMPLETO: catálogo + pedidos + entregas

  - SÓ ENTREGAS: sem catálogo, apenas gestão de coletas/entregas internas

**Catálogo de Produtos (opcional/desativável):**

- Categorias e produtos com foto, nome, descrição, preço

- Estoque básico (ativo/inativo)

- Página pública de cardápio com link compartilhável

**Gestão de Pedidos:**

- Fila de pedidos recebidos (novo, aceito, em preparo, pronto, coletado, entregue)

- Ao marcar como pronto: escolher tipo de entrega

  - Entregador fixo da loja (interno)

  - Entregador da plataforma (externo)

- Visualização em tempo real da posição do entregador

**Entregadores Fixos:**

- Cadastro de motoboys/entregadores vinculados exclusivamente à loja

- Controle de status (disponível/ocupado/offline)

**Agregação de Pedidos por Rota:**

- Sistema sugere automaticamente agrupar pedidos próximos geograficamente

- Cada pedido é pago separadamente ao entregador

- Entregador recebe uma rota otimizada com múltiplas paradas

- Redirecionamento externo para rota (link Waze/Google Maps com waypoints — SEM API key)

**Financeiro da Loja:**

- Extrato de pedidos, valores pagos a entregadores, taxa da plataforma

### 3. PORTAL DO CLIENTE FINAL

- Acesso via link da loja ou app geral

- Cadastro simples (nome, telefone, endereço)

- Visualização do catálogo da loja

- Carrinho e checkout com:

  - Pagamento via Pix (QR Code gerado) ou cartão via gateway

  - Seleção de endereço de entrega

- Acompanhamento do pedido em tempo real (status + mapa simples sem API key)

- Histórico de pedidos

### 4. APP PWA — ENTREGADOR

Progressive Web App instalável no celular:

**Cadastro:**

- Nome, CPF, foto, CNH, foto do veículo

- Tipo de veículo: Moto / Carro / Caminhonete

- Placa, modelo

- Chave Pix para recebimento

- Status: pendente aprovação / ativo / suspenso

**Funcionamento:**

- Login e status online/offline

- Recebimento de notificação de nova entrega (push notification)

- Tela de aceite com: valor a receber, distância, coleta e entrega

- Se for rota agregada: ver todas as paradas com valores individuais

- Botão "Ver Rota" → abre Waze ou Google Maps com endereços (redirecionamento externo, sem API key)

- Fluxo de status: Indo à coleta → Coletei → Em rota → Entregue

- Histórico de corridas e ganhos

---

## REGRAS DE NEGÓCIO IMPORTANTES

1. **Agregação de pedidos**: o sistema detecta pedidos com destinos próximos (raio configurável

   em km) e sugere ao entregador como rota única. Cada pedido tem seu próprio valor de frete.

2. **Sem API do Maps**: toda visualização de mapa usa iframe do OpenStreetMap (gratuito) ou

   estático. Rotas são abertas via link externo:

   `https://waze.com/ul?ll=LAT,LNG&navigate=yes` ou

   `https://www.google.com/maps/dir/?api=1&destination=ENDERECO&waypoints=END1|END2`

3. **Multi-tenant real**: cada loja tem subdomínio ou slug único. Ex: `rota66.app/loja/burguer-top`

4. **Tempo real**: usar WebSocket (Socket.io ou Supabase Realtime) para status de pedidos e

   posição do entregador (entregador envia GPS via PWA a cada 10s quando em entrega ativa)

5. **Modo sem catálogo**: loja pode desativar catálogo e usar o sistema apenas para despachar

   entregas/coletas manualmente (inserindo origem, destino, valor e descrição do item)

---

## STACK SUGERIDA

- **Frontend**: Next.js 14 (App Router) + Tailwind CSS + shadcn/ui

- **Backend**: Node.js + Express ou Next.js API Routes

- **Banco**: PostgreSQL (via Supabase ou Railway) + Prisma ORM

- **Realtime**: Supabase Realtime ou Socket.io

- **Auth**: NextAuth.js com roles (superadmin, loja_admin, entregador, cliente)

- **PWA**: next-pwa para o app do entregador

- **Pagamentos**: Mercado Pago SDK + Pix via API do banco ou geração de QR Code estático

- **Maps**: OpenStreetMap iframe + links externos Waze/Google Maps

---

## DESIGN SYSTEM — ROTA 66

```css

:root {

  --rota-red: #CC2229;

  --rota-navy: #1B2A4A;

  --rota-white: #F5F5F5;

  --rota-dark: #0D1117;

  --rota-gold: #F5A623;

  --font-display: 'Bebas Neue', sans-serif;

  --font-body: 'Barlow', sans-serif;

}

```

- Fundo escuro (#0D1117) com cards em (#1B2A4A)

- Botões primários: vermelho (#CC2229) com hover mais escuro

- Status badges: verde (entregue), amarelo (em rota), vermelho (pendente)

- Logo sempre presente no header com escudo Route 66 + asas

- Ícones de veículo: 🏍️ moto, 🚗 carro, 🛻 caminhonete

---

## PÁGINAS MÍNIMAS A CRIAR

Super Admin: /admin/dashboard, /admin/lojas, /admin/entregadores, /admin/tarifas,

/admin/pedidos, /admin/financeiro

Loja: /loja/dashboard, /loja/pedidos, /loja/catalogo, /loja/entregadores,

/loja/configuracoes, /loja/financeiro

Cliente: /[slug]/cardapio, /[slug]/carrinho, /[slug]/acompanhar/[pedidoId]

Entregador (PWA): /entregador/login, /entregador/dashboard, /entregador/entrega/[id],

/entregador/historico, /entregador/perfil

Auth: /login, /cadastro (loja), /cadastro/entregador

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://rotas66.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/94fe485e-cde1-4611-9db7-d8635e0448a7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
