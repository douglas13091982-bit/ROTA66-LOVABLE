import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { Route as Route2, Clock, MapPinned, Users, Save, LayoutGrid, Car } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/roteirizacao")({
  component: AdminRoteirizacao,
});

function AdminRoteirizacao() {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    max_detour_minutes: "15",
    max_detour_km: "3",
    max_paradas_por_rota: "6",
    max_paradas_por_rota_carro: "12",
    entregador_online_ttl_min: "10",
    raio_agrupamento_preparo_km: "1.5",
    catalogo_horizontal_min_produtos: "50",
    catalogo_horizontal_min_categorias: "5",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["config-roteirizacao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("config_roteirizacao")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (data) {
      setForm({
        max_detour_minutes: String(Math.round((data.max_detour_seconds ?? 900) / 60)),
        max_detour_km: String(((data.max_detour_meters ?? 3000) / 1000).toFixed(1)),
        max_paradas_por_rota: String(data.max_paradas_por_rota ?? 6),
        max_paradas_por_rota_carro: String((data as any).max_paradas_por_rota_carro ?? 12),
        entregador_online_ttl_min: String(data.entregador_online_ttl_min ?? 10),
        raio_agrupamento_preparo_km: String((((data as any).raio_agrupamento_preparo_meters ?? 1500) / 1000).toFixed(1)),
        catalogo_horizontal_min_produtos: String((data as any).catalogo_horizontal_min_produtos ?? 50),
        catalogo_horizontal_min_categorias: String((data as any).catalogo_horizontal_min_categorias ?? 5),
      });
    }
  }, [data]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.id) {
      toast.error("Config ainda não carregou");
      return;
    }
    const minutes = Number(form.max_detour_minutes);
    const km = Number(form.max_detour_km);
    const paradas = Number(form.max_paradas_por_rota);
    const paradasCarro = Number(form.max_paradas_por_rota_carro);
    const ttl = Number(form.entregador_online_ttl_min);
    const raioKm = Number(form.raio_agrupamento_preparo_km);
    const catMinProd = Number(form.catalogo_horizontal_min_produtos);
    const catMinCat = Number(form.catalogo_horizontal_min_categorias);
    if (![minutes, km, paradas, paradasCarro, ttl, raioKm].every((n) => Number.isFinite(n) && n > 0)) {
      toast.error("Todos os valores devem ser positivos");
      return;
    }
    if (![catMinProd, catMinCat].every((n) => Number.isFinite(n) && n >= 1)) {
      toast.error("Os limites do catálogo devem ser números inteiros ≥ 1");
      return;
    }
    if (paradas > 20 || paradasCarro > 40) {
      toast.error("Máximo de 20 paradas (moto) / 40 (carro) por rota");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("config_roteirizacao")
      .update({
        max_detour_seconds: Math.round(minutes * 60),
        max_detour_meters: Math.round(km * 1000),
        max_paradas_por_rota: paradas,
        max_paradas_por_rota_carro: paradasCarro,
        entregador_online_ttl_min: ttl,
        raio_agrupamento_preparo_meters: Math.round(raioKm * 1000),
        catalogo_horizontal_min_produtos: Math.round(catMinProd),
        catalogo_horizontal_min_categorias: Math.round(catMinCat),
      } as any)
      .eq("id", data.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Configuração salva");
    qc.invalidateQueries({ queryKey: ["config-roteirizacao"] });
  };

  return (
    <AdminShell title="Roteirização">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="font-display text-2xl tracking-wide flex items-center gap-2">
            <Route2 className="h-6 w-6 text-primary" />
            Limites de agrupamento
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Estes limites controlam quando um novo pedido é agrupado em uma rota existente
            em vez de criar uma nova. Um pedido é agrupado se respeitar tempo OU distância extras.
          </p>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : (
          <form
            onSubmit={handleSave}
            className="bg-card border border-border rounded-lg p-6 space-y-5 shadow-card"
          >
            <Field
              icon={<Clock className="h-4 w-4 text-primary" />}
              label="Tempo extra máximo (minutos)"
              hint="Quanto a mais um entregador pode demorar para encaixar o pedido na rota."
            >
              <input
                type="number"
                min="1"
                step="1"
                value={form.max_detour_minutes}
                onChange={(e) => setForm({ ...form, max_detour_minutes: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-md font-mono"
              />
            </Field>

            <Field
              icon={<MapPinned className="h-4 w-4 text-primary" />}
              label="Distância extra máxima (km)"
              hint="Distância adicional aceitável para encaixar uma parada na rota."
            >
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={form.max_detour_km}
                onChange={(e) => setForm({ ...form, max_detour_km: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-md font-mono"
              />
            </Field>

            <Field
              icon={<MapPinned className="h-4 w-4 text-primary" />}
              label="Raio de agrupamento na preparação (km)"
              hint="Pedidos em preparo cuja entrega esteja dentro desse raio entre si são agrupados em um mesmo lote no painel da loja."
            >
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={form.raio_agrupamento_preparo_km}
                onChange={(e) => setForm({ ...form, raio_agrupamento_preparo_km: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-md font-mono"
              />
            </Field>



            <Field
              icon={<Route2 className="h-4 w-4 text-primary" />}
              label="Máx. paradas por rota — Moto"
              hint="Limite de paradas em uma rota atribuída a um entregador de moto."
            >
              <input
                type="number"
                min="1"
                max="20"
                step="1"
                value={form.max_paradas_por_rota}
                onChange={(e) => setForm({ ...form, max_paradas_por_rota: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-md font-mono"
              />
            </Field>

            <Field
              icon={<Car className="h-4 w-4 text-primary" />}
              label="Máx. paradas por rota — Carro"
              hint="Entregadores de carro podem agrupar mais pedidos por rota."
            >
              <input
                type="number"
                min="1"
                max="40"
                step="1"
                value={form.max_paradas_por_rota_carro}
                onChange={(e) => setForm({ ...form, max_paradas_por_rota_carro: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-md font-mono"
              />
            </Field>

            <Field
              icon={<Users className="h-4 w-4 text-primary" />}
              label="Tempo máximo desde o último ping (minutos)"
              hint="Entregador é considerado online se enviou localização nesse intervalo."
            >
              <input
                type="number"
                min="1"
                step="1"
                value={form.entregador_online_ttl_min}
                onChange={(e) =>
                  setForm({ ...form, entregador_online_ttl_min: e.target.value })
                }
                className="w-full px-3 py-2 bg-background border border-border rounded-md font-mono"
              />
            </Field>

            <div className="pt-4 mt-2 border-t border-border">
              <h2 className="text-sm font-bold flex items-center gap-2 mb-1">
                <LayoutGrid className="h-4 w-4 text-primary" />
                Catálogo da loja
              </h2>
              <p className="text-xs text-muted-foreground mb-4">
                Quando a loja atingir AMBOS os limites abaixo, o catálogo público passa a usar rolagem horizontal por categoria (estilo mercado/farmácia). Abaixo desses limites, usa o layout vertical em grade.
              </p>
            </div>

            <Field
              icon={<LayoutGrid className="h-4 w-4 text-primary" />}
              label="Mínimo de produtos para rolagem horizontal"
              hint="A loja precisa ter pelo menos essa quantidade de produtos."
            >
              <input
                type="number"
                min="1"
                step="1"
                value={form.catalogo_horizontal_min_produtos}
                onChange={(e) => setForm({ ...form, catalogo_horizontal_min_produtos: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-md font-mono"
              />
            </Field>

            <Field
              icon={<LayoutGrid className="h-4 w-4 text-primary" />}
              label="Mínimo de categorias para rolagem horizontal"
              hint="A loja precisa ter pelo menos essa quantidade de categorias diferentes."
            >
              <input
                type="number"
                min="1"
                step="1"
                value={form.catalogo_horizontal_min_categorias}
                onChange={(e) => setForm({ ...form, catalogo_horizontal_min_categorias: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-md font-mono"
              />
            </Field>



            <button
              type="submit"
              disabled={saving}
              className="w-full px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-md hover:opacity-90 disabled:opacity-50 transition flex items-center justify-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? "Salvando…" : "Salvar configurações"}
            </button>
          </form>
        )}

        <div className="text-xs text-muted-foreground bg-muted/40 border border-border rounded-md p-3">
          As mudanças passam a valer imediatamente nos próximos pedidos atribuídos. Rotas já
          montadas não são reorganizadas.
        </div>
      </div>
    </AdminShell>
  );
}

function Field({
  icon,
  label,
  hint,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 text-sm font-bold">
        {icon}
        {label}
      </label>
      {children}
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
