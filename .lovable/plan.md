## Objetivo
Padronizar o nome exibido no prompt de instalação do PWA para **"ROTA 66 - APP"**, tanto no app do entregador quanto no do cliente.

## Mudanças

1. **`public/manifest.webmanifest`**
   - `name`: `"ROTA 66 — Entregador"` → `"ROTA 66 - APP"`
   - `short_name`: manter `"ROTA 66"`

2. **`public/manifest-cliente.webmanifest`**
   - `name`: `"ROTA 66 — Cliente"` → `"ROTA 66 - APP"`
   - `short_name`: manter `"ROTA 66"`

Nenhuma outra alteração (ícones, cores, scope, start_url permanecem iguais).

## Observação
Dispositivos que já instalaram o PWA continuarão mostrando o nome antigo até desinstalar/reinstalar — o `name` é cacheado no momento da instalação.