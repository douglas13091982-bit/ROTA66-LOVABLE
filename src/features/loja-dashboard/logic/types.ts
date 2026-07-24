export type LojaStats = {
  pedidosHoje: number;
  ativos: number;
  faturamentoHoje: number;
  entregadores: number;
};

export type EntregadorItem = {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  online: boolean;
  em_entrega: boolean;
  lat: number | null;
  lng: number | null;
  updated_at: string | null;
};
