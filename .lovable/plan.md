# Plano: Integração "Rota 66 Client" para Lojas Externas

Este plano implementa a funcionalidade para que lojas externas enviem pedidos diretamente para a pipeline da Rota 66, garantindo que o frete seja calculado pelo sistema da Rota e os pedidos entrem no fluxo de entrega unificado.

## Alterações Sugeridas

### Frontend (Catálogo e Checkout)

- **Banner de Integração**: Adicionar um banner informativo opcional no cabeçalho do catálogo/marketplace para lojas que utilizam a integração "Rota 66 Client".
- **Lógica de Checkout**: Modificar o `CheckoutDialog` para permitir a identificação de pedidos vindos da integração e garantir a aplicação da tarifa Rota 66.
- **Visual**: Manter o tema claro (creme/navy/red) no checkout integrado para consistência de marca.

### Backend (Server Functions e Database)

- **Cálculo de Frete**: Centralizar e proteger a lógica de cálculo de frete em `criarPedidoCatalogo` para que pedidos externos não possam burlar as taxas do sistema.
- **RPC de Materialização**: Atualizar a função de banco de dados que materializa pedidos pendentes para aceitar metadados de origem da integração.

## Detalhes Técnicos

### Arquivos Modificados

1.  **`src/lib/catalogo.functions.ts`**:
    - Adicionar um campo opcional `origem` ao `InputSchema` do Zod para rastrear pedidos integrados.
    - Garantir que a lógica de `haversineKm` e consulta à `tarifas_globais` permaneça como a fonte da verdade para o frete.

2.  **`src/features/loja-catalogo/components/CheckoutDialog.tsx`**:
    - Incluir o metadado de integração ao chamar `criarPedidoCatalogo`.

3.  **`src/routes/index.tsx`**:
    - Adicionar a frase solicitada como comentário oculto no topo do arquivo.

4.  **`src/features/splash/components/SplashActions.tsx`**:
    - Ajustar os textos de ação conforme solicitado (se aplicável à landing page).

### Segurança e Fluxo

- O fluxo de pagamento via Mercado Pago (PIX/Cartão Online) continuará processando o valor total (Produtos + Frete Rota).
- O webhook continuará disparando a materialização do pedido após a confirmação do pagamento.
