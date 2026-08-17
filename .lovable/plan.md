# Plano: Limpeza Completa do Sistema de Revendedores e Refinamento de Segurança

O sistema de "Revendedor" foi solicitado para remoção anteriormente, mas ainda restam referências no código (tipos, hooks, metadados) e na segurança (políticas RLS que permitem acesso ou mencionam a entidade). Este plano visa realizar uma limpeza definitiva e garantir que franqueados não tenham brechas de segurança.

## Alterações Sugeridas

### Backend (Banco de Dados)
- Remover as tabelas `revendedores`, `revendedor_cobrancas`, `revendedor_saques` e `revendedor_convites_loja`.
- Remover as funções `gerar_codigo_revendedor`, `set_codigo_indicacao_revendedor`, `buscar_revendedor_por_codigo`, `is_revendedor_da_loja` e `gerar_cobrancas_revendedores_mensal`.
- Remover o valor `revendedor` do enum `app_role`.
- Atualizar a política "Super admin gerencia revendedores" na tabela `revendedores` (que será removida) e limpar referências a `revendedor_id` na tabela `lojas`.

### Segurança (RLS)
- Auditar e remover qualquer menção a "revendedor" em políticas de outras tabelas.
- Reforçar que administradores de franquia (franqueados) só podem gerenciar entidades (lojas, entregadores, pedidos) dentro de sua cidade atribuída.

### Frontend
- Remover o papel `revendedor` do tipo `AppRole` em `src/hooks/use-auth.tsx`.
- Limpar referências a `/revendedor` em metadados de redirecionamento (`src/components/AndroidApkRedirect.tsx`).
- Remover estilos ou classes CSS que mencionem "Revendedor".

## Detalhes Técnicos

### Migração SQL
```sql
-- Remover tabelas e objetos dependentes
DROP TABLE IF EXISTS public.revendedor_convites_loja CASCADE;
DROP TABLE IF EXISTS public.revendedor_saques CASCADE;
DROP TABLE IF EXISTS public.revendedor_cobrancas CASCADE;
DROP TABLE IF EXISTS public.revendedores CASCADE;

-- Limpar coluna de referência em lojas
ALTER TABLE public.lojas DROP COLUMN IF EXISTS revendedor_id;

-- Remover funções
DROP FUNCTION IF EXISTS public.buscar_revendedor_por_codigo(text);
DROP FUNCTION IF EXISTS public.gerar_codigo_revendedor();
DROP FUNCTION IF EXISTS public.set_codigo_indicacao_revendedor();
DROP FUNCTION IF EXISTS public.is_revendedor_da_loja(uuid);
DROP FUNCTION IF EXISTS public.gerar_cobrancas_revendedores_mensal();

-- Remover o role (exige recriação ou cast se estiver em uso)
-- Nota: Como o enum app_role é usado em muitas tabelas, faremos uma limpeza segura.
```

### Arquivos a serem editados
1. `src/hooks/use-auth.tsx`: Remover `revendedor` do `AppRole`.
2. `src/components/AndroidApkRedirect.tsx`: Remover string do comentário/lógica se necessário.
3. `src/styles.css`: Remover comentários que citam o painel revendedor.
