import { useEffect, useState } from "react";
import Map, { Marker, NavigationControl } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Truck, MapPin, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface RastreioMapaProps {
  pedidoId: string;
  lojaCoord: { lat: number; lng: number } | null;
  entregaCoord: { lat: number; lng: number } | null;
  entregadorId?: string | null;
}

export function RastreioMapa({ pedidoId, lojaCoord, entregaCoord, entregadorId }: RastreioMapaProps) {
  const [entregadorCoord, setEntregadorCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string>("");

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
    if (!entregadorId) return;

    async function fetchPosicao() {
      // Usando uma abordagem mais robusta para bypassar o type inference do PostgREST no build
      const { data, error } = await (supabase.from("entregadores" as any)
        .select("lat, lng")
        .eq("id", entregadorId)
        .maybeSingle() as Promise<any>);
      
      if (!error && data?.lat && data?.lng) {
        setEntregadorCoord({ lat: data.lat, lng: data.lng });
      }
    }
    fetchPosicao();

    const channel = supabase
      .channel(`entregador_posicao:${entregadorId}`)
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
            setEntregadorCoord({ lat, lng });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [entregadorId]);

  if (!mapboxToken || (!lojaCoord && !entregaCoord)) return null;

  const initialViewState = {
    longitude: entregaCoord?.lng ?? lojaCoord?.lng ?? -46.6333,
    latitude: entregaCoord?.lat ?? lojaCoord?.lat ?? -23.5505,
    zoom: 13,
  };

  return (
    <div className="w-full h-[300px] rounded-xl overflow-hidden shadow-inner border border-border relative mt-4">
      <Map
        mapboxAccessToken={mapboxToken}
        initialViewState={initialViewState}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
      >
        <NavigationControl position="top-right" />

        {lojaCoord && (
          <Marker longitude={lojaCoord.lng} latitude={lojaCoord.lat} anchor="bottom">
            <div className="bg-white p-1 rounded-full shadow-lg border border-border">
              <Store className="w-5 h-5 text-[#0d2c54]" />
            </div>
          </Marker>
        )}

        {entregaCoord && (
          <Marker longitude={entregaCoord.lng} latitude={entregaCoord.lat} anchor="bottom">
            <div className="bg-white p-1 rounded-full shadow-lg border-2 border-red-600">
              <MapPin className="w-5 h-5 text-red-600" fill="currentColor" fillOpacity={0.2} />
            </div>
          </Marker>
        )}

        {entregadorCoord && (
          <Marker longitude={entregadorCoord.lng} latitude={entregadorCoord.lat} anchor="center">
            <div className="bg-[#0d2c54] p-1.5 rounded-full shadow-xl border-2 border-white animate-bounce">
              <Truck className="w-5 h-5 text-white" />
            </div>
          </Marker>
        )}
      </Map>
    </div>
  );
}
