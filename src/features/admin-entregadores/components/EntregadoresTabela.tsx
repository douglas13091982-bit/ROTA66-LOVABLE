import { Ban, Bike, Car, Check, Phone, Trash2 } from "lucide-react";
import { AvatarImg } from "@/components/AvatarImg";
import { onlyDigits } from "../logic/filters";
import { STATUS_LABEL, type EntregadorRow, type StatusEntregador } from "../logic/types";

export function EntregadoresTabela({
  list,
  isLoading,
  onSetStatus,
  onRemove,
}: {
  list: EntregadorRow[];
  isLoading: boolean;
  onSetStatus: (id: string, status: StatusEntregador) => void;
  onRemove: (id: string, nome: string) => void;
}) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-background/50 text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2 font-bold">Entregador</th>
              <th className="text-left px-3 py-2 font-bold">Telefone</th>
              <th className="text-left px-3 py-2 font-bold">Veículo</th>
              <th className="text-left px-3 py-2 font-bold">Status</th>
              <th className="text-right px-3 py-2 font-bold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => {
              const st = STATUS_LABEL[p.status] ?? STATUS_LABEL.pendente;
              return (
                <tr key={p.id} className="border-t border-border hover:bg-background/40">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-gradient-red shadow-red flex items-center justify-center shrink-0 overflow-hidden">
                        {p.avatar_url ? (
                          <AvatarImg
                            src={p.avatar_url}
                            alt={p.full_name ?? "Entregador"}
                            className="h-full w-full object-cover"
                            fallback={<Bike className="h-4 w-4 text-primary-foreground" />}
                          />
                        ) : (
                          <Bike className="h-4 w-4 text-primary-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold truncate">{p.full_name ?? "Sem nome"}</div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {p.email ?? "—"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                    {p.phone ? (
                      <a
                        href={`tel:${onlyDigits(p.phone)}`}
                        className="hover:text-foreground inline-flex items-center gap-1"
                      >
                        <Phone className="h-3 w-3" /> {p.phone}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md ${
                        p.tipo_veiculo === "carro"
                          ? "bg-blue-600/20 text-blue-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {p.tipo_veiculo === "carro" ? (
                        <Car className="h-3 w-3" />
                      ) : (
                        <Bike className="h-3 w-3" />
                      )}
                      {p.tipo_veiculo === "carro" ? "Carro" : "Moto"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md ${st.cls}`}
                    >
                      {st.label}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onSetStatus(p.id, "aprovado")}
                        disabled={p.status === "aprovado"}
                        title="Aprovar"
                        className="p-1.5 rounded bg-green-600/20 text-green-500 hover:bg-green-600/30 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onSetStatus(p.id, "bloqueado")}
                        disabled={p.status === "bloqueado"}
                        title="Bloquear"
                        className="p-1.5 rounded bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Ban className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onRemove(p.id, p.full_name ?? "entregador")}
                        title="Excluir"
                        className="p-1.5 rounded bg-red-600/20 text-red-400 hover:bg-red-600/30"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {list.length === 0 && !isLoading && (
              <tr>
                <td colSpan={5} className="text-center text-muted-foreground py-8">
                  Nenhum entregador no filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
