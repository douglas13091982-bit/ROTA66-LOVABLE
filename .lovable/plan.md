---
name: admin-config-frete
description: Plano para criação da tela de configurações de frete no painel administrativo.
type: feature
---

# Configurações de Frete - Painel Administrativo

Implementação de uma interface centralizada para gerenciar Google Maps e regras de frete via banco de dados.

## 1. Banco de Dados (Supabase)
Criar a tabela `config_frete` para armazenar as configurações globais:
- `id`: uuid (PK, sempre 1 para singleton)
- `google_maps_key`: text (armazenado como secret se possível, ou em tabela protegida)
- `origem_endereco`: text, `origem_bairro`: text, `origem_cidade`: text, `origem_uf`: text, `origem_cep`: text
- `origem_lat`: double, `origem_lng`: double
- `modo_calculo`: enum ('fixo_km', 'faixas')
- `valor_base`: numeric
- `valor_por_km`: numeric
- `faixas_distancia`: jsonb (lista de {ate_km, valor})
- `distancia_maxima`: numeric
- `frete_gratis_ativo`: boolean
- `frete_gratis_minimo`: numeric
- `status_operacional`: boolean

## 2. Backend (Server Functions)
- `testarConexaoGoogleMaps`: Valida a chave enviada chamando a Geocoding API.
- `salvarConfigFrete`: Recebe os dados, geocodifica o endereço de origem se alterado e salva no banco.
- `getPublicConfigFrete`: Função segura que retorna apenas as regras de cálculo (sem a API Key) para o frontend de checkout.

## 3. Frontend (Admin)
- Nova rota: `/admin/configuracoes-frete`.
- Componente `ConfigFretePage`:
    - **Status Card**: Indicador visual (Operacional / Incompleto).
    - **Google Maps Section**: Input tipo password com botão de teste.
    - **Origem Section**: Formulário com ViaCEP para preenchimento automático.
    - **Regras Section**: Toggle entre "Fixo + KM" e "Faixas", com inputs dinâmicos.
    - **Limites Section**: Distância máxima e Frete grátis.

## 4. Integração no Checkout
- Refatorar `src/lib/frete.functions.ts` para buscar as configurações da tabela `config_frete` em vez de usar valores fixos ou apenas variáveis de ambiente.
