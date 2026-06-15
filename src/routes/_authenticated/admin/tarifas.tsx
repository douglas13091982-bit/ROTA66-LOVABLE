import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Trash2, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/tarifas")({
  component: AdminTarifas,
});

const VEICULOS = ["moto", "carro", "caminhonete"] as const;

function AdminTarifas() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    tipo_veiculo: "moto" as (typeof VEICULOS)[number],
    faixa_km_min: "0",
    faixa_km_max: "5",
    valor: "8.00",
    valor_minimo: "8.00",
    valor_por_km: "0",
  });
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-tarifas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tarifas_globais")
        .select("*")
        .order("tipo_veiculo")
        .order("faixa_km_min");
      if (error) throw error;
      return data;
    },
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await (supabase as any).from("tarifas_globais").insert({
      tipo_veiculo: form.tipo_veiculo,
      faixa_km_min: Number(form.faixa_km_min),
      faixa_km_max: Number(form.faixa_km_max),
      valor: Number(form.valor),
      valor_minimo: Number(form.valor_minimo),
      valor_por_km: Number(form.valor_por_km),
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Tarifa criada");
      qc.invalidateQueries({ queryKey: ["admin-tarifas"] });
    }
  };

  const remove = async (id: string) => {
    await supabase.from("tarifas_globais").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-tarifas"] });
    toast.success("Tarifa removida");
  };

  const toggle = async (id: string, ativa: boolean) => {
    await supabase.from("tarifas_globais").update({ ativa: !ativa }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin-tarifas"] });
  };

  return (
    <AdminShell title="Tarifas Globais (lojas sem plano)">
      <form
        onSubmit={handleAdd}
        className="bg-card border border-border rounded-lg p-6 shadow-card mb-6"
      >
        <h2 className="font-display text-2xl tracking-wide mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          Nova tarifa
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Veículo</span>
            <select
              value={form.tipo_veiculo}
              onChange={(e) => setForm({ ...form, tipo_veiculo: e.target.value as any })}
              className="bg-background border border-border rounded-md px-3 py-2.5 focus:outline-none focus:border-primary"
            >
              {VEICULOS.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
            <span className="text-[10px] text-muted-foreground leading-tight">Tipo de transporte do entregador</span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">KM mínimo</span>
            <input type="number" step="0.1" value={form.faixa_km_min}
              onChange={(e) => setForm({ ...form, faixa_km_min: e.target.value })}
              className="bg-background border border-border rounded-md px-3 py-2.5 focus:outline-none focus:border-primary" />
            <span className="text-[10px] text-muted-foreground leading-tight">Início da faixa de distância</span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">KM máximo</span>
            <input type="number" step="0.1" value={form.faixa_km_max}
              onChange={(e) => setForm({ ...form, faixa_km_max: e.target.value })}
              className="bg-background border border-border rounded-md px-3 py-2.5 focus:outline-none focus:border-primary" />
            <span className="text-[10px] text-muted-foreground leading-tight">Fim da faixa de distância</span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Valor base (R$)</span>
            <input type="number" step="0.01" value={form.valor}
              onChange={(e) => setForm({ ...form, valor: e.target.value })}
              className="bg-background border border-border rounded-md px-3 py-2.5 focus:outline-none focus:border-primary" />
            <span className="text-[10px] text-muted-foreground leading-tight">Preço fixo dentro da faixa</span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Mínimo (R$)</span>
            <input type="number" step="0.01" value={form.valor_minimo}
              onChange={(e) => setForm({ ...form, valor_minimo: e.target.value })}
              className="bg-background border border-border rounded-md px-3 py-2.5 focus:outline-none focus:border-primary" />
            <span className="text-[10px] text-muted-foreground leading-tight">Piso da entrega — nunca cobra menos</span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">R$ / km extra</span>
            <input type="number" step="0.01" value={form.valor_por_km}
              onChange={(e) => setForm({ ...form, valor_por_km: e.target.value })}
              className="bg-background border border-border rounded-md px-3 py-2.5 focus:outline-none focus:border-primary" />
            <span className="text-[10px] text-muted-foreground leading-tight">Adicional por km além da faixa</span>
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-transparent select-none">.</span>
            <button
              disabled={saving}
              className="bg-gradient-red shadow-red text-primary-foreground font-bold uppercase tracking-wider rounded-md hover:opacity-90 flex items-center justify-center gap-2 px-4 py-2.5"
            >
              <Plus className="h-4 w-4" />
              {saving ? "..." : "Adicionar"}
            </button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Cálculo: <span className="font-mono">total = max(mínimo, valor_base + km_excedente × R$/km)</span>.
        </p>
      </form>

      {isLoading && <p className="text-muted-foreground">Carregando...</p>}

      <div className="bg-card border border-border rounded-lg shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-background">
            <tr className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <th className="text-left p-4">Veículo</th>
              <th className="text-left p-4">Faixa (km)</th>
              <th className="text-left p-4">Base</th>
              <th className="text-left p-4">Mínimo</th>
              <th className="text-left p-4">R$/km</th>
              <th className="text-left p-4">Status</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {data?.map((t: any) => (
              <tr key={t.id} className="border-t border-border">
                <td className="p-4 font-bold uppercase tracking-wider">{t.tipo_veiculo}</td>
                <td className="p-4">{t.faixa_km_min} – {t.faixa_km_max} km</td>
                <td className="p-4 text-primary font-bold">R$ {Number(t.valor).toFixed(2)}</td>
                <td className="p-4">R$ {Number(t.valor_minimo ?? 0).toFixed(2)}</td>
                <td className="p-4">R$ {Number(t.valor_por_km ?? 0).toFixed(2)}</td>
                <td className="p-4">
                  <button
                    onClick={() => toggle(t.id, t.ativa)}
                    className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-md ${t.ativa ? "bg-green-600/20 text-green-500" : "bg-zinc-600/20 text-zinc-400"}`}
                  >
                    {t.ativa ? "Ativa" : "Inativa"}
                  </button>
                </td>
                <td className="p-4 text-right">
                  <button onClick={() => remove(t.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {data && data.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhuma tarifa cadastrada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
