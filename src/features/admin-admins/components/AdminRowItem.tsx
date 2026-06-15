import { useMemo, useState } from "react";
import { Save, Trash2 } from "lucide-react";
import { permsFromAdmin, type AdminRow, type PermState } from "../logic/perms";
import { PermissoesGrid } from "./PermissoesGrid";

export function AdminRowItem({
  admin,
  onSalvar,
  onRevogar,
  salvarPending,
  revogarPending,
}: {
  admin: AdminRow;
  onSalvar: (perms: PermState) => void;
  onRevogar: () => void;
  salvarPending: boolean;
  revogarPending: boolean;
}) {
  const initial = useMemo(() => permsFromAdmin(admin), [admin]);
  const [perms, setPerms] = useState<PermState>(initial);
  const [open, setOpen] = useState(false);

  if (admin.is_super) {
    return (
      <div className="flex items-center justify-between border border-white/10 rounded-xl px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-white">{admin.full_name ?? admin.email}</div>
          <div className="text-xs text-white/50">{admin.email}</div>
        </div>
        <span className="text-[10px] uppercase tracking-wide bg-amber-500/20 text-amber-300 px-2 py-1 rounded-full">
          Super admin
        </span>
      </div>
    );
  }

  return (
    <div className="border border-white/10 rounded-xl">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <div className="text-sm font-semibold text-white">{admin.full_name ?? admin.email}</div>
          <div className="text-xs text-white/50">{admin.email}</div>
        </div>
        <span className="text-xs text-white/60">{open ? "Fechar" : "Editar"}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
          <PermissoesGrid perms={perms} onChange={setPerms} />
          <div className="flex gap-2">
            <button
              onClick={() => onSalvar(perms)}
              disabled={salvarPending}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-semibold rounded-lg px-3 py-1.5 text-xs"
            >
              <Save className="h-3.5 w-3.5" />
              {salvarPending ? "Salvando…" : "Salvar"}
            </button>
            <button
              onClick={() => {
                if (confirm(`Revogar acesso de admin de ${admin.email}?`)) onRevogar();
              }}
              disabled={revogarPending}
              className="flex items-center gap-1.5 bg-red-600/80 hover:bg-red-600 disabled:opacity-40 text-white rounded-lg px-3 py-1.5 text-xs"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Revogar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
