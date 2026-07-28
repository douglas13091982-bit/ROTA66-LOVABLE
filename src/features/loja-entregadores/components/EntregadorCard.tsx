import { Bike, Trash2 } from "lucide-react";
import { AvatarImg } from "@/components/AvatarImg";
import type { Vinculo } from "../logic/types";

export function EntregadorCard({
  v,
  onToggleAtivo,
  onRemove,
}: {
  v: Vinculo;
  onToggleAtivo: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-5 shadow-card">
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`h-12 w-12 rounded-full flex items-center justify-center overflow-hidden ${
            v.ativo ? "bg-gradient-red shadow-red" : "bg-background"
          }`}
        >
          {v.profile?.avatar_url ? (
            <AvatarImg
              src={v.profile.avatar_url}
              alt={v.profile.full_name ?? "Entregador"}
              className="h-full w-full object-cover"
              fallback={
                <Bike
                  className={`h-6 w-6 ${
                    v.ativo ? "text-primary-foreground" : "text-muted-foreground"
                  }`}
                />
              }
            />
          ) : (
            <Bike
              className={`h-6 w-6 ${
                v.ativo ? "text-primary-foreground" : "text-muted-foreground"
              }`}
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold truncate">{v.profile?.full_name ?? "Sem nome"}</div>
          <div className="text-xs text-muted-foreground">{v.profile?.phone ?? "—"}</div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        {v.status === "aceito" ? (
          <button
            onClick={onToggleAtivo}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md ${
              v.ativo
                ? "bg-green-600/20 text-green-500"
                : "bg-zinc-600/20 text-zinc-400"
            }`}
          >
            {v.ativo ? "Ativo" : "Inativo"}
          </button>
        ) : (
          <span
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md ${
              v.status === "pendente"
                ? "bg-amber-600/20 text-amber-500"
                : "bg-red-600/20 text-red-400"
            }`}
          >
            {v.status === "pendente" ? "Aguardando aceite" : "Recusado"}
          </span>
        )}
        <button
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive p-2"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
