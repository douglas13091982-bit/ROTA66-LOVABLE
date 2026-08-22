# Plano de Migração de Mapas para Mapbox - ROTA 66 V.2

Este plano detalha a migração completa do sistema de mapas (OSM/Google Maps) para o **Mapbox**, abrangendo desde o cálculo de frete até a visualização em tempo real no app do entregador e painéis administrativos.

## 1. Infraestrutura e Ambiente
- **Dependências**: Confirmar a instalação de `mapbox-gl` e `react-map-gl` (já presentes no `package.json`).
- **Variáveis de Ambiente**: Utilizar `VITE_MAPBOX_ACCESS_TOKEN` para o frontend. O token deve ser inserido nas configurações administrativas do sistema ou no arquivo `.env`.
- **Banco de Dados**: Garantir que a tabela `config_frete` suporte os campos `provedor_mapa` (enum: 'google', 'mapbox') e `mapbox_access_token`.

## 2. Serviços de Mapa (Backend / Server Functions)
- **Geocodificação**:
    - Atualizar `geocodificarEndereco` e `reverseGeocode` em `src/lib/frete.functions.ts` para utilizar a Mapbox Geocoding API.
    - Manter compatibilidade com os campos `lat`/`lng` existentes.
- **Cálculo de Rotas e Distâncias**:
    - Migrar o cálculo de frete real (dirigindo) para a Mapbox Directions API em `src/lib/mapbox.functions.ts`.
    - Implementar otimização de múltiplos waypoints para o sistema de "Agregação de Pedidos por Rota".
- **Autocomplete de Endereço**:
    - Padronizar `src/lib/address-autocomplete.functions.ts` para priorizar Mapbox Search Box / Geocoding quando configurado.

## 3. Componentes de Interface (UI)
- **Portal do Cliente (Rastreio)**:
    - Adicionar mapa Mapbox em `src/features/rastreio/RastreioPage.tsx`.
    - Exibir pin de origem (loja), destino (cliente) e posição do entregador com atualização via WebSocket (Supabase Realtime).
- **Painel Administrativo e da Loja**:
    - Finalizar a integração do Mapbox em `src/components/EntregadoresMapaTempoReal.tsx` (via `EntregadoresMapaMapbox.tsx`).
    - Implementar **Clustering** de marcadores no mapa do Super Admin para lidar com múltiplos entregadores.
    - Adicionar marcadores animados para o movimento dos entregadores.
- **App do Entregador (PWA)**:
    - Adicionar visualização de rota interna no `PedidoCard` e `ColetaConsolidadaCard` usando Mapbox Directions.
    - Manter links externos ("Ver Rota") para Waze e Google Maps como alternativa.
- **Padronização de Marcadores**:
    - **Entregador**: Ícone de veículo (moto/carro) baseado no tipo cadastrado.
    - **Coleta**: Pino verde.
    - **Entrega**: Pino vermelho.
    - **Loja**: Ícone de estabelecimento.

## 4. Testes e Validação
- Validar o cálculo de tarifa por KM baseado na distância real do Mapbox.
- Testar a atualização de posição sem recarregamento de página em todos os perfis.
- Verificar a responsividade dos mapas em dispositivos mobile (PWA).

## Detalhes Técnicos
- Utilização de `mapbox-gl` puro para os mapas administrativos (maior controle de clustering).
- Utilização de `react-map-gl` para componentes de interface reativos.
- Gateway no servidor para chamadas de API do Mapbox, evitando exposição desnecessária de tokens e respeitando limites de cota.
