# Franquia por cidade

Transformar o sistema num modelo de franquia: você (owner) gerencia tudo; cada **super admin de cidade** enxerga apenas a operação da sua cidade e paga uma mensalidade de franquia.

## 1. Papéis

Novo enum `app_role.owner` acima de `super_admin`.
- **owner** (você): vê tudo, cadastra super admins de cidade, define planos/tarifas globais, financeiro consolidado, gerencia mensalidades de franquia.
- **super_admin** (franqueado da cidade): escopo restrito à cidade atribuída.
- Demais papéis (`loja`, `entregador`, `revendedor`) inalterados.

Seu usuário atual é migrado automaticamente para `owner`.

## 2. Escopo do super admin de cidade

Cada super_admin tem 1 cidade fixa (`profiles.cidade_atendida`, obrigatório para o papel).

Enxerga somente onde `cidade = cidade_atendida`:
- Lojas, entregadores, pedidos, revendedores, financeiro, agendamentos, mensalidades de loja, saques (entregador/revendedor), contratos aceitos, alertas.
- Pode **criar/editar/suspender** lojas, entregadores e **revendedores** da sua cidade.
- Pode aprovar entregadores, aprovar saques, aprovar reset de senha — tudo escopado.

Bloqueado para super_admin de cidade (só owner):
- Planos globais, tarifas globais, categorias globais, branding, contratos (template), configurações de sistema, alertas de infra, roteirização global, notificações som globais, APK, anúncios globais, cadastro de outros super_admins.

## 3. Financeiro da franquia

Nova aba **Franqueados** no menu do owner:
- Cadastrar franqueado (email, senha, nome, telefone, documento, **cidade**, **mensalidade_franquia**, dia_vencimento).
- Ver lista, ativar/inativar, editar mensalidade, excluir.
- Ver mensalidades geradas por franqueado (status: pendente/pago/vencido), com link Mercado Pago (reusa infra `cobrancas_faturas_mp` num escopo `franqueado`).

Página **Minha franquia** para o super_admin de cidade:
- Vê sua cidade, mensalidade, próximo vencimento, faturas pendentes, botão pagar via MP.
- Bloqueio automático de acesso se mensalidade vencer > X dias (configurável, padrão 5).

## 4. Banco de dados

- `ALTER TYPE app_role ADD VALUE 'owner'`.
- `profiles.cidade_atendida text` (nullable; obrigatória só quando papel = super_admin sem ser owner).
- Nova tabela `franqueados_config`: user_id, cidade, mensalidade_valor, dia_vencimento, ativo, bloqueado_por_inadimplencia, created_at.
- Nova tabela `franqueados_faturas`: id, franqueado_user_id, competencia, valor, vencimento, status, mp_payment_id, mp_link, pago_em.
- Função `has_role` já existe; adicionar `is_owner()`, `cidade_do_admin(uid)`.
- Reescrever RLS das tabelas operacionais (`lojas`, `pedidos`, `profiles` de entregador, `revendedores`, `mensalidades_loja`, `entregador_saques`, `revendedor_saques`, `agendamentos`, `password_reset_requests`, `system_alerts`) para: `is_owner() OR (has_role(uid,'super_admin') AND cidade = cidade_do_admin(uid))`.
- pg_cron mensal: gerar fatura de franquia no dia_vencimento de cada franqueado ativo.

## 5. Frontend

- `AdminAreaGate` passa a diferenciar owner vs super_admin_cidade. Menu lateral do `AdminShell` filtra itens: itens “globais” só aparecem para owner.
- Nova rota `/admin/franqueados` (owner) — CRUD e faturas.
- Nova rota `/admin/minha-franquia` (super_admin de cidade) — status/pagamento.
- Todas as queries existentes de `lojas`, `pedidos`, etc. ganham filtro implícito via RLS — não precisa alterar componentes; apenas as telas “globais” são escondidas do menu.
- Banner vermelho no topo quando `bloqueado_por_inadimplencia = true`, com CTA pagar.

## 6. Detalhes técnicos

- Migração idempotente: cria enum value, tabelas, GRANTs, políticas, funções `SECURITY DEFINER` (`is_owner`, `cidade_do_admin`).
- Substituir políticas antigas que usavam `has_role(auth.uid(),'super_admin')` por wrapper que aceita owner OU super_admin-da-mesma-cidade.
- Cobrança MP: reusar `plataforma-mp.server.ts` (mesmo owner MP recebe as mensalidades de franquia).
- Cron: `SELECT cron.schedule('gerar-faturas-franquia','0 3 * * *', ...)`.
- Bloqueio de acesso: verificado no `AdminAreaGate` via `franqueados_config.bloqueado_por_inadimplencia`.

## 7. Fora do escopo (para depois)

- Múltiplas cidades por franqueado.
- Comissão % sobre receita da cidade (só mensalidade fixa agora).
- Sub-franqueados / hierarquia > 2 níveis.
- Migração de dados legados por cidade (assume que `lojas.cidade` já está preenchido corretamente).
