export type BrandingRow = {
  id: string;
  logo_data_url: string | null;
  nome_sistema: string | null;
  suporte_whatsapp: string | null;
  suporte_horario: string | null;
  updated_at: string;
};

export const BRANDING_MAX_BYTES = 500_000;
