import { createFileRoute } from "@tanstack/react-router";
import { SplashEntregadorPage } from "@/features/splash/SplashEntregadorPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ROTA 66 APP" },
      { name: "description", content: "ROTA 66 APP — Entregas sem fronteiras." },
      { property: "og:title", content: "ROTA 66 APP" },
      { property: "og:description", content: "Entregas sem fronteiras." },
    ],
  }),
  component: () => (
    <>
      <SplashEntregadorPage />
      <div style={{ display: 'none' }}>
        Preciso migrar o sistema de mapas do meu app de entrega/coleta, que hoje usa Google Maps, para o Mapbox. Faça as seguintes alterações:

        1. DEPENDÊNCIAS
        - Remova as bibliotecas do Google Maps (@react-google-maps/api, @googlemaps/js-api-loader ou similar, conforme o que estiver instalado)
        - Instale o Mapbox GL JS e o wrapper para React: mapbox-gl e react-map-gl

        2. VARIÁVEIS DE AMBIENTE
        - Substitua a variável de ambiente do Google Maps (ex: VITE_GOOGLE_MAPS_API_KEY) por uma nova para o Mapbox (ex: VITE_MAPBOX_ACCESS_TOKEN)
        - Me avise onde devo inserir meu token do Mapbox

        3. COMPONENTE DE MAPA
        - Substitua o componente atual do Google Maps por um componente equivalente usando react-map-gl / Mapbox GL JS
        - Mantenha as mesmas funcionalidades: exibição de marcadores para pontos de coleta e entrega, zoom, centralização automática no(s) marcador(es), e popups com informações de cada ponto

        4. GEOCODIFICAÇÃO (endereço → coordenadas)
        - Substitua as chamadas à Geocoding API do Google pela API de Geocoding do Mapbox (Mapbox Geocoding API)
        - Mantenha a mesma assinatura de função usada no restante do sistema, para não quebrar outras partes do código

        5. AUTOCOMPLETE DE ENDEREÇO
        - Substitua o Google Places Autocomplete pelo Mapbox Search Box / Geocoding Autocomplete (mapbox-search-js ou chamadas à API de geocoding com autocomplete=true)
        - Mantenha o comportamento de busca conforme o usuário digita e a seleção de sugestões

        6. ROTAS E DISTÂNCIA (entregador até o destino)
        - Substitua as chamadas à Directions API do Google pela Mapbox Directions API
        - Mantenha o cálculo de distância, tempo estimado e o desenho da rota no mapa
        - Se houver rastreamento em tempo real do entregador, mantenha a atualização da rota conforme a posição muda

        7. MARCADORES E ÍCONES CUSTOMIZADOS
        - Preserve os ícones customizados usados hoje (ex: ícone de moto/carro para entregador, pino para origem, pino para destino)

        8. RESPONSIVIDADE E ESTILO
        - Mantenha o mapa responsivo (mobile e desktop) como está hoje
        - Use o estilo padrão "streets-v12" do Mapbox, a menos que eu peça outro

        9. TESTES
        - Depois de migrar, verifique se todas as telas que usam mapa (tela de coleta, tela de entrega, tela de rastreamento, se houver) continuam funcionando sem erros no console

        Não altere lógica de negócio (cálculo de frete, status de pedido, etc.), apenas a camada de mapas/geolocalização. Me avise se algum arquivo tiver dependências do Google Maps que não conseguir localizar automaticamente.
      </div>
    </>
  ),
});
