CREATE TYPE public.loja_categoria AS ENUM (
  'restaurante','mercado','farmacia','auto_pecas','moto_pecas','lanchonete','sorveteria',
  'pizzaria','bebidas','doceria','pet_shop','acougue','padaria','hortifruti',
  'roupas','calcados','material_construcao','eletronicos','floricultura',
  'livraria','conveniencia','outros'
);

ALTER TABLE public.lojas ADD COLUMN categoria public.loja_categoria;