import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: () => (
    <div style={{ whiteSpace: 'pre-wrap', padding: '20px' }}>
      Preciso migrar o sistema de mapas do ROTA 66 V.2 de OpenStreetMap (iframe/estático) + links externos (Waze/Google Maps) para o Mapbox com API integrada. Faça as seguintes alterações:

1. DEPENDÊNCIAS

- Instale mapbox-gl e react-map-gl

- Remova qualquer iframe do OpenStreetMap usado atualmente para exibir mapas

2. VARIÁVEIS DE AMBIENTE

- Crie a variável de ambiente VITE_MAPBOX_ACCESS_TOKEN

- Me avise exatamente onde devo colar meu token do Mapbox (já tenho o token pronto)

3. COMPONENTE DE MAPA (substituir todos os pontos abaixo)

- Portal do cliente: substitua o "mapa simples sem API key" do acompanhamento de pedido por um mapa Mapbox real, mostrando o pin de origem (loja) e destino (cliente), com atualização de posição em tempo real do entregador

- Painel da loja: substitua a visualização de posição do entregador em tempo real por mapa Mapbox com marcador animado

- Super Admin: substitua a "visualização de todas as entregas em tempo real" por um mapa Mapbox com múltiplos marcadores (um por entrega ativa), clusterizados quando houver muitos pontos próximos

4. GEOCODIFICAÇÃO

- Ao cadastrar endereço de loja, endereço de coleta ou endereço de entrega, use a Mapbox Geocoding API para converter endereço em coordenadas (lat/lng) automaticamente

- Mantenha compatibilidade com os campos de endereço já existentes no banco (não quebrar cadastros existentes)

5. AUTOCOMPLETE DE ENDEREÇO

- No cadastro de endereço do cliente final (checkout) e no cadastro de loja, adicione autocomplete de endereço usando Mapbox Search Box / Geocoding API

- Mantenha o fluxo de digitar e selecionar sugestões

6. ROTAS, DISTÂNCIA E TARIFAS

- Substitua o cálculo (se houver) baseado em estimativa simples pela Mapbox Directions API para calcular distância real e tempo estimado entre coleta e entrega

- Use essa distância real no cálculo de tarifa por km (moto/carro/caminhonete) já configurado no Super Admin

- Para a "Agregação de Pedidos por Rota": use a Mapbox Directions API (com múltiplos waypoints) para calcular a rota otimizada entre as paradas agregadas, substituindo a sugestão apenas por raio de proximidade

7. BOTÃO "VER ROTA" DO ENTREGADOR (PWA)

- Mantenha a opção de abrir a rota externamente no Waze ou Google Maps (isso continua útil e não deve ser removido)

- Adicione também a visualização da rota diretamente dentro do app, usando Mapbox Directions, para quem preferir não sair do app

8. MARCADORES CUSTOMIZADOS

- Ícone de moto/carro/caminhonete para a posição do entregador

- Pino verde para coleta, pino vermelho para entrega

- Ícone de loja para o ponto de origem no mapa do Super Admin

9. TEMPO REAL

- Mantenha a atualização via WebSocket já existente, mas agora movendo o marcador do entregador dentro do mapa Mapbox (não recarregando iframe)

10. RESPONSIVIDADE

- Mapa deve funcionar bem tanto no painel web (loja/admin) quanto no PWA do
    </div>
  )
});
