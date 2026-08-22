import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: () => (
    <div style={{ whiteSpace: 'pre-wrap', padding: '20px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto', lineHeight: '1.6' }}>
      Analise completamente todo o projeto e identifique TODOS os bugs, erros, falhas, comportamentos inesperados e possíveis problemas existentes na aplicação.

Seu objetivo é realizar uma auditoria técnica profunda no sistema inteiro, corrigindo problemas de lógica, frontend, backend, integração, renderização, estado, banco de dados, responsividade e performance.

Antes de modificar qualquer coisa:

- Analise toda a estrutura do projeto

- Analise rotas

- Analise componentes

- Analise hooks

- Analise estados globais

- Analise integrações

- Analise Supabase

- Analise APIs

- Analise banco de dados

- Analise autenticação

- Analise permissões

- Analise carregamentos

- Analise console errors

- Analise warnings

- Analise logs

- Analise comportamento da interface

- Analise responsividade

- Analise possíveis falhas silenciosas

- Analise segurança básica

- Analise fluxos completos do sistema

Identifique e corrija:

- Bugs visuais

- Bugs de navegação

- Erros de console

- Warnings

- Loops infinitos

- Problemas de renderização

- Re-renderizações desnecessárias

- Falhas de autenticação

- Problemas de sessão

- Problemas de permissões

- Problemas de loading

- Problemas de estado

- Problemas de sincronização

- Problemas de responsividade

- Problemas de formulários

- Problemas de validação

- Problemas em chamadas API

- Problemas em queries Supabase

- Problemas de realtime

- Problemas de cache

- Problemas de tipagem

- Problemas de imports

- Problemas de dependências

- Problemas de performance

- Problemas de UX

- Problemas mobile

- Problemas de acessibilidade

- Memory leaks

- Requests duplicados

- Condições de corrida

- Falhas silenciosas

- Tratamento incorreto de erros

- Quebras em edge cases

Verifique especialmente:

- Fluxos de login/logout

- Persistência de sessão

- Proteção de rotas

- Navegação entre páginas

- CRUDs completos

- Uploads

- Modais

- Estados assíncronos

- Atualizações em tempo real

- Compatibilidade mobile

- Responsividade geral

- Componentes reutilizáveis

- Integrações externas

- Webhooks

- Fluxos críticos do sistema

Durante a análise:

1. Liste os problemas encontrados

2. Explique a causa de cada problema

3. Explique o impacto no sistema

4. Corrija utilizando boas práticas modernas

5. Garanta que a correção não quebre funcionalidades existentes

Regras importantes:

- NÃO remover funcionalidades sem necessidade

- NÃO alterar design sem motivo

- NÃO criar soluções temporárias ou gambiarra

- Sempre aplicar soluções profissionais

- Priorizar estabilidade, segurança e confiabilidade

- Garantir código limpo e sustentável

- Melhorar tratamento de erros em toda aplicação

- Validar edge cases importantes

- Garantir compatibilidade mobile e desktop

Após finalizar:

- Faça uma nova varredura completa

- Verifique se ainda existem erros

- Verifique possíveis regressões

- Garanta estabilidade geral do sistema

O resultado final deve deixar a aplicação:

- Estável

- Confiável

- Sem erros visíveis

- Sem warnings desnecessários

- Sem bugs críticos

- Fluida

- Responsiva

- Profissional

- Pronta para produção
    </div>
  ),
  head: () => ({
    meta: [
      { title: "Migração Mapbox - ROTA 66" },
      { name: "description", content: "Solicitação de migração para Mapbox." }
    ]
  })
});
