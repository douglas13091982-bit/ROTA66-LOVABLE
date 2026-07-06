# Funcionários da loja

Permitir que o dono da loja cadastre funcionários (e-mail + senha) que entram no painel da loja com **acesso total exceto Financeiro e Saques**. Quantidade máxima definida pelo plano contratado.

## O que o usuário vai ver

**Nova aba em `Configurações → Funcionários`** dentro do painel da loja:
- Contador `3 / 5 funcionários usados` (do plano atual).
- Botão **Adicionar funcionário** → dialog com Nome, E-mail, Senha. Ao salvar, a conta é criada já ativa; o dono entrega o acesso ao funcionário.
- Lista com nome, e-mail, data de criação, botão **Remover acesso** e **Redefinir senha**.
- Se atingiu o limite do plano, o botão fica desabilitado com aviso `Seu plano permite N funcionários. Faça upgrade para adicionar mais.`

**Login do funcionário:** entra normalmente em `/login` com e-mail e senha. Cai no painel da loja do patrão, com o menu lateral **sem** os itens `Financeiro` (e sem acesso a saques dentro de outras telas).

**Dono da loja:** continua vendo tudo, inclusive Financeiro e a nova aba de Funcionários.

## Regras de permissão

Funcionário pode:
- Ver e operar Pedidos, Histórico, Novo pedido, Agendamentos, Catálogo, Entregadores, Suporte, Dashboard, Configurações (menos aba Funcionários e menos dados bancários/PIX de saque).

Funcionário **não pode**:
- Acessar Financeiro (saldo, saques, cobranças, mensalidade, Mercado Pago).
- Criar/remover outros funcionários.
- Alterar plano, CNPJ, dados bancários, aceitar contrato.
- Excluir a loja.

## Detalhes técnicos

### Banco

1. **Tabela `loja_funcionarios`**
   - `loja_id` (FK lojas), `user_id` (FK auth.users, único), `nome`, `criado_por`, timestamps.
   - GRANTs + RLS: `SELECT/INSERT/DELETE` só para o `owner_id` da loja; funcionário vê a própria linha.

2. **Coluna `max_funcionarios` em `planos_loja`** (int, default 0). Admin edita pelo painel de planos existente.

3. **Função `public.loja_do_usuario(uid uuid)` SECURITY DEFINER** que retorna o `loja_id` — seja porque é `owner_id` da loja, seja porque tem linha em `loja_funcionarios`. Usada nas policies existentes.

4. **Ajustar policies das tabelas da loja** (`pedidos`, `produtos`, `loja_categorias`, `agendamentos`, `loja_entregadores`, `lojas_enderecos_coleta`, `clientes_loja`, `pedido_mensagens`, etc.): substituir `owner_id = auth.uid()` por `loja_id = public.loja_do_usuario(auth.uid())`. Tabelas financeiras (`lojas_saldo`, `lojas_saques`, `lojas_saldo_movimentos`, `cobrancas_loja`, `mensalidades_loja`, `lojas_pagamento_mp`, `lojas_recargas_mp`) continuam restritas ao `owner_id`.

### Servidor

5. **`src/lib/loja-funcionarios.functions.ts`** com três server functions autenticadas (`requireSupabaseAuth`):
   - `listarFuncionarios()` — lista funcionários da loja do usuário.
   - `criarFuncionario({ nome, email, senha })` — verifica se caller é owner, checa `count < plano.max_funcionarios`, chama `supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true })`, insere em `loja_funcionarios`.
   - `removerFuncionario({ user_id })` — owner remove, apaga da tabela e chama `supabaseAdmin.auth.admin.deleteUser`.
   - `redefinirSenha({ user_id, senha })` — owner redefine via `supabaseAdmin.auth.admin.updateUserById`.
   - `supabaseAdmin` importado dinamicamente dentro do handler.

### Frontend

6. **`src/hooks/use-loja.tsx`**: além de buscar por `owner_id`, se não achar, buscar via `loja_funcionarios.user_id = auth.uid()` e retornar a loja vinculada. Expor `isOwner: boolean` no retorno.

7. **`src/components/LojaShell.tsx`**: esconder item `Financeiro` do `NAV` quando `!isOwner`. Esconder toggle "Loja aberta" só se quiser (mantemos visível).

8. **Nova página `src/features/loja-funcionarios/FuncionariosPage.tsx`** — lista + dialog de criação + confirmação de remoção + redefinir senha. Renderizada como aba nova em `ConfigPage` (só aparece para owner).

9. **Guardas nas telas financeiras**: `FinanceiroPage` (e sub-rotas) redireciona para `/loja/dashboard` com toast se `!isOwner`. Assim URL direta também é bloqueada.

10. **Admin de planos**: adicionar input `Máximo de funcionários` no formulário de planos existente.

### Não incluído

- Papéis granulares por menu (só "acesso total menos financeiro"). Se quiser mais tarde, dá para adicionar `permissoes jsonb` em `loja_funcionarios`.
- Convite por e-mail — a loja mesma define a senha e passa ao funcionário.
