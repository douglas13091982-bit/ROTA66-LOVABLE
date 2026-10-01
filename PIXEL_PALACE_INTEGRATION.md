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


## Status logístico

O ROTA 66 normaliza os estados internos para a integração:

| ROTA 66 | API |
|---|---|
| `pronto` | `waiting_courier` |
| `aceito` | `accepted` |
| `em_rota` | `on_route_to_pickup` |
| `coletado` | `picked_up` |
| `entregue` | `delivered` |
| `cancelado` | `cancelled` |

Também é possível consultar diretamente pelo pedido externo:

`GET /api/integration/v1/deliveries/external/{external_order_id}`

Esse endpoint retorna somente dados logísticos e não expõe os códigos de coleta/entrega.

## Limites da integração

`loja_id` permanece no endpoint de criação apenas como compatibilidade com o modelo legado do banco do ROTA 66. O ROTA 66 não usa esse vínculo para decidir quais entregas são oferecidas aos entregadores.

O fluxo operacional do entregador usa o pool logístico `rota66_pool_entregas` e o aceite atômico `rota66_aceitar_entrega`.

## Mercado Pago

O ROTA 66 não processa pagamentos comerciais de lojas, catálogo, checkout ou pedidos do Pixel Palace. O webhook específico de loja foi desativado.

O webhook principal do ROTA 66 fica restrito ao financeiro operacional de entregadores, como recargas/créditos, quando esse recurso estiver habilitado.


## Configuração obrigatória

No ambiente do servidor ROTA 66:

```
ROTA66_INTEGRATION_API_KEY=<chave-secreta-compartilhada>
```

Essa variável não deve ser colocada no código-fonte, no `.env` versionado ou no navegador.

O Pixel Palace deve usar exatamente a mesma chave no servidor como `ROTA66_INTEGRATION_API_KEY`.

A integração não utiliza `LOVABLE_API_KEY`.

## Idempotência

O ROTA 66 usa `source + external_order_id` como chave idempotente. Assim, se o Pixel Palace reenviar o mesmo pedido por timeout, retry ou execução concorrente, a API devolve a entrega já criada em vez de criar outra.

## Teste

Depois de configurar a variável de ambiente, o Pixel Palace pode testar:

`GET /api/integration/v1/deliveries`

com:

`Authorization: Bearer <ROTA66_INTEGRATION_API_KEY>`

Resposta esperada:

```json
{ "ok": true, "service": "rota66-logistica", "version": "v1" }
```
