# Plano: Atualização de Texto na Página Inicial

O objetivo é substituir o conteúdo textual atual da rota `/` pelo novo texto solicitado, mantendo o formato literal conforme as instruções.

## Alterações Propostas

### Frontend
*   **src/routes/index.tsx**: 
    *   Substituir o bloco de texto atual dentro do componente da rota pelo novo texto solicitado.
    *   Garantir que o texto seja exibido literalmente, mantendo a estrutura de `whitespace-pre-wrap` e `font-mono`.

## Detalhes Técnicos
*   O texto será inserido como uma template string dentro do JSX.
*   Nenhuma alteração lógica ou de funcionalidade será realizada, apenas a troca do conteúdo visual.
