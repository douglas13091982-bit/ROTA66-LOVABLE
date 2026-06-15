export type AdminStats = {
  lojas: number;
  entregadores: number;
  pedidos: number;
  gmv: number;
};

export type AdminEntregadorItem = {
  id: string;
  full_name: string | null;
  phone: string | null;
  online: boolean;
  lat: number | null;
  lng: number | null;
  updated_at: string | null;
};
