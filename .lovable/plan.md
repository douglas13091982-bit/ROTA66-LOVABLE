# Diagnóstico Técnico — ROTA 66 V.2

Revisão somente leitura. Nenhum código foi alterado. Severidades: **CRÍTICO** (corrigir já) / **IMPORTANTE** (próximo ciclo) / **MELHORIA** (nice to have).

---

## 0. Achado mais grave (verificado)

**CRÍTICO — A home pública (`/`) está publicando o texto de um prompt interno.**
`src/routes/index.tsx` hoje renderiza, como conteúdo da página, o briefing literal de migração para Mapbox (dependências, variáveis de ambiente, instruções internas). Qualquer visitante de `rota66.com.br` vê isso. Além do impacto de imagem, a home não tem `head()` (título/descrição/OG), então o compartilhamento e o SEO da raiz do domínio estão quebrados.

Rotas públicas sem `head()`: `index.tsx`, `loja.$slug.tsx`, `rastreio.$pedidoId.tsx`. As duas últimas são exatamente as páginas mais compartilhadas por WhatsApp (catálogo da loja e rastreio do pedido).

---

## 1. Arquitetura e código

**IMPORTANTE — Componentes gigantes com regra de negócio dentro da UI.**
`src/components/PedidoForm.tsx` (724 linhas), `entregador-ativos/components/PedidoCard.tsx` (658), `admin-despesas/AdminDespesasPage.tsx` (544), `catalogo/PagamentoMercadoPago.tsx` (503), `cadastro/SignupWizard.tsx` (485). Nesses arquivos cálculo de tarifa, decisão de status e chamadas de servidor convivem com JSX — é onde os bugs de taxa/status reapareceram várias vezes.

**IMPORTANTE — Quatro implementações paralelas do "card de pedido do entregador".**
`components/entregador/PedidoCardDisponivel.tsx`, `PedidoListItem.tsx`, `PedidoRowCompacto.tsx` e `features/entregador-ativos/components/PedidoCard.tsx`. Some `admin-pedidos/PedidoRow.tsx` e `loja-pedidos/PedidoCard.tsx`: seis lugares para mudar quando muda uma regra de exibição de taxa. Mesmo padrão nos mapas (`EntregadoresMapaTempoReal`, `EntregadoresMapaMapbox`, `admin-mapa`, `loja-mapa`).

**IMPORTANTE — TypeScript contornado nas camadas de dinheiro.**
Concentração de `as any` justamente nos arquivos financeiros: `cobrancas-mp.functions.ts` (29), `mercadopago.functions.ts` (27), `mp-webhook-dispatcher.server.ts` (24), `loja-saldo.functions.ts` (20), `creditos-entregador.functions.ts` (20). São os módulos onde um campo errado significa dinheiro errado, e são os que estão sem checagem de tipo.

**IMPORTANTE — Estratégia de atualização é polling agressivo, não Realtime.**
Mais de 20 `refetchInterval`/`setInterval` ativos. `use-pedidos-disponiveis.ts` sozinho mantém 4 queries em polling **e** 6 canais Realtime. No banco isso aparece medido: `franqueados_config` levou **416 mil seq scans** para 1 linha e `config_roteirizacao` 117 mil — são configurações relidas em loop, sem cache.

**MELHORIA — Listas sem paginação real.** `HistoricoPage` usa `.limit(500)` e `admin-pedidos` `.limit(200)`. Funciona hoje (166 pedidos), mas trava a tela quando a base crescer, e o teto silencioso esconde dados do usuário.

**Ponto positivo:** a organização `src/features/<domínio>` com `components/` + `hooks/` + `logic/` está consistente em 63 domínios, e há 16 arquivos de teste cobrindo justamente as regras críticas (tarifa, taxa exibida, plano mensal, status do entregador). Essa base é boa e deve ser o padrão para o resto.

---

## 2. Banco de dados

**CRÍTICO — `user_roles` está sendo varrida inteira em produção.**
Medição real: **3,77 milhões de seq scans** e **313 milhões de tuplas lidas** numa tabela de 100 linhas. Como `has_role`/`has_role_scoped` são chamadas dentro das políticas RLS de quase tudo, cada consulta do app paga esse custo. É o gargalo número um do sistema e a causa mais provável de lentidão sob carga.

**IMPORTANTE — 3 tabelas com RLS ligada e nenhuma política.**
`lojas_pagamento_mp`, `pedidos_pendentes_pagamento` e `private_config`. Sem política, RLS bloqueia tudo — só funcionam via service role. Se alguma tela ou função de usuário depender delas, ela falha silenciosamente. `private_config` provavelmente é intencional (só servidor); as outras duas precisam de decisão explícita.

**IMPORTANTE — 15 chaves estrangeiras sem índice**, incluindo caminhos quentes:
`pedidos.cliente_user_id`, `lojas_saldo_movimentos.pedido_id`, `entregadores_saldo_saque_movimentos.pedido_id`, `loja_avaliacoes.pedido_id`, `cobrancas_faturas_mp.loja_id`, `lojas.plano_id`, `promocoes_lojas.city_id`. Extrato financeiro por pedido e "meus pedidos" do cliente hoje são varredura.

**IMPORTANTE — Outras tabelas em varredura frequente:** `pedido_ofertas` (30 mil seq scans, 1,7 M tuplas), `entregador_status` (71 mil / 1,4 M), `lojas` (314 mil). São exatamente pool de ofertas e status online — o coração do despacho.

**MELHORIA — Validação concentrada em funções, não em constraints.** Existem `is_valid_cpf`/`is_valid_cnpj`, mas vale confirmar que estão aplicadas como constraint/trigger em `profiles` e `lojas`; valores monetários (`>= 0`) e coordenadas (faixa de lat/lng) também merecem trigger de validação.

**Ponto positivo:** todas as funções `SECURITY DEFINER` têm `search_path` fixado — a falha clássica de escalonamento de privilégio não existe aqui. Papéis estão corretamente em `user_roles` separada, com `has_role_scoped`.

---

## 3. Segurança

**CRÍTICO — Checkout anônimo sem rate limiting.**
Existe a política `pedidos INSERT` para `anon` com `WITH CHECK (cliente_user_id IS NULL)`. Isso é correto para permitir pedido de convidado, mas não há nenhum limite de frequência: um script pode inserir pedidos em massa, poluindo o painel das lojas, disparando push para entregadores e gerando cobranças. A única defesa de frequência que existe no projeto é em `promocoes.functions.ts` (1 por 6h). Cadastro (`/cadastro`) tem o mesmo problema.

**IMPORTANTE — Webhooks públicos precisam de auditoria de assinatura.**
São 8 rotas em `src/routes/api/public/`, sendo 4 webhooks Mercado Pago (`mp-webhook`, `mp-webhook.$lojaId`, `mp-webhook-entregador`, `mp-webhook-plataforma`) mais `send-push` e `mp-poll-pendentes`. Esse prefixo ignora autenticação por definição — cada handler tem que validar assinatura/segredo antes de qualquer escrita em saldo. Vale uma revisão handler por handler, porque escrita em saldo sem verificação é fraude direta.

**IMPORTANTE — `config_roteirizacao` legível por `anon` com `USING (true)`.** Regras de despacho e roteirização são inteligência operacional; não deveriam ser públicas. `config_branding` e `tarifas_globais (ativa=true)` públicas fazem sentido.

**MELHORIA — Documentos do entregador e dados de cliente.** `entregador_documentos` tem 5 políticas e `clientes_loja` 3 — a modelagem existe. Recomendo um teste dirigido: autenticar como entregador A e tentar ler documento do entregador B, e como loja X tentar ler cliente da loja Y. É o tipo de furo que só aparece em teste real.

**Ponto positivo:** o gate `_authenticated/route.tsx` está bem feito — `ssr: false`, renovação proativa de sessão e distinção entre "sem sessão" e "falha de rede" (foi o que resolveu o deslogamento espontâneo). Papéis e flag de colaborador de franqueado vêm de uma única fonte no `beforeLoad`.

---

## 4. UX e fluxo

**IMPORTANTE — Fricção no checkout do cliente: endereço sem coordenada.** O fluxo depende de o cliente selecionar a sugestão do autocomplete para gerar lat/lng; quando o endereço vem de cliente salvo ou digitação livre, a taxa não calcula e aparece aviso amarelo. Há geocodificação de servidor como rede de proteção, mas o caminho ainda tem um estado em que o cliente não consegue avançar sem entender o porquê.

**IMPORTANTE — Nove telas usam `AddressAutocomplete`** (`calcular-frete`, `EnderecoMatriz`, `CheckoutDados`, `PerfilDialog`, `SignupWizard`, `ClienteFields`, `PedidoForm`, `EnderecosColetaManager`). Qualquer regressão nesse componente derruba cadastro, checkout e criação de pedido ao mesmo tempo — é o único ponto de falha mais crítico da UI.

**MELHORIA — Estados de carregamento/vazio desiguais.** 96 arquivos em `features/` tratam `isLoading`/`isPending`, mas há 63 domínios e 112 arquivos com `useEffect`: parte das telas busca dado em efeito sem estado de erro. Vale um inventário tela a tela.

**MELHORIA — Resíduo de refatoração.** `PreviaSemanaCard.tsx` (card removido do financeiro) ainda existe e ainda abre um canal Realtime. Indica que remoções anteriores deixaram código órfão ativo.

---

## 5. Funcionalidades incompletas / inconsistências

- **IMPORTANTE — Migração Mapbox está em estado híbrido.** Google e Mapbox coexistem com troca por `config_frete.provedor_mapa` e fallback. Funciona, mas dobra a superfície de manutenção e mantém duas implementações de mapa vivas. Falta decidir a data de corte e remover o caminho Google.
- **IMPORTANTE — Clusterização de marcadores no mapa do Super Admin** (item 3 do escopo Mapbox) não aparece implementada em `EntregadoresMapaMapbox.tsx`.
- **IMPORTANTE — Rota otimizada com múltiplos waypoints** para agregação de pedidos: existe `rota.functions.ts` e `config_roteirizacao`, mas confirmar se a sugestão ainda é por raio de proximidade em vez de Directions API com waypoints.
- **MELHORIA — Sem CI de teste.** Existem 16 testes bons, mas nada garante que rodem antes de publicar.

---

## 6. Prioridades recomendadas

**Fazer agora (crítico)**
1. Restaurar a home pública `/` e adicionar `head()` em `index`, `loja.$slug` e `rastreio.$pedidoId`.
2. Resolver o gargalo de `user_roles`/RLS — índice adequado e cache de papel por requisição.
3. Rate limiting em checkout anônimo e cadastro.
4. Auditoria de assinatura nos 4 webhooks Mercado Pago.

**Próximo ciclo (importante)**
5. Índices nas 15 FKs sem índice, começando por `pedidos.cliente_user_id` e os `pedido_id` dos movimentos financeiros.
6. Decidir e aplicar políticas (ou marcar como server-only) em `lojas_pagamento_mp` e `pedidos_pendentes_pagamento`; fechar `config_roteirizacao` para `anon`.
7. Tipar os módulos financeiros — remover `as any` de `cobrancas-mp`, `mercadopago`, `mp-webhook-dispatcher`, `loja-saldo`, `creditos-entregador`.
8. Unificar os cards de pedido em um componente com variantes e trocar polling de configuração por cache longo.

**Depois (melhoria)**
9. Concluir o corte para Mapbox e remover o caminho Google.
10. Paginação real nas listas de histórico e admin.
11. Inventário de estados de loading/erro/vazio e limpeza de código órfão.
12. CI rodando os testes existentes a cada publicação.

---

## Como quer seguir?

Posso transformar qualquer bloco acima em um plano de implementação detalhado. Sugiro começar pelos quatro itens críticos, que são de escopo pequeno e alto impacto.
