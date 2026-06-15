# Refatoração SOLID / Clean Code

Análise mostra alta concentração de complexidade em poucos arquivos. Vou atacar primeiro o que dá maior retorno em legibilidade/manutenção, sem alterar comportamento. Funcionalidade idêntica, apenas reorganização e extração.

## Hotspots identificados

| Arquivo | Linhas | Problema principal |
|---|---|---|
| `_authenticated/loja/pedidos.tsx` | 907 | Componente monolítico: tabs, listas, drawers, mutations, realtime, filtros — tudo num arquivo |
| `routes/c.$slug.tsx` (catálogo público) | 790 | View + carrinho + checkout + endereço + state derivado misturados |
| `routes/cadastro.tsx` | 741 | Form gigante com várias máquinas de estado (CPF, CNPJ, endereço, role, MP) |
| `_authenticated/admin/lojas.tsx` | 659 | CRUD + filtros + modais + ações em massa no mesmo arquivo |
| `_authenticated/entregador/turnos.tsx` / `perfil.tsx` | 565 cada | Forms longos e validações inline |
| `_authenticated/loja/agendamentos.tsx` | 550 | Lógica de oferta/aceite acoplada à view |
| `_authenticated/entregador/ativos.tsx` | 532 | Mapa + lista + ações + realtime |
| `_authenticated/loja/dashboard.tsx` | 502 | KPIs + CriarLojaForm (já com retry loop) + listas |
| `lib/rota.functions.ts` | 379 | Várias serverFns + helpers no mesmo módulo |
| `lib/notificacao-som.ts` | 241 | Classe/serviço com múltiplas responsabilidades |

## Princípios aplicados

- **SRP**: 1 arquivo = 1 responsabilidade. Separar view, estado, dados (queries/mutations) e regras de negócio puras.
- **OCP/DIP**: extrair regras puras (cálculo, validação, formatação) para módulos sem dependência de React/Supabase, fáceis de testar e reutilizar.
- **Clean Code**: funções ≤ ~40 linhas, early-return, nomes descritivos, evitar flags booleanas, dividir condicionais aninhados (reduzir ciclomática).
- **Pastas por feature** para cada rota grande, em vez de "tudo no route file".

## Estrutura alvo por feature

Padrão repetível para cada hotspot, ex. `loja/pedidos`:

```text
src/features/loja-pedidos/
  hooks/
    usePedidosRealtime.ts        # subscribe + invalidate
    usePedidosQueries.ts         # queryOptions + useSuspenseQuery wrappers
    usePedidoMutations.ts        # aceitar, recusar, finalizar
  components/
    PedidosTabs.tsx              # casca da UI, só compõe
    PedidoCard.tsx
    PedidoDrawer.tsx
    PedidoFiltros.tsx
    PedidoStatusBadge.tsx
  logic/
    pedido-status.ts             # máquina de estados pura
    pedido-formatters.ts         # datas, moeda, telefone
  index.tsx                      # export do componente de página
src/routes/_authenticated/loja/pedidos.tsx   # vira ~20 linhas: createFileRoute + <PedidosPage />
```

## Plano de execução (incremental, 1 PR mental por etapa)

### Etapa 1 — Infra compartilhada (baixo risco)
1. `src/lib/format/` — `currency.ts`, `date.ts`, `phone.ts`, `cpf-cnpj.ts`, `cep.ts` (movendo formatters duplicados de várias telas).
2. `src/lib/validation/` — schemas Zod compartilhados (CPF, CNPJ, endereço, telefone, senha) usados por `cadastro`, `perfil`, `configuracoes`.
3. `src/hooks/` — extrair `useDebouncedValue`, `useRealtimeChannel(table, filter, onChange)`, `useConfirmDialog`.

### Etapa 2 — Quebrar `loja/pedidos.tsx` (907 → ~20)
Conforme estrutura alvo acima. Manter mesmas queryKeys e mutations.

### Etapa 3 — Quebrar `routes/c.$slug.tsx` (catálogo público, 790)
```text
src/features/catalogo/
  components/ CatalogoHeader, ProdutoGrid, ProdutoCard, CarrinhoDrawer, CheckoutForm, EnderecoEntrega
  hooks/      useCarrinho (reducer puro + persist localStorage), useFreteCalculado
  logic/      carrinho-reducer.ts (puro), checkout-validators.ts
```
`useCarrinho` substitui useState gigante por reducer puro testável.

### Etapa 4 — Quebrar `cadastro.tsx` (741)
- Separar em steps: `RoleStep`, `DadosPessoaisStep`, `EnderecoStep`, `LojaStep`, `EntregadorStep`.
- Wizard controlado por hook `useCadastroWizard` (state machine).
- Mutations e chamada de serverFn isoladas em `cadastro-actions.ts`.
- Reaproveitar schemas da Etapa 1.

### Etapa 5 — Quebrar `admin/lojas.tsx`, `loja/agendamentos.tsx`, `entregador/ativos.tsx`, `loja/dashboard.tsx`
Mesmo padrão da Etapa 2. Em `dashboard.tsx`, extrair `CriarLojaForm` (já complexo após o retry-loop fix) para `features/loja-onboarding/CriarLojaForm.tsx`.

### Etapa 6 — Quebrar forms longos do entregador (`turnos`, `perfil`)
- Sub-forms por seção (Veiculo, Documentos, Dados Bancários, Disponibilidade).
- Validação via schemas compartilhados.

### Etapa 7 — Camada de domínio do backend
- `src/lib/rota.functions.ts` (379) → dividir em:
  - `rota.functions.ts` (só `createServerFn` finos)
  - `rota.server.ts` (helpers de cálculo)
  - `rota-domain.ts` (regras puras de roteirização, sem Supabase)
- `mercadopago.functions.ts` / `mercadopago.server.ts`: separar `buildPreference`, `verifyWebhook`, `mapStatus` em funções puras.
- `notificacao-som.ts`: dividir em `audio-player.ts` (toca), `som-preferences.ts` (lê/escreve config), `notificacao-service.ts` (orquestra).

### Etapa 8 — Redução de complexidade ciclomática
Padrões aplicados em todos os arquivos tocados:
- Substituir `if/else` aninhado por **lookup tables** (status → label/cor/ação).
- Extrair guards no topo (`if (!x) return …`).
- Quebrar funções > 40 linhas.
- Eliminar parâmetros boolean (passar union de strings).

## Garantias de não-regressão

- Sem mudança de schema, RLS, endpoints ou contratos de serverFn.
- Mesmas queryKeys/realtime channels → cache e invalidations preservados.
- Refatoração mecânica: mover + renomear + extrair. Diff revisável.
- Build + typecheck a cada etapa (a harness roda automaticamente).
- Ordem das etapas escolhida para que cada uma seja independente e reversível.

## Detalhes técnicos relevantes

- Manter route files apenas com `createFileRoute(...)({ component: Page, loader, head, errorComponent, notFoundComponent })`. Toda lógica vai para `src/features/<nome>/`.
- Loaders continuam usando `context.queryClient.ensureQueryData(queryOptions)`; `queryOptions` extraídas para `hooks/use*Queries.ts` para serem reusadas no loader e no componente.
- ServerFns continuam em `*.functions.ts`; helpers server-only continuam em `*.server.ts` (regra do bundler).
- Componentes shadcn não são movidos; só seu uso é encapsulado em componentes de feature.

## Escopo desta proposta

Plano apenas. Posso executar **Etapa 1 + Etapa 2** (infra + `loja/pedidos`) já na próxima rodada se você aprovar, e seguir incrementalmente. Cada etapa é entregue com build verde e zero mudança funcional.
