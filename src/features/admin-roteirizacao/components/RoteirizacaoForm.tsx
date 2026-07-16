import { useEffect, useState } from "react";
import { Route as Route2, Clock, MapPinned, Users, Save, LayoutGrid, Car, Radio, Timer } from "lucide-react";
import { useRoteirizacao } from "../hooks/use-roteirizacao";
import { fromRow, INITIAL_FORM, type RoteirizacaoForm, type PoolAbertoScope } from "../logic/form";
import { Field, numberInputClass } from "./Field";

export function RoteirizacaoForm() {
  const { data, isLoading, salvar } = useRoteirizacao();
  const [form, setForm] = useState<RoteirizacaoForm>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setForm(fromRow(data));
  }, [data]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await salvar(form);
    setSaving(false);
  };

  const set = (k: keyof RoteirizacaoForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  if (isLoading) return <div className="text-sm text-muted-foreground">Carregando…</div>;

  return (
    <form onSubmit={handleSave} className="bg-card border border-border rounded-lg p-6 space-y-5 shadow-card">
      <Field icon={<Clock className="h-4 w-4 text-primary" />} label="Tempo extra máximo (minutos)"
        hint="Quanto a mais um entregador pode demorar para encaixar o pedido na rota.">
        <input type="number" min="1" step="1" value={form.max_detour_minutes}
          onChange={set("max_detour_minutes")} className={numberInputClass} />
      </Field>

      <Field icon={<MapPinned className="h-4 w-4 text-primary" />} label="Distância extra máxima (km)"
        hint="Distância adicional aceitável para encaixar uma parada na rota.">
        <input type="number" min="0.1" step="0.1" value={form.max_detour_km}
          onChange={set("max_detour_km")} className={numberInputClass} />
      </Field>

      <Field icon={<MapPinned className="h-4 w-4 text-primary" />} label="Raio de agrupamento na preparação (km)"
        hint="Pedidos em preparo cuja entrega esteja dentro desse raio entre si são agrupados em um mesmo lote no painel da loja.">
        <input type="number" min="0.1" step="0.1" value={form.raio_agrupamento_preparo_km}
          onChange={set("raio_agrupamento_preparo_km")} className={numberInputClass} />
      </Field>

      <Field icon={<Route2 className="h-4 w-4 text-primary" />} label="Máx. paradas por rota — Moto"
        hint="Limite de paradas em uma rota atribuída a um entregador de moto.">
        <input type="number" min="1" max="20" step="1" value={form.max_paradas_por_rota}
          onChange={set("max_paradas_por_rota")} className={numberInputClass} />
      </Field>

      <Field icon={<Car className="h-4 w-4 text-primary" />} label="Máx. paradas por rota — Carro"
        hint="Entregadores de carro podem agrupar mais pedidos por rota.">
        <input type="number" min="1" max="40" step="1" value={form.max_paradas_por_rota_carro}
          onChange={set("max_paradas_por_rota_carro")} className={numberInputClass} />
      </Field>

      <Field icon={<Users className="h-4 w-4 text-primary" />} label="Tempo máximo desde o último ping (minutos)"
        hint="Entregador é considerado online se enviou localização nesse intervalo.">
        <input type="number" min="1" step="1" value={form.entregador_online_ttl_min}
          onChange={set("entregador_online_ttl_min")} className={numberInputClass} />
      </Field>

      <div className="pt-4 mt-2 border-t border-border">
        <h2 className="text-sm font-bold flex items-center gap-2 mb-1">
          <Radio className="h-4 w-4 text-primary" />
          Pool aberto de pedidos
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Define quais pedidos cada entregador vê na tela "Disponíveis". O primeiro a aceitar fica com o pedido.
        </p>
      </div>

      <Field icon={<Radio className="h-4 w-4 text-primary" />} label="Escopo do pool aberto"
        hint="Vinculados: só pedidos das lojas em que o entregador está vinculado. Externos: pedidos de lojas sem entregador próprio online (entregador precisa ter aceita externos no perfil). Ambos: união dos dois.">
        <select
          value={form.pool_aberto_scope}
          onChange={(e) => setForm({ ...form, pool_aberto_scope: e.target.value as PoolAbertoScope })}
          className={numberInputClass}
        >
          <option value="vinculados_e_externos">Vinculados + Externos (padrão)</option>
          <option value="somente_vinculados">Somente vinculados</option>
          <option value="somente_externos">Somente externos</option>
        </select>
      </Field>

      <Field icon={<MapPinned className="h-4 w-4 text-primary" />} label="Raio máximo do entregador até a coleta (km)"
        hint="Esconde do pool pedidos cuja coleta esteja mais longe que esse raio da posição atual do entregador. Use 0 para desativar o filtro. Entregadores sem GPS recente continuam vendo todos os pedidos.">
        <input type="number" min="0" step="0.5" value={form.raio_maximo_coleta_km}
          onChange={set("raio_maximo_coleta_km")} className={numberInputClass} />
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

      <Field icon={<LayoutGrid className="h-4 w-4 text-primary" />} label="Mínimo de produtos para rolagem horizontal"
        hint="A loja precisa ter pelo menos essa quantidade de produtos.">
        <input type="number" min="1" step="1" value={form.catalogo_horizontal_min_produtos}
          onChange={set("catalogo_horizontal_min_produtos")} className={numberInputClass} />
      </Field>

      <Field icon={<LayoutGrid className="h-4 w-4 text-primary" />} label="Mínimo de categorias para rolagem horizontal"
        hint="A loja precisa ter pelo menos essa quantidade de categorias diferentes.">
        <input type="number" min="1" step="1" value={form.catalogo_horizontal_min_categorias}
          onChange={set("catalogo_horizontal_min_categorias")} className={numberInputClass} />
      </Field>

      <button type="submit" disabled={saving}
        className="w-full px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-md hover:opacity-90 disabled:opacity-50 transition flex items-center justify-center gap-2">
        <Save className="h-4 w-4" />
        {saving ? "Salvando…" : "Salvar configurações"}
      </button>
    </form>
  );
}
