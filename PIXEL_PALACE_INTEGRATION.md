# Integração ROTA 66 × Pixel Palace

O ROTA 66 é o núcleo de logística. O Pixel Palace continua sendo o dono do pedido comercial, catálogo, cliente e pagamento.

## Autenticação

Configure no ambiente do ROTA 66:

`ROTA66_INTEGRATION_API_KEY`

O Pixel Palace envia essa chave em:

`Authorization: Bearer <chave>`

ou:

`x-rota66-integration-key: <chave>`

## Criar uma entrega

`POST /api/integration/v1/deliveries`

Exemplo de payload:

```json
{
  "external_order_id": "PP-12345",
  "source": "pixel-palace",
  "loja_id": "UUID_DA_LOJA",
  "cliente_nome": "Cliente",
  "cliente_telefone": "47999999999",
  "endereco_coleta": "Rua de coleta, 100",
  "endereco_coleta_lat": -26.30,
  "endereco_coleta_lng": -48.84,
  "endereco_entrega": "Rua de entrega, 200",
  "endereco_entrega_lat": -26.31,
  "endereco_entrega_lng": -48.85,
  "cidade": "Joinville",
  "complemento": "Apto 12",
  "taxa_entrega": 9.90,
  "codigo_entrega": "4821",
  "observacoes": "Deixar na portaria",
  "valor_total": 79.90
}
```

A chamada é idempotente por `source + external_order_id`. Reenviar o mesmo pedido não cria uma segunda entrega.

## Consultar entrega

`GET /api/integration/v1/deliveries/{delivery_id}`

## Cancelar entrega

`POST /api/integration/v1/deliveries/{delivery_id}`

Payload:

```json
{ "action": "cancel" }
```

O cancelamento só é aceito enquanto a entrega estiver em `pronto` ou `aceito`.

## Responsabilidades

### Pixel Palace
- loja
- catálogo/produtos
- cliente
- carrinho
- checkout
- pagamento
- pedido comercial
- acompanhamento comercial

### ROTA 66
- cadastro/aprovação de entregadores
- online/offline
- localização
- ofertas
- aceite
- rota
- coleta
- entrega
- código de entrega
- tarifas logísticas
- suporte
- status da entrega

A tabela `integracao_entregas` funciona somente como vínculo técnico entre o ID do pedido externo e a entrega operacional do ROTA 66.
