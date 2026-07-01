
# Multi-tenant hierárquico: Super Admin (você) + Revendedores

## Visão geral

Hoje o sistema tem um único nível `super_admin` (global) e `admin` (com permissões por área). Vou introduzir um novo papel **`revendedor`** que:

- Vê/gerencia **apenas as lojas atribuídas a ele** (CRUD completo dentro do escopo).
- Paga ao Super Admin (você) via **Mercado Pago**, no mesmo fluxo que as lojas já usam hoje: **mensalidade fixa** + **% sobre a receita** que as lojas dele geram na plataforma.
- Todos os pagamentos das lojas continuam caindo na sua conta MP (owner). Nada muda no fluxo financeiro loja→plataforma.

Você (`super_admin`) continua com visão global e vira o "dono" que gerencia os revendedores.

---

## 1. Banco de dados (uma migration)

### 1.1 Novo papel
- `ALTER TYPE public.app_role ADD VALUE 'revendedor';`

### 1.2 Tabela `revendedores`
Perfil do revendedor + config de cobrança individual:
- `user_id` (PK, FK auth.users)
- `nome`, `documento` (CPF/CNPJ), `telefone`, `email`
- `mensalidade_valor` (numeric) — quanto ele te paga por mês
- `percentual_receita` (numeric, 0-100) — % sobre a receita das lojas dele
- `dia_vencimento` (int, 1-28)
- `ativo` (bool)

### 1.3 Vínculo loja ↔ revendedor
- Adicionar coluna `lojas.revendedor_id uuid REFERENCES revendedores(user_id)` (nullable — loja pode ser sua diretamente).

### 1.4 Cobranças do revendedor
Tabela `revendedor_cobrancas` (espelha `mensalidades_loja`):
- `revendedor_id`, `competencia` (YYYY-MM), `valor_mensalidade`, `valor_percentual`, `valor_total`, `vencimento`, `pago`, `pago_em`, `mp_preference_id`, `mp_payment_id`.

### 1.5 RLS
- `revendedores`: super_admin CRUD; o próprio revendedor lê o seu registro.
- `lojas`: adicionar policy — revendedor vê/edita apenas `WHERE revendedor_id = auth.uid()`. Super admin mantém acesso total.
- Todas as tabelas dependentes (`pedidos`, `mensalidades_loja`, `cobrancas_loja`, `lojas_saldo`, `produtos`, `agendamentos`, etc.) — adicionar policy: revendedor lê linhas cuja `loja_id` pertença a loja dele. Uso de função `is_revendedor_da_loja(_loja_id)` SECURITY DEFINER para evitar recursão.
- `revendedor_cobrancas`: super_admin CRUD; revendedor lê apenas as próprias.

### 1.6 Funções auxiliares
- `public.is_revendedor_da_loja(_loja_id uuid)` SECURITY DEFINER — retorna true se `auth.uid()` é o revendedor da loja.
- `public.gerar_cobranca_revendedor_mensal()` — job mensal (pg_cron dia 1) que calcula mensalidade fixa + % sobre receita bruta do mês anterior das lojas do revendedor e insere em `revendedor_cobrancas`.

---

## 2. Frontend — nova área `/revendedor`

Estrutura de rotas espelha `/loja` e `/admin`:

```text
src/routes/_authenticated/revendedor/
  route.tsx           # gate: exige role 'revendedor'
  index.tsx           # redireciona para /revendedor/lojas
  lojas.tsx           # lista + CRUD das lojas dele
  loja.$id.tsx        # editar loja específica
  cobrancas.tsx       # mensalidades dele para pagar via MP
  perfil.tsx
```

- `RevendedorShell.tsx` — layout com sidebar (Lojas, Cobranças, Perfil, Sair). Reaproveita padrão visual de `AdminShell`/`LojaShell`.
- Nova feature `src/features/revendedor-lojas/` — reutiliza componentes de `admin-lojas` mas com queries filtradas por `revendedor_id = auth.uid()`.
- Nova feature `src/features/revendedor-cobrancas/` — lista cobranças, botão "Pagar via PIX" que cria preference MP (mesmo fluxo já existente para mensalidades de loja).

### Redirect por role
Atualizar `src/features/login/logic/redirect-by-role.ts` — se `revendedor`, ir para `/revendedor`.

---

## 3. Frontend — área do Super Admin

Nova página `src/features/admin-revendedores/AdminRevendedoresPage.tsx` em `/admin/revendedores`:

- Listar revendedores (nome, email, mensalidade, %, status, receita gerada, lojas ativas).
- Criar revendedor (cria auth user + insere em `revendedores` + concede role `revendedor`).
- Editar mensalidade / % / dia vencimento.
- Ativar/desativar.
- Ver cobranças de cada revendedor (histórico + status pagamento).

Na página de lojas do admin (`admin/lojas`), adicionar um select "Revendedor responsável" ao criar/editar loja.

Adicionar item "Revendedores" no `AdminShell` sidebar.

---

## 4. Cobrança automática (pg_cron)

Cron mensal (dia 1, 03:00) chama `gerar_cobranca_revendedor_mensal()` que:

1. Para cada revendedor ativo, calcula receita bruta do mês anterior (mensalidades pagas + taxa por pedido) das lojas dele.
2. Insere linha em `revendedor_cobrancas` com valor total = `mensalidade_valor + (receita * percentual / 100)`.
3. Vencimento = dia_vencimento do mês corrente.

Webhook MP já existente (`mp-webhook-plataforma.ts`) — estender para reconhecer pagamentos de `revendedor_cobrancas` (campo `external_reference` prefixado `rev-cob:<id>`).

---

## 5. Escopo protegido

Toda RPC/server function crítica que hoje aceita `loja_id` como input do admin passa a validar: se caller é `revendedor`, exigir `is_revendedor_da_loja(loja_id)`. Isso vale para RPCs de gerenciamento de produtos, planos da loja, saldos, etc.

Pedidos, entregadores globais e financeiro do sistema (fora do escopo das lojas dele) permanecem invisíveis ao revendedor.

---

## Fora do escopo (não vou fazer agora)

- Split de pagamento MP (você preferiu conta única).
- Revendedor criando os próprios planos (marcado apenas "Apenas suas lojas"; usam os planos globais existentes).
- Revendedor gerenciando entregadores (não marcado).
- Financeiro detalhado das lojas para o revendedor (não marcado).
- App do entregador: nenhuma alteração.

---

## Entregáveis

1. 1 migration SQL (enum + 2 tabelas + coluna + policies + funções + cron).
2. Feature `admin-revendedores` (super admin gerencia).
3. Feature `revendedor-lojas` + `revendedor-cobrancas` + shell + rotas.
4. Ajuste em `admin-lojas` (select de revendedor).
5. Ajuste em `redirect-by-role` e sidebar admin.

Confirma que posso seguir?
