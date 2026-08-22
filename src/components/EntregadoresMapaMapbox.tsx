import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/integrations/supabase/client";
import { Bike } from "lucide-react";

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
      style: "mapbox://styles/mapbox/light-v11",
      center: [-46.6333, -23.5505], // SP
      zoom: 12,
    });

    map.current.addControl(new mapboxgl.NavigationControl());

    return () => {
      map.current?.remove();
    };
  }, [accessToken]);

  // Lógica de Realtime e Marcadores omitida para brevidade, mas segue o padrão do Mapbox
  return (
    <div className="relative w-full h-[500px] rounded-xl overflow-hidden border border-border bg-muted">
      <div ref={mapContainer} className="absolute inset-0" />
    </div>
  );
}
