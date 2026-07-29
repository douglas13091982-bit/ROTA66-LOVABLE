import { ShieldCheck, Building2, UserCog, Globe } from "lucide-react";

const MAP: Record<string, { label: string; cls: string; Icon: any }> = {
  super_admin: {
    label: "Criada pelo Super Admin",
    cls: "bg-violet-500/15 border-violet-500/30 text-violet-300",
    Icon: ShieldCheck,
  },
  franqueado: {
    label: "Criada pelo Franqueado",
    cls: "bg-sky-500/15 border-sky-500/30 text-sky-300",
    Icon: Building2,
  },
  colaborador: {
    label: "Criada por Colaborador",
    cls: "bg-amber-500/15 border-amber-500/30 text-amber-300",
    Icon: UserCog,
  },
  auto: {
    label: "Auto-cadastro",
    cls: "bg-muted/40 border-border text-muted-foreground",
    Icon: Globe,
  },
};

export function CriadoPorBadge({
  tipo,
  nome,
}: {
  tipo?: string | null;
  nome?: string | null;
}) {
  const cfg = MAP[tipo ?? "auto"] ?? MAP.auto;
  const { Icon } = cfg;

  return (
    <div
      className={`mb-3 inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] ${cfg.cls}`}
    >
      <Icon className="h-3 w-3" />
      <span>
        {cfg.label}
        {nome && tipo && tipo !== "auto" && (
          <span className="opacity-80"> · {nome}</span>
        )}
      </span>
    </div>
  );
}
