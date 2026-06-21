export type LojaPublica = {
  id: string;
  nome: string;
  slug: string;
  telefone: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  logo_url: string | null;
  taxa_entrega_base: number | null;
  categoria: string | null;
  endereco_lat: number | null;
  endereco_lng: number | null;
};

export type ClientesCidadeSearch = { uf?: string };
