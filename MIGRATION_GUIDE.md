# Manual de Migração do Projeto (Rotas66 / Lovable Cloud)

Documento interno para que outra IA (ou desenvolvedor) consiga **clonar o projeto em outra conta Lovable / Supabase** e recriar o banco de dados sem erros.

---

## 1. Visão geral do stack

- **Frontend:** TanStack Start v1 (React 19) + Vite 7 + Tailwind v4 + shadcn/ui
- **Backend / DB / Auth / Storage:** Supabase (rodando como “Lovable Cloud”)
- **Server logic:** `createServerFn` do TanStack Start (NÃO usa Supabase Edge Functions — pasta `supabase/functions/` está vazia)
- **Deploy:** Cloudflare Workers (`@cloudflare/vite-plugin`)
- **Integrações externas:** Google Maps, Mercado Pago, Web Push, Lovable AI Gateway

O projeto **não tem `.git` no zip baixado**. Tudo que importa para o banco está em `supabase/migrations/`.

---

## 2. Pré‑requisitos na nova conta

1. Criar um novo projeto Lovable com **Lovable Cloud habilitado** (ou um projeto Supabase novo, caso queira rodar fora do Lovable).
2. Garantir as extensões Postgres:
   - `pgcrypto` (já vem no Supabase) — `gen_random_uuid()`
   - `pg_cron` (opcional, usado pelos jobs de mensalidades e ofertas — ver §6)
3. Confirmar que o esquema `auth` do Supabase existe (padrão).

---

## 3. Variáveis de ambiente

Arquivo `.env` na raiz (não comitar). No Lovable Cloud, os 3 primeiros são injetados automaticamente:

```
VITE_SUPABASE_URL=https://<novo-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
VITE_SUPABASE_PROJECT_ID=<novo-ref>
SUPABASE_URL=https://<novo-ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
SUPABASE_PROJECT_ID=<novo-ref>

# Server-only (Lovable Cloud injeta sozinho; em Supabase puro, copiar do dashboard)
SUPABASE_SERVICE_ROLE_KEY=...

# Connectors Lovable (Google Maps)
VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY=...
VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID=...
```

Atualizar também `supabase/config.toml` com `project_id = "<novo-ref>"`.

### Secrets adicionais (em `private_config` ou Secrets do Lovable)

Estes **não** são variáveis de ambiente — ficam na tabela `public.private_config` (gerenciada pelo painel Super Admin) ou nos Secrets do Lovable Cloud:

| Chave | Onde | Para que serve |
|---|---|---|
| `mp_platform_access_token` | `private_config` | Mercado Pago da plataforma (créditos de entregador) |
| `mp_platform_public_key` | `private_config` | Mercado Pago da plataforma |
| `LOVABLE_API_KEY` | Secrets | Lovable AI Gateway (se usado) |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Secrets | Web Push (`src/routes/api/public/send-push.ts`) |
| `MP_WEBHOOK_SECRET` | Secrets | Validação dos webhooks Mercado Pago |

Mercado Pago por loja é salvo na tabela `lojas_pagamento_mp` via RPC `salvar_mp_config`.

---

## 4. Recriação do banco — ORDEM IMPORTA

O diretório `supabase/migrations/` tem **167 arquivos** nomeados em ordem cronológica:

```
20260518103315_*.sql  ← primeira (cria enums, profiles, user_roles, has_role)
...
20260621211015_*.sql  ← última (adiciona icone_url em loja_categorias)
```

### Regras obrigatórias

1. **Rodar TODAS as migrations em ordem alfabética** (que é a mesma ordem cronológica). Não pular, não reordenar.
2. **Não rodar via `supabase db reset`** apontando para um DB que já tenha dados — apaga tudo. Em um projeto novo, é seguro.
3. **No Lovable Cloud:** basta colar/aplicar cada migration pelo agente (uma de cada vez ou em lote pela ordem). O agente executor já entende o formato.
4. **No Supabase CLI puro:**
   ```bash
   supabase link --project-ref <novo-ref>
   supabase db push
   ```
   O CLI aplica em ordem alfabética automaticamente.

### O que as migrations criam (resumo)

- **Enums:** `app_role`, `pedido_status`, `tipo_veiculo`, `forma_pagamento`, `status_moderacao`, `admin_area`, `agendamento_status`, `entregador_credito_tipo`, `suporte_ticket_status`, `suporte_ticket_prioridade`.
- **Tabelas core:** `profiles`, `user_roles`, `admin_permissoes`, `lojas`, `lojas_enderecos_coleta`, `lojas_pagamento_mp`, `loja_categorias`, `loja_entregadores`, `loja_avaliacoes`, `loja_aceites_contrato`.
- **Pedidos/entrega:** `pedidos`, `pedido_ofertas`, `pedido_mensagens`, `produtos`, `clientes_loja`, `entregador_status`, `entregador_status_conta`.
- **Financeiro:** `config_financeiro`, `tarifas_globais`, `cobrancas_loja`, `cobrancas_faturas_mp`, `mensalidades_loja`, `planos_loja`, `config_creditos_entregador`, `entregador_creditos`, `entregador_creditos_transacoes`, `entregador_recargas_mp`.
- **Turnos:** `agendamentos`, `agendamento_aceites`, `agendamento_ofertas`.
- **Suporte/branding/notificação:** `suporte_tickets`, `suporte_mensagens`, `contratos`, `config_branding`, `config_notificacao_som`, `config_roteirizacao`, `anuncios_entregador`, `push_subscriptions`, `avatar_audit_log`, `private_config`.
- **Funções SECURITY DEFINER críticas** (ver lista completa em §7): `has_role`, `is_loja_owner`, `is_valid_cpf`, `is_valid_cnpj`, `handle_new_user`, `calcular_tarifa_global`, `processar_ofertas_externas`, `confirmar_coleta`, `confirmar_entrega`, etc.
- **Triggers** importantes: `on_auth_user_created` (em `auth.users` → chama `handle_new_user`), `pedidos_entregador_update_guard`, `lojas_update_guard`, `cobrancas_loja_update_guard`, `aplicar_plano_loja`, `recalcular_taxa_entregador_na_atribuicao`, `gerar_cobranca_pedido_entregue`, `trigger_processar_ofertas`.
- **RLS habilitado** em todas as tabelas, com policies escopadas a `auth.uid()` + helpers `has_role()`.
- **GRANTs explícitos** em cada tabela (necessário pela Data API do Supabase).

---

## 5. Storage buckets

Criar manualmente (ou via SQL) na nova conta:

| Bucket | Público? | Observação |
|---|---|---|
| `avatars` | sim | fotos de perfil |
| `lojas-logos` | sim | logos das lojas |
| `produtos` | sim | imagens de produtos |
| `categoria-icones` | sim | ícones customizados de categoria (RLS: insert/update/delete só super_admin) |
| `branding` | sim | logo/banner do app |

Policies recomendadas: leitura pública (`SELECT TO anon`) + escrita restrita por dono/role (já refletidas nas migrations onde aplicável).

---

## 6. Jobs agendados (pg_cron)

Se a nova conta usar pg_cron, registrar:

```sql
SELECT cron.schedule('gerar-mensalidades-diario', '0 6 * * *',
  $$SELECT public.gerar_mensalidades_do_dia();$$);

SELECT cron.schedule('processar-ofertas', '*/1 * * * *',
  $$SELECT public.processar_ofertas_externas();$$);
```

Alternativa: chamar via endpoint público em `src/routes/api/public/hooks/` por um cron externo.

---

## 7. Bootstrap inicial (primeiro super admin)

A função `handle_new_user` (trigger em `auth.users`) já promove o **primeiro usuário cadastrado** a `super_admin` automaticamente. Portanto:

1. Subir o app conectado ao novo banco.
2. Ir em `/cadastro` e criar o primeiro usuário — ele vira super admin sozinho.
3. Entrar em `/admin` → Configurar Categorias, Planos, Tarifas, Mercado Pago da plataforma, Branding.

---

## 8. Auth providers

No painel Supabase / Lovable Cloud:

- **Email/senha:** habilitar (auto-confirm OFF em produção, ON só em testes).
- **Google OAuth:** habilitar provider Google (Client ID/Secret próprios). O login Google é feito via `lovable.auth.signInWithOAuth("google")` — funciona automaticamente no Lovable Cloud assim que o provider está ligado.

---

## 9. Arquivos auto‑gerados — NÃO EDITAR

Estes são regenerados pelo Lovable Cloud / TanStack quando você conecta o novo backend:

- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/client.server.ts`
- `src/integrations/supabase/auth-middleware.ts`
- `src/integrations/supabase/auth-attacher.ts`
- `src/integrations/supabase/types.ts`
- `src/routeTree.gen.ts`
- `.env` (chaves Supabase)
- `supabase/config.toml` (project_id)

Após conectar o novo Supabase no Lovable, **regenerar `types.ts`** rodando o agente (ele faz introspecção do schema novo).

---

## 10. Checklist final de validação

Depois de migrar, testar nesta ordem:

- [ ] Cadastrar primeiro usuário → confirmar role `super_admin` em `user_roles`.
- [ ] Acessar `/admin/categorias` → adicionar 1 categoria com ícone (testa `loja_categorias` + bucket).
- [ ] Cadastrar uma loja (rota loja) → confirmar trigger `tg_lojas_grant_admin_role` deu `loja_admin`.
- [ ] Criar produto → catálogo público acessível em `/c/<slug>`.
- [ ] Cadastrar entregador → fluxo de validação CPF (`is_valid_cpf`).
- [ ] Criar pedido teste → status muda `criado → pronto → em_rota → coletado → entregue`.
- [ ] Verificar que `gerar_cobranca_pedido_entregue` criou linha em `cobrancas_loja`.
- [ ] Marketplace `/clientes/<cidade>` lista lojas ordenadas por avaliação.

---

## 11. Erros comuns e soluções

| Erro | Causa | Solução |
|---|---|---|
| `permission denied for table X` | faltou GRANT após CREATE TABLE | Reaplicar a migration que criou a tabela ou rodar `GRANT SELECT,INSERT,UPDATE,DELETE ON public.X TO authenticated;` |
| `Expected 3 parts in JWT; got 1` | Server lendo dados públicos com service_role/key novo formato | Usar `SUPABASE_PUBLISHABLE_KEY` em server functions de leitura pública |
| `Unauthorized: No authorization header` em serverFn | Faltou `attachSupabaseAuth` em `src/start.ts` | Garantir `functionMiddleware: [attachSupabaseAuth]` |
| `relation "public.X" does not exist` ao rodar migration N | Migration anterior pulada | Aplicar migrations em **ordem alfabética sem pular** |
| Login Google: “Unsupported provider” | Provider Google não habilitado no Supabase | Habilitar no painel Auth Providers |
| `function has_role(uuid, app_role) does not exist` | Enum `app_role` ou função não criados (1ª migration faltando) | Rodar `20260518103315_*.sql` primeiro |
| Trigger `handle_new_user` falha em cadastro | CPF inválido, ou enum `tipo_veiculo` ausente | Conferir que enums e função foram criados antes do trigger |

---

## 12. Passo a passo curto para a IA executora

1. Criar projeto Lovable + Cloud na nova conta.
2. Substituir `.env` e `supabase/config.toml` com novas chaves.
3. Aplicar **todas** as migrations de `supabase/migrations/` em ordem alfabética.
4. Criar buckets de storage listados em §5.
5. Habilitar pg_cron jobs (§6) — opcional.
6. Habilitar Email + Google em Auth.
7. Regenerar `src/integrations/supabase/types.ts`.
8. Subir o app, cadastrar primeiro usuário (vira super admin).
9. Rodar checklist §10.

Fim.
