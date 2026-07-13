export type StatusEntregador = "pendente" | "aprovado" | "bloqueado";
export type StatusFilter = "todas" | StatusEntregador;

export type EntregadorRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  tipo_veiculo: string | null;
  status: StatusEntregador;
  created_at: string | null;
  [key: string]: any;
};

export const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pendente: { label: "Pendente", cls: "bg-amber-600/20 text-amber-400" },
  aprovado: { label: "Aprovado", cls: "bg-green-600/20 text-green-500" },
  bloqueado: { label: "Bloqueado", cls: "bg-red-600/20 text-red-400" },
};
