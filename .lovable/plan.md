## Fluxo de convite: Super Admin → Revendedor vincula loja

### Objetivo
Super Admin gera um **link único** para vincular uma loja específica a um revendedor. O revendedor abre o link, confirma, e a loja é automaticamente atribuída ao seu perfil.

### 1. Banco de dados

Nova tabela `revendedor_convites_loja`:
- `id` (uuid)
- `token` (text, único, gerado com `gen_random_uuid()`)
- `loja_id` (uuid → lojas)
- `revendedor_id` (uuid → revendedores, opcional — pode ser convite aberto para qualquer revendedor)
- `email_destinatario` (text, opcional)
- `criado_por` (uuid → auth.users) — o super admin
- `status` (enum: `pendente`, `aceito`, `expirado`, `cancelado`)
- `expira_em` (timestamptz — default 7 dias)
- `aceito_em`, `aceito_por` (timestamptz / uuid)
- `created_at`, `updated_at`

RLS:
- Super admin: ver/criar/cancelar tudo
- Revendedor: ver apenas convites com `revendedor_id = auth.uid()` OU convites abertos (sem revendedor_id)
- Anon: sem acesso direto (validação via RPC)

RPC `aceitar_convite_loja(_token text)` — SECURITY DEFINER:
- Valida token, status `pendente`, não expirado
- Confirma que o usuário logado é revendedor (`has_role(auth.uid(), 'revendedor')`)
- Se `revendedor_id` do convite estiver definido, exige match com `auth.uid()`
- Atualiza `lojas.revendedor_id = auth.uid()`
- Marca convite como `aceito`
- Retorna dados da loja

### 2. Super Admin — gerar convite

Em `/admin/revendedores` (ou dentro da página de detalhe do revendedor), adicionar botão **"Convidar para vincular loja"**:
- Modal: seleciona a loja + (opcional) revendedor específico + email
- Cria registro em `revendedor_convites_loja`
- Exibe link copiável: `https://<dominio>/revendedor/convite/{token}`
- Lista de convites emitidos (com status, expiração, botão "Cancelar" e "Copiar link")

### 3. Revendedor — aceitar convite

Nova rota `src/routes/revendedor/convite.$token.tsx`:
- Se não logado → redireciona para `/auth?redirect=/revendedor/convite/{token}`
- Se logado mas não é revendedor → mostra erro "Perfil incompatível"
- Mostra card com: nome da loja, quem convidou, expiração
- Botão **"Aceitar e vincular"** → chama RPC `aceitar_convite_loja`
- Após sucesso → redireciona para `/revendedor/lojas` com toast

### 4. UI

- **Super Admin**: nova seção "Convites de loja" com tabela (loja, revendedor, status, expira, ações)
- **Revendedor**: página `/revendedor/lojas` recebe pequeno banner "Você tem convite pendente?" (link para colar token) — opcional
- Toast de sucesso após aceitar

### Detalhes técnicos

- Server function `criarConviteLoja` (admin, `requireSupabaseAuth` + check `admin`)
- Server function `aceitarConviteLoja` (`requireSupabaseAuth` + check `revendedor`) → chama RPC
- Server function `listarConvitesLoja` (admin)
- Server function `cancelarConviteLoja` (admin)
- Server function `getConvitePublico(token)` — retorna dados básicos do convite para exibir na página antes do login (só nome da loja, expiração, status)

### Fora do escopo
- Envio de email automático (o link é copiado manualmente pelo super admin agora; posso adicionar depois se quiser)
- Convites para múltiplas lojas de uma vez