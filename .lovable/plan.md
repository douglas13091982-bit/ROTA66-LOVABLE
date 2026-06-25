## Objetivo
Manter o tema dark atual como padrão e adicionar um **toggle Light/Dark** no app do entregador, com persistência por usuário (localStorage).

## Mudanças

### 1. Tokens light em `src/styles.css`
Adicionar bloco `html.light` com paleta clara mantendo a identidade Rota 66 (vermelho como primary, dourado como accent):
- `--background: #f6f7f9`, `--foreground: #0f1b2d`
- `--card: #ffffff`, `--card-foreground: #0f1b2d`
- `--muted: #eef0f4`, `--muted-foreground: #5b6677`
- `--border: #e3e6ec`, `--input: #e3e6ec`
- `--primary` mantém o vermelho da marca, `--ring` idem
- Sombras suaves substituindo as escuras
- Override de `.panel-premium` dentro de `html.light` para fundo claro + grid sutil cinza
- Override de `.glass`, `.glass-strong` e `.shadow-soft/elevated` para versões claras

### 2. Hook `src/hooks/use-theme.ts`
- Lê `localStorage("rota-theme")` (default = `"dark"`)
- Aplica/remove `class="light"` em `document.documentElement`
- Expõe `{ theme, setTheme, toggle }`
- Inicialização síncrona no boot (`src/main.tsx`) para evitar flash

### 3. Componente `src/components/ThemeToggle.tsx`
Botão pill Sun/Moon (lucide) usando tokens semânticos.

### 4. `src/components/EntregadorShell.tsx`
- Trocar cores hardcoded da bottom nav (`#0f304d`, `text-white`) por classes/condicionais que respeitam o tema (no light: fundo branco, texto navy; ativo continua vermelho).
- Trocar fundos hardcoded do `StatusToggleLarge` (`bg-black/60`) por tokens (`bg-card`/`border-border`) com fallback escuro via `.dark`/sem `.light`.
- Adicionar `<ThemeToggle />` no canto superior direito do conteúdo (acima do título da página, sticky discreto).

### 5. Telas internas do entregador
Auditoria leve de `src/features/entregador-*` para substituir os principais `text-white`, `bg-white/5`, `bg-black/40` por tokens semânticos (`text-foreground`, `bg-card`, `bg-muted`) — só onde quebraria legibilidade no light. Páginas: `disponiveis`, `historico`, `perfil`, `turnos`, `carteira`, `ativos`. Não mexer em telas de loja/admin/cliente nesse passo.

## Fora de escopo
- Tema light para loja, admin, super-admin e catálogo de cliente (já tem `.catalogo-clean` próprio).
- Toggle automático por preferência do SO (pode entrar depois).

## Resultado
- Padrão continua dark idêntico ao atual.
- Entregador pode tocar no ícone Sol/Lua para alternar; preferência persiste.
