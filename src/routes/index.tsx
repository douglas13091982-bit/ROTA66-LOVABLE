import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: () => (
    <div style={{ whiteSpace: 'pre-wrap', padding: '20px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto', lineHeight: '1.6' }}>
      Antes de qualquer alteração, faça um reconhecimento completo deste projeto e me devolva um mapa: quais páginas e rotas existem, qual a stack e as bibliotecas usadas, se existe banco de dados e quais tabelas com seus campos, de onde vêm os dados que aparecem em cada tela, e qual o padrão visual adotado. Não altere nada agora. Apenas devolva esse mapa e confirme que está pronto para receber as próximas solicitações.
    </div>
  ),
  head: () => ({
    meta: [
      { title: "Migração Mapbox - ROTA 66" },
      { name: "description", content: "Solicitação de migração para Mapbox." }
    ]
  })
});
