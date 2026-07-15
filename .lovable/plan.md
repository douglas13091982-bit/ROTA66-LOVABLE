
# Colaboradores do Franqueado

Permitir que cada franqueado dê acesso ao seu painel a outros usuários (colaboradores), que enxergam as mesmas telas que o franqueado — restritas à cidade dele — **exceto o menu "Minha franquia"** (faturas, mensalidade, dados da franquia).

## Como vai funcionar

**Para o franqueado**
- Nova aba **"Colaboradores"** dentro de `/admin/minha-franquia`.
- Campo para adicionar colaborador por e-mail (o usuário precisa já ter conta no sistema).
- Lista dos colaboradores atuais com botão de remover.
- Só o próprio franqueado enxerga essa aba.

**Para o colaborador**
- Ao entrar no sistema, é direcionado ao painel admin igual ao franqueado.
- Vê todos os menus do franqueado (Lojas, Entregadores, Financeiro, Pedidos, Suporte, Faturamento do sistema, etc.), sempre **filtrados pela cidade do franqueado que o convidou**.
- **NÃO vê** o menu "Minha franquia" e não consegue acessar essa rota (bloqueio também no roteador).
- Badge lateral mostra "Colaborador · <Cidade>" em vez de "Franqueado".

**Regras de segurança**
- Colaborador herda cidade e escopo do franqueado — nunca vê dados de outras cidades.
- Se o franqueado estiver bloqueado por inadimplência, os colaboradores também ficam bloqueados (mesma tela de acesso bloqueado, sem link para "ver faturas").
- Remover um colaborador tira o acesso imediatamente.

## Detalhes técnicos

**Banco de dados** (via migration)
- Nova tabela `franqueado_colaboradores`:
  - `franqueado_user_id` (FK → auth.users, cidade herdada de `franqueados_config`)
  - `colaborador_user_id` (FK → auth.users, único)
  - `ativo` (boolean)
  - timestamps
- GRANTs para `authenticated` e `service_role`; RLS habilitada.
- Políticas:
  - Franqueado lê/insere/remove apenas suas próprias linhas (`franqueado_user_id = auth.uid()`).
  - Colaborador lê apenas a própria linha.
- Função `public.franqueado_do_colaborador(uid uuid) returns uuid` (SECURITY DEFINER) para descobrir o franqueado ao qual o colaborador pertence.
- Atualizar as políticas RLS existentes que hoje usam `franqueados_config.cidade = auth.uid()` para também aceitar colaboradores via `franqueado_do_colaborador(auth.uid())`. Tabelas afetadas: `lojas`, `mensalidades_loja`, `cobrancas_loja`, `pedidos`, `entregador_saques`, `lojas_saques`, `profiles`, `entregadores_saldo_saque`, `lojas_saldo`, `franqueados_faturas` (somente leitura pra colaborador — sem escrita).

**Hook `use-franquia.ts`**
- Passa a resolver também colaboradores: se o usuário atual tem linha em `franqueado_colaboradores`, carrega o `franqueados_config` do franqueado dono e devolve `cidade`, `bloqueado`, etc.
- Novos flags retornados:
  - `isColaborador` (true quando é colaborador de algum franqueado)
  - `isFranqueado` continua true para o franqueado dono
  - `podeVerMinhaFranquia = isFranqueado && !isColaborador`

**`AdminShell.tsx`**
- Adiciona regra na navegação: itens marcados como `franqueadoOnly` continuam visíveis para colaboradores (menus operacionais), mas `/admin/minha-franquia` recebe uma flag nova `donoFranquiaOnly` e é escondido para colaboradores.
- Badge de papel: mostra "Colaborador · <Cidade>" quando `isColaborador`.
- Guarda de rota: se colaborador tentar abrir `/admin/minha-franquia` diretamente, mostra a tela "Acesso restrito".

**`MinhaFranquiaPage.tsx`**
- Adiciona seção/aba **"Colaboradores"** visível apenas para o dono da franquia (`!isColaborador`).
- Formulário para adicionar por e-mail + lista com remoção.

**Server functions** em `src/lib/franqueados-colaboradores.functions.ts` (protegidas com `requireSupabaseAuth`):
- `listarColaboradores()` — lista os colaboradores do franqueado logado (com e-mail via Admin API).
- `adicionarColaborador({ email })` — valida se o usuário logado é franqueado, busca `user_id` pelo e-mail (Admin API), insere na tabela.
- `removerColaborador({ colaboradorUserId })` — remove a linha do franqueado logado.

## Fora do escopo (por enquanto)
- Permissões granulares por área para colaboradores (ex.: colaborador só de "Suporte"). Se quiser depois, dá para plugar em cima do `admin_permissoes`.
- Convite por e-mail para quem ainda não tem conta (nesta versão o colaborador precisa se cadastrar antes).
