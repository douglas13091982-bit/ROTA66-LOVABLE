## O que vamos construir

Adicionar um campo **categoria de atuação** na tabela da loja, permitindo escolha durante o cadastro e edição posterior nas configurações.

## Categorias disponíveis

O usuário selecionará em um campo de busca com as seguintes opções:
- Restaurante
- Mercado
- Farmácia
- Auto Peças
- Moto Peças
- Lanchonete
- Sorveteria
- Pizzaria
- Bebidas (distribuidora)
- Doceria / Confeitaria
- Pet Shop
- Açougue / Carnes
- Padaria
- Hortifrúti / Verduras
- Roupas / Moda
- Calçados
- Material de construção
- Eletrônicos
- Floricultura
- Livraria / Papelaria
- Loja de conveniência
- Outros

## Passos

### 1. Migration: novo enum e coluna
- Criar o enum `public.loja_categoria` com todas as categorias listadas acima.
- Adicionar a coluna `categoria` do tipo enum à tabela `lojas` (nullable, sem default).
- Garantir que não quebre cadastros existentes (coluna opcional).

### 2. Atualizar cadastro (`/cadastro`)
- Quando o usuário escolher o perfil **Loja**, exibir um campo "Categoria de atuação" logo abaixo do CNPJ.
- Usar um componente de busca/select (Command/shadcn combobox) para listar as categorias.
- Incluir a categoria no `insert` da loja (`supabase.from("lojas").insert({...})`).

### 3. Atualizar configurações (`/loja/configuracoes`)
- Adicionar o campo "Categoria de atuação" no formulário de configurações.
- Preencher automaticamente com o valor salvo.
- Permitir alteração posterior.
- Salvar via `supabase.from("lojas").update({ categoria: ... })`.

## Observações
- O campo será **opcional** para não quebrar lojas já cadastradas.
- Nenhuma lógica de negócio muda (a categoria é apenas informativa por enquanto, mas pode ser usada futuramente para filtrar catálogos públicos).