INSERT INTO public.contratos (titulo, conteudo, versao, ativo)
VALUES (
  'Termos de Uso – Lojas',
  '# Termos de Uso – Lojas Parceiras

Versão 1 — vigente a partir desta data

Ao se cadastrar e utilizar a plataforma como Loja Parceira, você ("Loja") concorda integralmente com os termos abaixo. Leia com atenção antes de aceitar.

## 1. Objeto
A plataforma oferece à Loja um sistema digital para gestão de pedidos, intermediação com entregadores e atendimento a clientes, incluindo emissão de cobranças, roteirização e ferramentas de comunicação.

## 2. Cadastro e veracidade
- A Loja se compromete a fornecer dados verdadeiros (razão social, CNPJ, endereço, telefone, responsável) e mantê-los atualizados.
- O CNPJ informado deve ser válido e ativo.
- A Loja é responsável por todas as ações realizadas com seu login.

## 3. Pedidos e entregas
- A Loja é responsável pelo conteúdo dos pedidos, pelas mercadorias entregues, pela qualidade, conformidade e pela emissão de nota fiscal quando aplicável.
- Cabe à Loja informar corretamente endereço de coleta, valores e formas de pagamento aceitas.
- O entregador atua como prestador autônomo, mediado pela plataforma; eventuais sinistros durante o transporte devem ser comunicados imediatamente.

## 4. Taxas e pagamentos
- A Loja concorda em pagar as taxas vigentes (taxa por pedido entregue ou mensalidade do plano contratado), conforme cobranças geradas no painel financeiro.
- O não pagamento de cobranças em aberto poderá suspender o acesso à plataforma até regularização.
- Reajustes de valores serão informados com antecedência mínima de 15 dias.

## 5. Conduta
A Loja não poderá utilizar a plataforma para:
- Comercializar produtos ilegais, falsificados ou de procedência duvidosa;
- Praticar discriminação contra clientes ou entregadores;
- Tentar fraudar, manipular ou explorar falhas do sistema.

## 6. Dados e privacidade
- A Loja autoriza o tratamento dos dados informados para operar a plataforma, gerar cobranças e cumprir obrigações legais.
- Os dados dos clientes finais coletados em pedidos devem ser tratados pela Loja conforme a LGPD.

## 7. Encerramento
- A Loja pode encerrar sua conta a qualquer momento, quitadas as obrigações pendentes.
- A plataforma pode suspender ou encerrar contas em caso de descumprimento destes termos, fraude ou inadimplência.

## 8. Disposições gerais
- Estes termos podem ser atualizados; novas versões exigirão novo aceite no próximo acesso.
- Eventuais disputas serão solucionadas pelo foro do domicílio da empresa operadora da plataforma.

Ao marcar "Li e aceito os Termos de Uso" no cadastro, a Loja declara haver lido, compreendido e concordado com todas as cláusulas acima.',
  1,
  true
)
ON CONFLICT (versao) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  conteudo = EXCLUDED.conteudo,
  ativo = true,
  updated_at = now();