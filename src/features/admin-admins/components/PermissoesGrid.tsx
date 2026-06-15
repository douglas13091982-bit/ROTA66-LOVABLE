import { AREAS, type PermState } from "../logic/perms";

export function PermissoesGrid({
  perms,
  onChange,
}: {
  perms: PermState;
  onChange: (next: PermState) => void;
}) {
  const toggleEnabled = (key: string, enabled: boolean) =>
    onChange({ ...perms, [key]: { enabled, can_write: enabled ? perms[key].can_write : false } });

  const toggleWrite = (key: string, can_write: boolean) =>
    onChange({ ...perms, [key]: { ...perms[key], can_write } });

  return (
    <div className="border border-white/10 rounded-xl divide-y divide-white/5">
      {AREAS.map((a) => {
        const v = perms[a.key];
        return (
          <div key={a.key} className="flex items-center gap-3 px-4 py-2.5">
            <label className="flex items-center gap-2 flex-1 cursor-pointer">
              <input
                type="checkbox"
                checked={v.enabled}
                onChange={(e) => toggleEnabled(a.key, e.target.checked)}
              />
              <span className="text-sm text-white">{a.label}</span>
            </label>
            <label className={`flex items-center gap-1.5 text-xs ${v.enabled ? "text-white/80" : "text-white/30"}`}>
              <input
                type="checkbox"
                disabled={!v.enabled}
                checked={v.can_write}
                onChange={(e) => toggleWrite(a.key, e.target.checked)}
              />
              Pode editar
            </label>
          </div>
        );
      })}
    </div>
  );
}
