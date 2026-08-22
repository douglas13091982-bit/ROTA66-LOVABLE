import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: () => (
    <div className="p-8 max-w-4xl mx-auto whitespace-pre-wrap font-mono text-sm">
      {`Antes de qualquer alteração, faça um reconhecimento completo deste projeto e me devolva um mapa: quais páginas e rotas existem, qual a stack e as bibliotecas usadas, se existe banco de dados e quais tabelas com seus campos, de onde vêm os dados que aparecem em cada tela, e qual o padrão visual adotado. Não altere nada agora. Apenas devolva esse mapa e confirme que está pronto para receber as próximas solicitações.`}
      
      <div className="mt-8 border-t pt-4 font-sans">
        <Link to="/login" className="text-blue-600 hover:underline">Ir para o Sistema ROTA 66</Link>
      </div>
    </div>
  ),
  head: () => ({
    meta: [
      { title: "Solicitação de Auditoria — ROTA 66" },
      { name: "description", content: "Documento de solicitação de auditoria e correção de erro." }
    ]
  })
});
