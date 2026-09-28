import { Link } from "@tanstack/react-router";
import { Bike, MapPin, ArrowRight } from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { useAdminEntregadores } from "@/features/admin-entregadores/hooks/use-admin-entregadores";

export function DashboardPage() {
  const { data = [], isLoading } = useAdminEntregadores();
  const pendentes = data.filter((e) => e.status === "pendente").length;
  const aprovados = data.filter((e) => e.status === "aprovado").length;

  return (
    <AdminShell title="Visão geral">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-2">ROTA 66 · LOGÍSTICA</p>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight">Central de entregadores</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          O ROTA 66 é o núcleo de logística. Cadastros, disponibilidade e operação dos entregadores ficam aqui.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Metric icon={<Bike className="h-5 w-5" />} label="Entregadores cadastrados" value={isLoading ? "—" : data.length} />
        <Metric icon={<Bike className="h-5 w-5" />} label="Aguardando aprovação" value={isLoading ? "—" : pendentes} />
        <Metric icon={<Bike className="h-5 w-5" />} label="Aprovados" value={isLoading ? "—" : aprovados} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Link to="/admin/entregadores" className="group rounded-2xl border border-border bg-card p-6 hover:border-primary/40 transition">
          <Bike className="h-7 w-7 text-primary mb-4" />
          <h2 className="text-lg font-bold">Gerenciar entregadores</h2>
          <p className="text-sm text-muted-foreground mt-1">Aprovação, documentos, status e cadastro.</p>
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary mt-5">Abrir <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" /></span>
        </Link>
        <Link to="/admin/mapa" className="group rounded-2xl border border-border bg-card p-6 hover:border-primary/40 transition">
          <MapPin className="h-7 w-7 text-primary mb-4" />
          <h2 className="text-lg font-bold">Mapa de entregadores</h2>
          <p className="text-sm text-muted-foreground mt-1">Acompanhe a operação logística e a disponibilidade.</p>
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary mt-5">Abrir mapa <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" /></span>
        </Link>
      </div>
    </AdminShell>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center mb-4">{icon}</div>
      <div className="text-2xl font-black">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
