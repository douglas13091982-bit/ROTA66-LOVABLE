import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: () => (
    <div className="p-8 max-w-4xl mx-auto whitespace-pre-wrap font-sans">
      <h2 className="text-2xl font-bold mb-4">Solicitação de Auditoria e Correção de Erro em Aplicação</h2>

      <p className="mb-4">
        <strong>Objetivo:</strong> Realizar uma auditoria completa de uma aplicação para identificar e corrigir um erro específico, utilizando múltiplos agentes especializados.
      </p>

      <p className="font-bold mb-2">Instruções:</p>

      <ol className="list-decimal pl-6 mb-4 space-y-4">
        <li>
          <strong>Coleta de Informações:</strong> Antes de criar quaisquer agentes, o agente principal deve interagir com o usuário para coletar informações detalhadas sobre:
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>A natureza exata do erro específico a ser corrigido.</li>
            <li>Detalhes sobre a aplicação em questão (linguagem, framework, arquitetura, ambiente de execução, etc.).</li>
            <li>Quaisquer sintomas ou comportamentos observados relacionados ao erro.</li>
            <li>O impacto esperado da correção.</li>
          </ul>
        </li>

        <li>
          <strong>Criação de Sub-Agentes:</strong> Com base nas informações coletadas, o agente principal deverá criar múltiplos sub-agentes, cada um com responsabilidades específicas para a auditoria e correção. Exemplos de sub-agentes podem incluir:
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li><strong>Agente de Análise de Código:</strong> Responsável por revisar o código-fonte em busca de padrões de erro, vulnerabilidades ou lógica incorreta.</li>
            <li><strong>Agente de Testes de Unidade/Integração:</strong> Focado em criar e executar testes para reproduzir o erro e validar correções.</li>
            <li><strong>Agente de Análise de Desempenho:</strong> Para investigar se o erro está relacionado a gargalos de desempenho ou uso ineficiente de recursos.</li>
            <li><strong>Agente de Análise de Banco de Dados:</strong> Se aplicável, para verificar a integridade e o comportamento dos dados.</li>
            <li><strong>Agente de Verificação de Configuração:</strong> Para garantir que as configurações da aplicação e do ambiente estejam corretas.</li>
            <li><strong>Agente de Documentação e Relatórios:</strong> Para registrar o processo de auditoria, descobertas e a solução implementada.</li>
          </ul>
        </li>

        <li>
          <strong>Execução da Auditoria:</strong> Os sub-agentes deverão executar suas tarefas de forma coordenada, compartilhando informações relevantes entre si e com o agente principal.
        </li>

        <li>
          <strong>Correção e Validação:</strong> Após a identificação da causa raiz do erro, o agente principal, em conjunto com os sub-agentes apropriados, deverá propor e implementar a correção. A validação da correção deve ser realizada através de testes rigorosos.
        </li>

        <li>
          <strong>Relatório Final:</strong> Ao final do processo, um relatório detalhado deve ser gerado, documentando o erro, a metodologia de auditoria, as descobertas, a solução implementada e os resultados da validação.
        </li>
      </ol>

      <p className="font-bold mb-2">Requisitos Técnicos:</p>

      <ul className="list-disc pl-6 mb-8 space-y-1">
        <li>Capacidade de gerenciar e orquestrar múltiplos agentes.</li>
        <li>Habilidade de interpretar e processar informações técnicas sobre aplicações.</li>
        <li>Mecanismos de comunicação e compartilhamento de dados entre agentes.</li>
        <li>Capacidade de gerar e executar testes automatizados.</li>
        <li>Geração de relatórios estruturados.</li>
      </ul>
      
      <div className="border-t pt-4">
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
