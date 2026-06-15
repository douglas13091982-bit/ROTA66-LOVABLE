export type Vinculo = {
  id: string;
  ativo: boolean;
  entregador_id: string;
  profile: {
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
  };
};
