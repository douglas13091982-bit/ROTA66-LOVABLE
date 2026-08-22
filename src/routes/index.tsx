import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: () => (
    <div style={{ whiteSpace: 'pre-wrap', padding: '20px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto', lineHeight: '1.6' }}>
      <h1>Plano de Migração de Mapas - ROTA 66 V.2</h1>
      <p>Preciso migrar o sistema de mapas do ROTA 66 V.2 de OpenStreetMap (iframe/estático) + links externos (Waze/Google Maps) para o Mapbox com API integrada. Faça as seguintes alterações:</p>

      <h2>1. DEPENDÊNCIAS</h2>
      <ul>
        <li>Instale mapbox-gl e react-map-gl</li>
        <li>Remova qualquer iframe do OpenStreetMap usado atualmente para exibir mapas</li>
      </ul>

      <h2>2. VARIÁVEIS DE AMBIENTE</h2>
      <ul>
        <li>Crie a variável de ambiente VITE_MAPBOX_ACCESS_TOKEN</li>
        <li>Me avise exatamente onde devo colar meu token do Mapbox (já tenho o token pronto)</li>
      </ul>

      <h2>3. COMPONENTE DE MAPA (substituir todos os pontos abaixo)</h2>
      <ul>
        <li>Portal do cliente: substitua o "mapa simples sem API key" do acompanhamento de pedido por um mapa Mapbox real, mostrando o pin de origem (loja) e destino (cliente), com atualização de posição em tempo real do entregador</li>
        <li>Painel da loja: substitua a visualização de posição do entregador em tempo real por mapa Mapbox com marcador animado</li>
        <li>Super Admin: substitua a "visualização de todas as entregas em tempo real" por um mapa Mapbox com múltiplos marcadores (um por entrega ativa), clusterizados quando houver muitos pontos próximos</li>
      </ul>

      <h2>4. GEOCODIFICAÇÃO</h2>
      <ul>
        <li>Ao cadastrar endereço de loja, endereço de coleta ou endereço de entrega, use a Mapbox Geocoding API para converter endereço em coordenadas (lat/lng) automaticamente</li>
        <li>Mantenha compatibilidade com os campos de endereço já existentes no banco (não quebrar cadastros existentes)</li>
      </ul>

      <h2>5. AUTOCOMPLETE DE ENDEREÇO</h2>
      <ul>
        <li>No cadastro de endereço do cliente final (checkout) e no cadastro de loja, adicione autocomplete de endereço usando Mapbox Search Box / Geocoding API</li>
        <li>Mantenha o fluxo de digitar e selecionar sugestões</li>
      </ul>

      <h2>6. ROTAS, DISTÂNCIA E TARIFAS</h2>
      <ul>
        <li>Substitua o cálculo (se houver) baseado em estimativa simples pela Mapbox Directions API para calcular distância real e tempo estimado entre coleta e entrega</li>
        <li>Use essa distância real no cálculo de tarifa por km (moto/carro/caminhonete) já configurado no Super Admin</li>
        <li>Para a "Agregação de Pedidos por Rota": use a Mapbox Directions API (com múltiplos waypoints) para calcular a rota otimizada entre as paradas agregadas, substituindo a sugestão apenas por raio de proximidade</li>
      </ul>

      <h2>7. BOTÃO "VER ROTA" DO ENTREGADOR (PWA)</h2>
      <ul>
        <li>Mantenha a opção de abrir a rota externamente no Waze ou Google Maps (isso continua útil e não deve ser removido)</li>
        <li>Adicione também a visualização da rota diretamente dentro do app, usando Mapbox Directions, para quem preferir não sair do app</li>
      </ul>

      <h2>8. MARCADORES CUSTOMIZADOS</h2>
      <ul>
        <li>Ícone de moto/carro/caminhonete para a posição do entregador</li>
        <li>Pino verde para coleta, pino vermelho para entrega</li>
        <li>Ícone de loja para o ponto de origem no mapa do Super Admin</li>
      </ul>

      <h2>9. TEMPO REAL</h2>
      <ul>
        <li>Mantenha a atualização via WebSocket já existente, mas agora movendo o marcador do entregador dentro do mapa Mapbox (não recarregando iframe)</li>
      </ul>

      <h2>10. RESPONSIVIDADE</h2>
      <ul>
        <li>Mapa deve funcionar bem tanto no painel web (loja/admin) quanto no PWA do entregador (mobile)</li>
      </ul>

      <h2>11. TESTES</h2>
      <ul>
        <li>Verifique: tela de acompanhamento do cliente, painel da loja, painel Super Admin e PWA do entregador — todas devem carregar o mapa sem erros no console</li>
        <li>Confirme que o link de fallback para Waze/Google Maps continua funcionando</li>
      </ul>

      <p style={{ marginTop: '20px', fontStyle: 'italic' }}>Não altere lógica de negócio (cálculo de frete, status de pedido, fluxo de pagamento), apenas a camada de mapas/geolocalização. Me avise se encontrar algum ponto do sistema que use mapa e eu não tenha mencionado aqui.</p>
    </div>
  ),
  head: () => ({
    meta: [
      { title: "Briefing de Migração Mapbox - ROTA 66" },
      { name: "description", content: "Documentação técnica para a migração do sistema de mapas para Mapbox." }
    ]
  })
});
