import { useState } from "react";
import { Phone, Check, Ban } from "lucide-react";
import { toast } from "sonner";
import { AvatarImg } from "@/components/AvatarImg";
import { STATUS_LABEL, type SaqueRow } from "../logic/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SaquesTable({
  list,
  isLoading,
  onMarcarPago,
  onRejeitar,
}: {
  list: SaqueRow[];
  isLoading: boolean;
  onMarcarPago: (id: string) => void;
  onRejeitar: (id: string, motivo: string) => void;
}) {
  const [rejeitando, setRejeitando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-background/50 text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2 font-bold">Entregador</th>
              <th className="text-left px-3 py-2 font-bold">Chave PIX</th>
              <th className="text-left px-3 py-2 font-bold">Valor</th>
              <th className="text-left px-3 py-2 font-bold">Status</th>
              <th className="text-left px-3 py-2 font-bold">Solicitado em</th>
              <th className="text-right px-3 py-2 font-bold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {list.map((s) => {
              const st = STATUS_LABEL[s.status] ?? STATUS_LABEL.pendente;
              return (
                <tr key={s.id} className="border-t border-border hover:bg-background/40">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                        <AvatarImg
                          src={null}
                          alt={s.entregador_nome ?? "Entregador"}
                          className="h-full w-full object-cover"
                          fallback={<span className="text-xs font-bold text-white/70">{(s.entregador_nome ?? "?").slice(0, 1).toUpperCase()}</span>}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold truncate">{s.entregador_nome ?? "Sem nome"}</div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {s.entregador_phone ? (
                            <a href={`tel:${s.entregador_phone.replace(/\D/g, "")}`} className="hover:text-foreground inline-flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {s.entregador_phone}
                            </a>
                          ) : (
                            "—"
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 font-medium whitespace-nowrap">{s.pix_chave}</td>
                  <td className="px-3 py-2 font-bold whitespace-nowrap">
                    R$ {s.valor.toFixed(2)}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md ${st.cls}`}>
                      {st.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                    {formatDate(s.solicitado_em)}
                  </td>
                  <td className="px-3 py-2">
                    {s.status === "pendente" && (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onMarcarPago(s.id)}
                          title="Marcar como pago"
                          className="p-1.5 rounded bg-green-600/20 text-green-500 hover:bg-green-600/30"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setRejeitando(s.id)}
                          title="Rejeitar saque"
                          className="p-1.5 rounded bg-red-600/20 text-red-400 hover:bg-red-600/30"
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                    {s.status === "pago" && (
                      <span className="text-[10px] text-muted-foreground">Pago em {formatDate(s.pago_em!)}</span>
                    )}
                    {s.status === "rejeitado" && (
                      <span className="text-[10px] text-muted-foreground" title={s.motivo_rejeicao ?? undefined}>
                        Rejeitado
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {list.length === 0 && !isLoading && (
              <tr>
                <td colSpan={6} className="text-center text-muted-foreground py-8">
                  Nenhum saque no filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {rejeitando && (
        <div className="p-4 border-t border-border bg-background/50">
          <p className="text-sm font-bold mb-2">Motivo da rejeição</p>
          <input
            type="text"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex: chave PIX inválida"
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm mb-3"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                setRejeitando(null);
                setMotivo("");
              }}
              className="px-3 py-1.5 text-xs font-bold uppercase rounded-md border border-border hover:bg-background"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                if (!motivo.trim()) return toast.error("Informe o motivo");
                onRejeitar(rejeitando, motivo);
                setRejeitando(null);
                setMotivo("");
              }}
              className="px-3 py-1.5 text-xs font-bold uppercase rounded-md bg-red-600 text-white hover:bg-red-700"
            >
              Rejeitar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
