export type AnuncioRow = {
  id: string;
  titulo: string | null;
  link_url: string | null;
  image_data_url: string;
  ativo: boolean;
  ordem: number | null;
  created_at: string;
};

export const ANUNCIO_MAX_BYTES = 800_000;
