# Corrigir endereço de entrega sem cálculo automático da taxa

## O que está acontecendo na tela

Ao selecionar um cliente salvo (RAFAEL), o endereço aparece preenchido no campo "Endereço de entrega", mas o sistema mostra o aviso "Selecione o endereço no autocomplete para calcular a taxa automaticamente" e não calcula a taxa.

Motivo confirmado no código: quando o endereço vem de um cliente salvo, o formulário não tem as coordenadas. Ele tenta descobri-las reaproveitando o **autocomplete** (pega a 1ª sugestão do texto completo do endereço). Esse caminho falha com frequência porque:

- o texto salvo é um endereço formatado completo ("R. Frederico Hubner, 37 - América, Joinville - SC, 89204-280"), e o autocomplete costuma não devolver sugestão para essa string inteira;
- se a sugestão não vier, ou vier sem coordenada, cai direto no aviso e a taxa fica só na taxa base.

Ou seja: não é o autocomplete digitado que está quebrado — é a resolução automática do endereço já salvo.

## Correção proposta

1. **Geocodificar o endereço salvo pelo servidor** em vez de depender da primeira sugestão do autocomplete: usar a Geocoding API pelo gateway (mesmo caminho já usado no cálculo de frete) para obter lat/lng do texto do endereço.
2. **Fallback em cadeia**: geocoding do servidor → se falhar, tentativa via autocomplete (comportamento atual) → só então mostrar o aviso.
3. **Salvar as coordenadas do cliente**: quando o endereço é resolvido, guardar lat/lng no cadastro do cliente para que nas próximas vezes o cálculo seja imediato, sem nova chamada ao Maps.
4. **Aviso mais claro e acionável**: em vez do toast genérico, marcar o campo de entrega com um estado "endereço não localizado — reescreva e escolha na lista", para a loja saber exatamente o que fazer.
5. **Não recalcular à toa**: cache/deduplicação por endereço para evitar chamadas repetidas ao Maps (controle de custo).

## Detalhes técnicos

- `src/lib/frete.functions.ts`: adicionar `geocodificarEndereco` (server fn, POST) chamando `maps/api/geocode/json` pelo gateway do conector Google Maps, com validação Zod do texto e tratamento dos 403 de chave (referrer/serviço bloqueado).
- `src/hooks/use-pedido-form.ts` (`aplicarCliente`): trocar `resolveAddressToPlace` pela cadeia geocoding → autocomplete; setar `entregaCoords` e sinalizar erro de resolução em estado, não só toast.
- `src/components/PedidoForm.tsx`: exibir o alerta inline no campo de entrega quando o endereço não tiver coordenadas.
- Persistência de lat/lng do cliente: reutilizar as colunas de coordenadas do cadastro de clientes se já existirem; caso não existam, incluir migração adicionando `lat`/`lng` na tabela de clientes com os GRANTs e políticas já vigentes da tabela.
- Sem mudança na regra de frete: `frete_global + taxa_por_pedido_loja` para o cliente, entregador recebe `frete_global`.
