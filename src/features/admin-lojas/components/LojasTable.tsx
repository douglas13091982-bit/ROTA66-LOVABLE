import { Store, Check, Ban, Trash2 } from "lucide-react";
import { statusOf } from "../logic/constants";

interface Props {
  lojas: any[];
  isLoading: boolean;
  onSetStatus: (id: string, status: "aprovado" | "bloqueado") => void;
  onRemove: (id: string, nome: string) => void;
}

export function LojasTable({ lojas, isLoading, onSetStatus, onRemove }: Props) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-background/50 text-[10px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2 font-bold">Loja</th>
              <th className="text-left px-3 py-2 font-bold">CNPJ</th>
              <th className="text-left px-3 py-2 font-bold">Cidade</th>
              <th className="text-left px-3 py-2 font-bold">Telefone</th>
              <th className="text-left px-3 py-2 font-bold">Status</th>
              <th className="text-right px-3 py-2 font-bold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {lojas.map((l) => {
              const st = statusOf(l.status);
              return (
                <tr key={l.id} className="border-t border-border hover:bg-background/40">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-8 w-8 rounded-md bg-gradient-red shadow-red flex items-center justify-center shrink-0">
                        <Store className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold truncate">{l.nome}</div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          /{l.slug}
                        </div>
                        <CriadoPorBadge
                          tipo={(l as any).criado_por_tipo}
                          nome={(l as any).criado_por_nome}
                        />
                      </div>

                    </div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                    {l.cnpj ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                    {l.cidade ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                    {l.telefone ?? "—"}
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
                        onClick={() => onSetStatus(l.id, "aprovado")}
                        disabled={l.status === "aprovado"}
                        title="Aprovar"
                        className="p-1.5 rounded bg-green-600/20 text-green-500 hover:bg-green-600/30 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onSetStatus(l.id, "bloqueado")}
                        disabled={l.status === "bloqueado"}
                        title="Bloquear"
                        className="p-1.5 rounded bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Ban className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onRemove(l.id, l.nome)}
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
            {lojas.length === 0 && !isLoading && (
              <tr>
                <td colSpan={6} className="text-center text-muted-foreground py-8">
                  Nenhuma loja encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
