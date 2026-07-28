export type VinculoStatus = "pendente" | "aceito" | "recusado";

export type Vinculo = {
  id: string;
  ativo: boolean;
  status: VinculoStatus;
  entregador_id: string;
  profile: {
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
  };
};
