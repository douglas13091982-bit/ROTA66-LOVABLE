Analise todo o projeto de forma completa antes de realizar qualquer alteração e execute uma refatoração profunda e estruturada em toda a base de código.

Seu objetivo é melhorar a qualidade interna do sistema sem alterar funcionalidades ou comportamento visível da aplicação.

A refatoração deve tornar o código mais limpo, organizado, escalável, padronizado e fácil de manter.

━━━━━━━━━━━━━━━━━━━

ESCOPO DA REFATORAÇÃO

━━━━━━━━━━━━━━━━━━━

Realize uma revisão completa de:

- Estrutura de pastas e organização do projeto

- Componentes e sua reutilização

- Hooks customizados

- Lógica de estado (local e global)

- Services e camadas de API

- Integração com Supabase

- Queries e manipulação de dados

- Fluxos de autenticação

- Rotas e estrutura de navegação

- Tipagem (TypeScript se aplicável)

- Lógica duplicada ou redundante

- Funções grandes ou mal divididas

- Acoplamento excessivo entre componentes

- Código difícil de manter ou entender

- Imports desorganizados

- Regras de negócio misturadas com UI

- Manipulação de efeitos colaterais

━━━━━━━━━━━━━━━━━━━

OBJETIVOS PRINCIPAIS

━━━━━━━━━━━━━━━━━━━

- Reduzir duplicação de código

- Melhorar legibilidade e clareza

- Melhorar separação de responsabilidades

- Melhorar reutilização de componentes

- Melhorar organização da arquitetura

- Criar padrões consistentes no projeto

- Facilitar manutenção futura

- Reduzir complexidade desnecessária

- Melhorar escalabilidade do sistema

- Tornar o código mais previsível e limpo

━━━━━━━━━━━━━━━━━━━

DIRETRIZES DE REFACTORING

━━━━━━━━━━━━━━━━━━━

- NÃO alterar funcionalidades existentes

- NÃO mudar comportamento da interface

- NÃO modificar design visual sem necessidade

- NÃO quebrar fluxos já existentes

Priorize sempre:

- Separação de responsabilidades (UI / lógica / dados)

- Componentização inteligente

- Reutilização de código

- Funções pequenas e bem definidas

- Nomeação clara e consistente

- Eliminação de código duplicado

- Organização por domínio ou feature

- Redução de complexidade por arquivo

- Padronização de padrões de código

━━━━━━━━━━━━━━━━━━━

PADRÕES DE QUALIDADE

━━━━━━━━━━━━━━━━━━━

- Código limpo e legível

- Arquitetura consistente em todo projeto

- Componentes desacoplados

- Hooks reutilizáveis e bem definidos

- Serviços centralizados para API

- Separação clara entre frontend e lógica de negócio

- Estrutura previsível e escalável

━━━━━━━━━━━━━━━━━━━

PROCESSO OBRIGATÓRIO

━━━━━━━━━━━━━━━━━━━

1. Analise toda a base de código

2. Identifique pontos de melhoria estrutural

3. Liste problemas de organização e duplicação

4. Priorize melhorias por impacto

5. Execute refatorações de forma segura

6. Garanta que nada do sistema quebre

7. Valide consistência após mudanças

━━━━━━━━━━━━━━━━━━━

RESULTADO ESPERADO

━━━━━━━━━━━━━━━━━━━

Ao final da refatoração, o projeto deve estar:

- Muito mais organizado

- Fácil de entender e manter

- Escalável para novas funcionalidades

- Livre de duplicações desnecessárias

- Com arquitetura mais profissional

- Com padrões consistentes

- Mais limpo e previsível

- Sem alterar nenhuma funcionalidade existente