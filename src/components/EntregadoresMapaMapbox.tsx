import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/integrations/supabase/client";
import { Bike, User, MapPin } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";

type Stage = "livre" | "indo_coletar" | "chegou_coleta" | "em_rota_entrega";

const STAGE_COLORS: Record<Stage, string> = {
  livre: "#00D492",
  indo_coletar: "#3B82F6",
  chegou_coleta: "#F59E0B",
  em_rota_entrega: "#A855F7",
};

export function EntregadoresMapaMapbox({ 
  source, 
  lojaId, 
  accessToken 
}: { 
  source: "admin" | "loja"; 
  lojaId?: string;
  accessToken: string;
}) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<Record<string, mapboxgl.Marker>>({});

  useEffect(() => {
    if (!mapContainer.current || !accessToken) return;

    mapboxgl.accessToken = accessToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-46.6333, -23.5505], // SP
      zoom: 12,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [accessToken]);

  useEffect(() => {
    if (!map.current) return;

    const fetchData = async () => {
      const { data, error } = source === "loja"
        ? await (supabase.rpc as any)("entregadores_online_loja", { _loja_id: lojaId })
        : await (supabase.rpc as any)("entregadores_online_admin");

      if (error || !data) return;

      const seenIds = new Set<string>();
      const bounds = new mapboxgl.LngLatBounds();

      (data as any[]).forEach((e) => {
        seenIds.add(e.entregador_id);
        const pos: [number, number] = [Number(e.lng), Number(e.lat)];
        bounds.extend(pos);

        const stage = (e.stage as Stage) || "livre";
        const color = STAGE_COLORS[stage];

        if (markers.current[e.entregador_id]) {
          markers.current[e.entregador_id].setLngLat(pos);
          // Atualiza a cor se mudou (via elemento DOM se necessário)
        } else {
          const el = document.createElement("div");
          el.className = "marker-entregador";
          el.innerHTML = renderToStaticMarkup(
            <div className="relative group">
              <div 
                className="absolute inset-0 rounded-full animate-ping opacity-25" 
                style={{ backgroundColor: color }} 
              />
              <div 
                className="relative bg-navy-blue p-1.5 rounded-full border-2 border-white shadow-xl"
                style={{ backgroundColor: color }}
              >
                <Bike className="w-4 h-4 text-white" />
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 bg-black/80 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                {e.full_name}
              </div>
            </div>
          );

          const marker = new mapboxgl.Marker(el)
            .setLngLat(pos)
            .addTo(map.current!);
          
          markers.current[e.entregador_id] = marker;
        }
      });

      // Remove marcadores antigos
      Object.keys(markers.current).forEach((id) => {
        if (!seenIds.has(id)) {
          markers.current[id].remove();
          delete markers.current[id];
        }
      });

      if (data.length > 0 && map.current) {
        map.current.fitBounds(bounds, { padding: 50, maxZoom: 15 });
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 8000);

    return () => clearInterval(interval);
  }, [source, lojaId]);

  return (
    <div className="relative w-full h-[500px] rounded-xl overflow-hidden border border-border bg-muted">
      <div ref={mapContainer} className="absolute inset-0" />
    </div>
  );
}
