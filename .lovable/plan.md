## Objetivo

Permitir que a loja cadastre **adicionais/complementos** por produto (ex.: borda recheada, extras, molhos, tamanhos) com preço próprio, e que o cliente escolha esses adicionais no catálogo antes de adicionar ao carrinho. Os adicionais somam ao preço do item e ficam registrados no pedido.

## Modelo de dados

Duas novas tabelas no schema `public`:

**`produto_adicional_grupos`** — um grupo de opções vinculado a um produto (ex.: "Escolha a borda", "Extras", "Tamanho").
- `produto_id` (FK produtos)
- `nome`, `min_escolhas` (int, default 0), `max_escolhas` (int, default 1), `obrigatorio` (bool), `ordem` (int)

**`produto_adicional_opcoes`** — cada opção dentro do grupo (ex.: "Borda catupiry — R$ 8").
- `grupo_id` (FK)
- `nome`, `preco` (numeric, default 0), `ativo` (bool), `ordem` (int)

Ambas com RLS: loja dona pode gerenciar (via `loja_id` derivado), leitura pública para catálogo aberto. GRANTs padrão + `anon` SELECT.

Nos pedidos, o snapshot de item em `pedidos.itens` (JSON) ganha o campo `adicionais: [{ grupo, nome, preco, qtd }]` e o `subtotal` já reflete a soma.

## Cadastro na loja

Em `ProdutoDialog.tsx`, após criar/editar um produto, adicionar seção **"Adicionais"**:
- Lista de grupos com botão "Novo grupo".
- Para cada grupo: nome, obrigatório/opcional, min/max escolhas, e lista de opções (nome + preço + ativo).
- Reordenar por drag simples (ou botões up/down) — v1 usa campo `ordem` manual para simplicidade.

Novo hook `use-produto-adicionais.ts` para CRUD dos grupos/opções.

## Experiência do cliente no catálogo

Quando o cliente clica em **Adicionar** num produto que tenha grupos de adicionais, em vez de somar direto, abre um **modal de personalização**:
- Mostra foto, nome, descrição do produto.
- Renderiza cada grupo (radio para `max=1`, checkbox para `max>1`).
- Valida `min_escolhas` e `max_escolhas`.
- Rodapé mostra preço total (base + adicionais × qtd) e stepper de quantidade.
- Botão "Adicionar ao carrinho — R$ X,XX".

Produtos sem grupos continuam com o comportamento atual (add direto pelo stepper).

O carrinho passa a chavear itens por `produto_id + hash(adicionais)` em vez de só `produto_id`, para que duas pizzas com bordas diferentes sejam linhas separadas. `use-cart.ts` é refatorado para trabalhar com uma lista de "linhas" `{ lineId, produto, adicionais, qtd, precoUnit }`.

O checkout (`CheckoutCarrinho`) mostra os adicionais abaixo do nome do item, e o `subtotal` continua correto.

## Servidor

`src/lib/catalogo.functions.ts` (`criarPedidoCatalogo`) valida cada item:
- Busca as opções de adicional pelo id.
- Confere que pertencem ao produto e estão ativas.
- Recalcula `preco_unit = produto.preco + soma(opcoes.preco)` no servidor (nunca confia no cliente).
- Persiste `adicionais` dentro do snapshot do item.

Também aplica as regras de `min/max/obrigatorio` no servidor.

## Arquivos afetados (resumo técnico)

Novos:
- Migration criando as duas tabelas + RLS + GRANTs.
- `src/features/loja-produtos/hooks/use-produto-adicionais.ts`
- `src/features/loja-produtos/components/AdicionaisEditor.tsx`
- `src/features/loja-catalogo/components/ProdutoPersonalizarDialog.tsx`
- `src/features/loja-catalogo/logic/cart-line.ts` (helpers de linha e hash)

Editados:
- `src/features/loja-produtos/components/ProdutoDialog.tsx` — inclui `<AdicionaisEditor />` após salvar produto.
- `src/features/loja-catalogo/hooks/use-catalogo.ts` — carrega grupos+opções junto com produtos ativos.
- `src/features/loja-catalogo/hooks/use-cart.ts` — passa a operar por lineId.
- `src/features/loja-catalogo/components/CategoriaCarrossel.tsx` e `ProdutoGrid.tsx` — quando produto tem grupos, o botão "+" abre o modal em vez de somar direto.
- `src/features/loja-catalogo/components/CheckoutCarrinho.tsx` — mostra adicionais por linha.
- `src/lib/catalogo.functions.ts` — validação e cálculo dos adicionais no servidor; schema Zod atualizado.
- `src/routes/-catalogo-types.ts` — tipo `Produto` ganha `adicionais_grupos?`.

## Fora do escopo desta entrega

- Reordenação por drag-and-drop (usa campo `ordem` manual).
- Adicionais globais reutilizáveis entre produtos (cada produto tem os seus).
- Importação de adicionais via iFood/planilha.
- Edição de adicionais depois que o pedido já foi criado.

Posso seguir?
