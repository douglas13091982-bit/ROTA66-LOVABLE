export type StatusSaque = "pendente" | "pago" | "rejeitado";

export type SaqueRow = {
  id: string;
  entregador_id: string;
  entregador_nome: string | null;
  entregador_phone: string | null;
  valor: number;
  pix_chave: string;
  status: StatusSaque;
  solicitado_em: string;
  pago_em: string | null;
  rejeitado_em: string | null;
  motivo_rejeicao: string | null;
  comprovante_url: string | null;
  observacoes_admin: string | null;
};

export type SaqueFilter = "pendentes" | "pagos" | "rejeitados" | "todos";

export const STATUS_LABEL: Record<StatusSaque, { label: string; cls: string }> = {
  pendente: { label: "Pendente", cls: "bg-amber-500/20 text-amber-400" },
  pago: { label: "Pago", cls: "bg-green-500/20 text-green-400" },
  rejeitado: { label: "Rejeitado", cls: "bg-red-500/20 text-red-400" },
};
