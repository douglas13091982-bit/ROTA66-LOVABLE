# Suíte de testes unitários — fase 1 (lógica pura crítica)

## Escopo

Sem infra de teste hoje. Vou montar a base e cobrir **só a lógica pura de domínio** — que é onde testes unitários têm ROI máximo: bugs aqui afetam pagamento do entregador, agrupamento de pedidos e cálculo de distância.

Componentes React, hooks com Supabase e server functions ficam **fora desta fase** (exigem mocks pesados, MSW e ambiente jsdom configurado — vale como fase 2 se você quiser).

## Stack

- **Vitest** — roda em cima do Vite que já está configurado, zero config extra
- **@vitest/coverage-v8** — relatório de cobertura
- Sem Testing Library nesta fase (não há componente sendo testado)

## Alvos (todos `src/lib/*` puros, sem I/O)

| Arquivo | Por que importa | Casos cobertos |
|---|---|---|
| `tarifa-calculator.ts` | Calcula quanto o entregador recebe por faixa de km | faixa exata, limite inferior/superior, km fora de qualquer faixa, lista vazia, faixas sobrepostas, km = 0, km negativo |
| `pedido-agrupador.ts` (`mesclarPedidosDisponiveis`, `agruparPedidosPorRota`) | Mescla pool externo + vinculados sem duplicar; agrupa por rota | mescla sem duplicatas, deduplicação por id, dismissed filtra grupo, ordenação, grupo com 1 vs N itens, lista vazia |
| `geo.ts` (`haversineKm`) | Distância usada em todas as taxas | mesmo ponto = 0, polos, anti-meridiano, distâncias conhecidas (SP→RJ), precisão em distâncias curtas |
| `endereco.ts` (`resumirEnderecoEntrega`) | Texto exibido no card | endereço completo, vazio, só rua, com complemento, caracteres especiais |
| `use-taxa-sistema.ts` → `liquidoEntregador` (função pura exportada) | Define quanto cai no bolso do entregador conforme plano | loja com plano mensal (valor cheio), sem plano (desconto), taxa zero, desconto > taxa |
| `format/*` e `validation/*` | Helpers usados em forms | conforme conteúdo real dos arquivos |
| `entregador-online.ts` | Lógica de janela online | dentro/fora do TTL, edge no segundo limite |
| `horario-funcionamento.ts` | Loja aberta/fechada | dentro do horário, fora, virada de meia-noite, dia inválido |

Cada arquivo de teste fica colado ao código (`tarifa-calculator.test.ts` ao lado de `tarifa-calculator.ts`), padrão do Vitest.

## Padrões aplicados

- **AAA** (Arrange/Act/Assert) explícito em cada teste
- **Um comportamento por teste**, nome descritivo em português ("retorna 0 quando lat/lng iguais")
- **Sem mocks** nesta fase — só lógica pura, então não há dependência a isolar
- **Fixtures inline** (não global) — cada teste constrói só o que precisa
- **`describe` por função pública**, não por arquivo
- Meta de cobertura: **>90% nas linhas dos arquivos cobertos** (a métrica global do projeto será baixa porque só estamos cobrindo lib/)

## Mudanças concretas

```text
package.json
├─ devDeps: vitest, @vitest/coverage-v8, jsdom
└─ scripts:
   ├─ test         → vitest
   ├─ test:run     → vitest run
   └─ test:cov     → vitest run --coverage

vitest.config.ts            ← novo, environment: 'node' (sem DOM nesta fase)

src/lib/tarifa-calculator.test.ts
src/lib/pedido-agrupador.test.ts
src/lib/geo.test.ts
src/lib/endereco.test.ts
src/lib/entregador-online.test.ts
src/lib/horario-funcionamento.test.ts
src/hooks/use-taxa-sistema.test.ts     ← só a função pura liquidoEntregador
src/lib/format/*.test.ts               ← um arquivo por helper existente
src/lib/validation/*.test.ts           ← idem
```

Estimativa: ~80–120 testes, dependendo do que cada helper expõe.

## O que fica para fase 2 (se você pedir)

- **Componentes React** (`PedidoListItem`, cards, forms) — exige jsdom + @testing-library/react
- **Hooks com Supabase** (`usePedidosDisponiveis`, `useAcoesPedido`) — exige mock do client Supabase
- **Server functions** — exige mock do contexto TanStack Start
- **E2E / integração** — Playwright, vale só se houver fluxos críticos repetíveis

## Confirme antes de eu executar

1. **OK abrir esse escopo de fase 1** (só lib pura) ou quer já incluir componentes/hooks?
2. **Pode adicionar `vitest`, `@vitest/coverage-v8` e `jsdom`** como devDeps?
3. Algum arquivo dessa lista que você **não** quer cobrir agora?
