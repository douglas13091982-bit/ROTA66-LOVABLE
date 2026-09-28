import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MapPin, Calculator, Clock, ShieldCheck, DollarSign, Headphones, LocateFixed, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBranding } from "@/hooks/use-branding";
import { useQuery } from "@tanstack/react-query";
import { AddressAutocomplete, type PlaceSelection } from "@/components/AddressAutocomplete";
import { calcularTarifaPorFaixa } from "@/lib/tarifa-calculator";
import { calcularDistanciaDirigindo, reverseGeocode } from "@/lib/frete.functions";
import { toast } from "sonner";
import type { TarifaFaixa } from "@/types/pedido";

const NAVY = "#0F2341";
const RED = "#D8232A";
const CREAM = "#F5EFE6";

export const Route = createFileRoute("/calcular-frete")({
  head: () => ({ meta: [{ title: "Calcular frete — ROTA 66" }] }),
  component: CalcularFretePage,
});

function CalcularFretePage() {
  const { logoUrl, nomeSistema } = useBranding();
  const [coleta, setColeta] = useState("");
  const [entrega, setEntrega] = useState("");
  const [coletaCoords, setColetaCoords] = useState<PlaceSelection | null>(null);
  const [entregaCoords, setEntregaCoords] = useState<PlaceSelection | null>(null);
  const [localizando, setLocalizando] = useState(false);

  const usarMinhaLocalizacao = () => {
    if (!("geolocation" in navigator)) return toast.error("Geolocalização não suportada neste navegador");
    setLocalizando(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
          const resp = await reverseGeocode({ data: { lat, lng } });
          const address = resp.address ?? `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
          setColeta(address);
          setColetaCoords({ address, lat, lng });
        } catch {
          setColeta(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
          setColetaCoords({ address: "", lat, lng });
        } finally {
          setLocalizando(false);
        }
      },
      () => { setLocalizando(false); toast.error("Não foi possível obter sua localização"); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const { data: tarifas = [] } = useQuery({
    queryKey: ["tarifas-globais-publico"],
    queryFn: async (): Promise<TarifaFaixa[]> => {
      const { data } = await supabase.from("tarifas_globais")
        .select("faixa_km_min, faixa_km_max, valor, valor_minimo, valor_por_km")
        .eq("ativa", true).order("faixa_km_min", { ascending: true });
      return (data ?? []) as TarifaFaixa[];
    },
  });

  const podeCalcular = !!coletaCoords?.lat && !!coletaCoords?.lng && !!entregaCoords?.lat && !!entregaCoords?.lng && tarifas.length > 0;
  const { data: resultado } = useQuery({
    queryKey: ["calc-frete-publico", coletaCoords?.lat, coletaCoords?.lng, entregaCoords?.lat, entregaCoords?.lng, tarifas.length],
    enabled: podeCalcular,
    queryFn: async () => {
      const origem = { lat: coletaCoords!.lat!, lng: coletaCoords!.lng! };
      const destino = { lat: entregaCoords!.lat!, lng: entregaCoords!.lng! };
      const resp = await calcularDistanciaDirigindo({ data: { origem, destino } });
      if (resp.km == null) return null;
      const base = calcularTarifaPorFaixa(resp.km, tarifas);
      return base == null ? null : { km: resp.km, base, total: Number(base.toFixed(2)) };
    },
  });

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: CREAM }}>
      <header className="px-6 py-5 flex items-center justify-center" style={{ backgroundColor: NAVY }}>
        <img src={logoUrl} alt={nomeSistema} className="h-24 w-24 object-contain" />
      </header>
      <main className="flex-1 px-5 pt-6 pb-10 max-w-xl mx-auto w-full">
        <div className="text-center mb-5">
          <h1 className="text-3xl font-extrabold tracking-wide" style={{ color: NAVY }}>CÁLCULO DE <span style={{ color: RED }}>FRETE</span></h1>
          <p className="text-sm mt-2" style={{ color: NAVY }}>Simule o valor logístico entre origem e destino.</p>
        </div>
        <div className="space-y-3">
          <FieldCard iconBg={NAVY} icon={<MapPin className="w-5 h-5 text-white" />} label="ORIGEM">
            <div className="flex items-center gap-2">
              <AddressAutocomplete value={coleta} onChange={setColeta} onSelectPlace={setColetaCoords} placeholder="Digite o endereço de origem" className="w-full bg-transparent border-0 p-0 text-sm text-slate-600 placeholder:text-slate-400 focus:outline-none" />
              <button type="button" onClick={usarMinhaLocalizacao} disabled={localizando} className="shrink-0 p-1.5 rounded-full hover:bg-slate-100 transition" title="Usar minha localização">
                {localizando ? <Loader2 className="w-4 h-4 animate-spin" /> : <LocateFixed className="w-4 h-4" />}
              </button>
            </div>
          </FieldCard>
          <FieldCard iconBg={RED} icon={<MapPin className="w-5 h-5 text-white" />} label="DESTINO">
            <AddressAutocomplete value={entrega} onChange={setEntrega} onSelectPlace={setEntregaCoords} placeholder="Digite o endereço de destino" className="w-full bg-transparent border-0 p-0 text-sm text-slate-600 placeholder:text-slate-400 focus:outline-none" />
          </FieldCard>
        </div>
        <div className="mt-5">
          {resultado ? (
            <div className="rounded-2xl p-5 text-white shadow-lg" style={{ backgroundColor: RED }}>
              <div className="flex items-baseline justify-between mb-2"><span className="text-xs uppercase">Distância</span><span className="text-base font-semibold">{resultado.km.toFixed(2)} km</span></div>
              <div className="flex items-baseline justify-between mb-2 text-sm"><span>Tarifa base</span><span>R$ {resultado.base.toFixed(2)}</span></div>
              <div className="border-t border-white/30 pt-3 flex items-baseline justify-between"><span className="text-sm font-semibold">Total</span><span className="text-3xl font-extrabold">R$ {resultado.total.toFixed(2)}</span></div>
            </div>
          ) : <div className="w-full text-center rounded-2xl py-4 text-slate-500 border border-slate-200">Selecione origem e destino para calcular.</div>}
        </div>
        <section className="mt-8 rounded-2xl bg-white/60 border border-slate-200/70 px-4 py-5">
          <h2 className="text-center text-sm font-extrabold tracking-wider mb-4" style={{ color: NAVY }}>ROTA 66 · LOGÍSTICA</h2>
          <div className="grid grid-cols-4 gap-2">
            <Benefit icon={<Clock className="w-7 h-7" style={{ color: NAVY }} />} label={["RÁPIDO", "E FÁCIL"]} />
            <Benefit icon={<ShieldCheck className="w-7 h-7" style={{ color: NAVY }} />} label={["SEGURO", "E CONFIÁVEL"]} />
            <Benefit icon={<DollarSign className="w-7 h-7" style={{ color: NAVY }} />} label={["TARIFA", "CLARA"]} />
            <Benefit icon={<Headphones className="w-7 h-7" style={{ color: NAVY }} />} label={["SUPORTE", "LOGÍSTICO"]} />
          </div>
        </section>
      </main>
    </div>
  );
}

function FieldCard({ icon, iconBg, label, children }: { icon: React.ReactNode; iconBg: string; label: string; children: React.ReactNode }) {
  return <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm px-4 py-3 flex items-center gap-3">
    <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: iconBg }}>{icon}</div>
    <div className="flex-1 min-w-0"><div className="text-[11px] font-extrabold tracking-wider" style={{ color: NAVY }}>{label}</div><div className="-mt-1">{children}</div></div>
  </div>;
}

function Benefit({ icon, label }: { icon: React.ReactNode; label: [string, string] }) {
  return <div className="flex flex-col items-center text-center gap-1.5">{icon}<div className="text-[10px] font-extrabold leading-tight" style={{ color: NAVY }}>{label[0]}<br />{label[1]}</div></div>;
}
