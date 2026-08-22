import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: () => (
    <div style={{ whiteSpace: 'pre-wrap', padding: '20px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto', lineHeight: '1.6' }}>
      Load the security issues from the scan results and fix the selected issues.
    </div>
  ),
  head: () => ({
    meta: [
      { title: "Migração Mapbox - ROTA 66" },
      { name: "description", content: "Solicitação de migração para Mapbox." }
    ]
  })
});
