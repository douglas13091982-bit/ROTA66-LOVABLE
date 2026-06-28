import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBranding } from "@/hooks/use-branding";
import { useQuery } from "@tanstack/react-query";
import { AddressAutocomplete, type PlaceSelection } from "@/components/AddressAutocomplete";
import { haversineKm } from "@/lib/geo";
import { calcularTarifaPorFaixa, encontrarFaixa } from "@/lib/tarifa-calculator";
import type { TarifaFaixa } from "@/types/pedido";

const ADICIONAL_BASICO = 3;

export const Route = createFileRoute("/calcular-frete")({
  head: () => ({
    meta: [
      { title: "Calcular Frete — ROTA 66" },
      { name: "description", content: "Simulador de frete para clientes." },
    ],
  }),
  component: CalcularFretePage,
});

function CalcularFretePage() {
  const { logoUrl, nomeSistema } = useBranding();
  const [coleta, setColeta] = useState("");
  const [entrega, setEntrega] = useState("");
  const [coletaCoords, setColetaCoords] = useState<PlaceSelection | null>(null);
  const [entregaCoords, setEntregaCoords] = useState<PlaceSelection | null>(null);

  const { data: tarifas = [] } = useQuery({
    queryKey: ["tarifas-globais-publico"],
    queryFn: async (): Promise<TarifaFaixa[]> => {
      const { data } = await supabase
        .from("tarifas_globais")
        .select("faixa_km_min, faixa_km_max, valor, valor_minimo, valor_por_km")
        .eq("ativa", true)
        .eq("tipo_veiculo", "moto")
        .order("faixa_km_min", { ascending: true });
      return (data ?? []) as TarifaFaixa[];
    },
  });

  const resultado = useMemo(() => {
    if (
      !coletaCoords?.lat ||
      !coletaCoords?.lng ||
      !entregaCoords?.lat ||
      !entregaCoords?.lng ||
      tarifas.length === 0
    )
      return null;
    const km = haversineKm(
      { lat: coletaCoords.lat, lng: coletaCoords.lng },
      { lat: entregaCoords.lat, lng: entregaCoords.lng },
    );
    const base = calcularTarifaPorFaixa(km, tarifas);
    if (base == null) return null;
    const faixa = encontrarFaixa(km, tarifas);
    const total = Number((base + ADICIONAL_BASICO).toFixed(2));
    return { km, base, total, faixa };
  }, [coletaCoords, entregaCoords, tarifas]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-start justify-center px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="flex flex-col items-center text-center mb-8">
          <img src={logoUrl} alt={nomeSistema} className="h-24 w-24 object-contain mb-3" />
          <h1 className="text-2xl font-bold tracking-tight">Calcular Frete</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Simule o valor da entrega entre dois endereços
          </p>
        </div>

        <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm">
          <AddressAutocomplete
            label="Endereço de coleta"
            value={coleta}
            onChange={setColeta}
            onSelectPlace={(p) => setColetaCoords(p)}
            placeholder="Onde o pedido será retirado"
          />
          <AddressAutocomplete
            label="Endereço de entrega"
            value={entrega}
            onChange={setEntrega}
            onSelectPlace={(p) => setEntregaCoords(p)}
            placeholder="Onde o pedido será entregue"
          />

          {resultado ? (
            <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-5">
              <div className="flex items-baseline justify-between mb-3">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  Distância
                </span>
                <span className="text-lg font-semibold">
                  {resultado.km.toFixed(2)} km
                </span>
              </div>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  Tarifa base
                </span>
                <span className="text-sm">R$ {resultado.base.toFixed(2)}</span>
              </div>
              <div className="flex items-baseline justify-between mb-3">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  Adicional plano Básico
                </span>
                <span className="text-sm">R$ {ADICIONAL_BASICO.toFixed(2)}</span>
              </div>
              <div className="border-t border-border/60 pt-3 flex items-baseline justify-between">
                <span className="text-sm font-medium">Total do frete</span>
                <span className="text-2xl font-bold text-primary">
                  R$ {resultado.total.toFixed(2)}
                </span>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Selecione os dois endereços nas sugestões para ver o cálculo.
            </p>
          )}
        </div>

        <p className="text-center text-[11px] text-muted-foreground mt-6">
          Simulação baseada nas tarifas globais (moto) + R$ {ADICIONAL_BASICO.toFixed(2)} do plano Básico.
        </p>

        <a
          href="https://rotas66.com.br"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 block w-full text-center rounded-xl bg-primary text-primary-foreground py-3.5 text-sm font-semibold tracking-wide hover:bg-primary/90 transition-colors"
        >
          Visitar rotas66.com.br
        </a>

      </div>
    </div>
  );
}
