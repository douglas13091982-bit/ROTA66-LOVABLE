-- Add coletado status
ALTER TYPE public.pedido_status ADD VALUE IF NOT EXISTS 'coletado' BEFORE 'entregue';