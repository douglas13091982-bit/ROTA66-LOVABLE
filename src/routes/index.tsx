import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: () => (
    <div style={{ whiteSpace: 'pre-wrap', padding: '20px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto', lineHeight: '1.6' }}>
      Preciso migrar o sistema de mapas do ROTA 66 V.2 de OpenStreetMap (iframe/estático) + links externos (Waze/Google Maps) para o Mapbox com API integrada.
    </div>
  ),
  head: () => ({
    meta: [
      { title: "Migração Mapbox - ROTA 66" },
      { name: "description", content: "Solicitação de migração para Mapbox." }
    ]
  })
});
