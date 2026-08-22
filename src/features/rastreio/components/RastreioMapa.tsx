import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Truck, MapPin, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { renderToStaticMarkup } from "react-dom/server";

interface RastreioMapaProps {
  pedidoId: string;
  lojaCoord: { lat: number; lng: number } | null;
  entregaCoord: { lat: number; lng: number } | null;
  entregadorId?: string | null;
}

export function RastreioMapa({ pedidoId, lojaCoord, entregaCoord, entregadorId }: RastreioMapaProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string>("");
  const entregadorMarker = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    async function loadConfig() {
      const { data } = await supabase
        .from("config_frete")
        .select("mapbox_access_token")
        .eq("id", "singleton" as any)
        .maybeSingle();
      
      if (data?.mapbox_access_token) {
        setMapboxToken(data.mapbox_access_token);
      }
    }
    loadConfig();
  }, []);

  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || (!lojaCoord && !entregaCoord)) return;

    mapboxgl.accessToken = mapboxToken;
    
    const initialLng = entregaCoord?.lng ?? lojaCoord?.lng ?? -46.6333;
    const initialLat = entregaCoord?.lat ?? lojaCoord?.lat ?? -23.5505;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [initialLng, initialLat],
      zoom: 13,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Marcador da Loja
    if (lojaCoord) {
      const el = document.createElement("div");
      el.innerHTML = renderToStaticMarkup(
        <div className="bg-white p-1 rounded-full shadow-lg border border-border">
          <Store className="w-5 h-5 text-[#0d2c54]" />
        </div>
      );
      new mapboxgl.Marker(el)
        .setLngLat([lojaCoord.lng, lojaCoord.lat])
        .addTo(map.current);
    }

    // Marcador da Entrega
    if (entregaCoord) {
      const el = document.createElement("div");
      el.innerHTML = renderToStaticMarkup(
        <div className="bg-white p-1 rounded-full shadow-lg border-2 border-red-600">
          <MapPin className="w-5 h-5 text-red-600" fill="currentColor" fillOpacity={0.2} />
        </div>
      );
      new mapboxgl.Marker(el)
        .setLngLat([entregaCoord.lng, entregaCoord.lat])
        .addTo(map.current);
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [mapboxToken, lojaCoord, entregaCoord]);

  useEffect(() => {
    if (!map.current || !entregadorId) return;

    async function fetchPosicao() {
      const { data, error } = await (supabase.from("entregadores" as any)
        .select("lat, lng")
        .eq("id", entregadorId)
        .maybeSingle() as Promise<any>);
      
      if (!error && data?.lat && data?.lng) {
        updateEntregadorMarker(data.lat, data.lng);
      }
    }

    function updateEntregadorMarker(lat: number, lng: number) {
      if (!map.current) return;

      if (!entregadorMarker.current) {
        const el = document.createElement("div");
        el.innerHTML = renderToStaticMarkup(
          <div className="bg-[#0d2c54] p-1.5 rounded-full shadow-xl border-2 border-white animate-bounce">
            <Truck className="w-5 h-5 text-white" />
          </div>
        );
        entregadorMarker.current = new mapboxgl.Marker(el)
          .setLngLat([lng, lat])
          .addTo(map.current);
      } else {
        entregadorMarker.current.setLngLat([lng, lat]);
      }
    }

    fetchPosicao();

    const channel = supabase
      .channel(`entregador_posicao_rastreio:${entregadorId}`)
      .on(
        "postgres_changes" as any,
        {
          event: "UPDATE",
          schema: "public",
          table: "entregadores",
          filter: `id=eq.${entregadorId}`,
        },
        (payload: any) => {
          const { lat, lng } = payload.new;
          if (lat && lng) {
            updateEntregadorMarker(lat, lng);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (entregadorMarker.current) {
        entregadorMarker.current.remove();
        entregadorMarker.current = null;
      }
    };
  }, [entregadorId, mapboxToken]);

  if (!mapboxToken || (!lojaCoord && !entregaCoord)) return null;

  return (
    <div className="w-full h-[300px] rounded-xl overflow-hidden shadow-inner border border-border relative mt-4">
      <div ref={mapContainer} className="absolute inset-0" />
    </div>
  );
}
