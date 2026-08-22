# Plano: Migração para Mapbox

Este plano detalha a migração do sistema de mapas, geocodificação e rotas do Google Maps para o Mapbox, visando otimização de custos e performance.

## Objetivos
- Substituir a biblioteca Google Maps (JS SDK) pelo Mapbox GL JS no frontend.
- Migrar as funções de geocodificação e cálculo de rotas no backend para as APIs do Mapbox.
- Manter a compatibilidade com as funcionalidades atuais (autocomplete de endereços, cálculo de frete por distância, rastreio em tempo real).

## Etapas de Implementação

1.  **Configuração de Infraestrutura**
    - Criar tabela/campo para armazenar a `mapbox_access_token` nas configurações do sistema.
    - Configurar o novo conector ou segredo para as chamadas de API do Mapbox no backend.

2.  **Migração do Backend (Server Functions)**
    - `src/lib/frete.functions.ts`: Substituir chamadas da Google Routes API pela Mapbox Directions API.
    - `src/lib/geocoding.functions.ts`: Migrar a resolução de endereços para a Mapbox Geocoding API.

3.  **Migração do Frontend (Componentes de Mapa)**
    - `src/components/MapaPedidos.tsx`: Substituir o componente de mapa e marcadores.
    - `src/components/AddressAutocomplete.tsx`: Trocar o Google Places Autocomplete pelo Mapbox Search JS ou Geocoding direto.
    - `src/routes/rastreio/$id.tsx`: Atualizar a visualização do entregador em rota.

4.  **Ajustes de UI e UX**
    - Adaptar o estilo do mapa para o padrão "Premium Light" do sistema (Navy + Red).
    - Garantir que a precisão das rotas e endereços no Brasil seja equivalente à do Google Maps.

## Detalhes Técnicos
- **Biblioteca Frontend:** `mapbox-gl` e `@types/mapbox-gl`.
- **API de Rotas:** Utilizar o perfil `mapbox/driving` para cálculos de frete.
- **Geocodificação:** Utilizar o tipo `address` com filtro de país (BR/MX) para maior precisão.
- **Custos:** O Mapbox oferece um free tier generoso para carregamento de mapas, o que reduzirá os custos operacionais do ROTA 66.
