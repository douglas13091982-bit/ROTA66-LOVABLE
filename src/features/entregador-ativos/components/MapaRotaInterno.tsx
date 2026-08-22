import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Store } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";

interface MapaRotaInternoProps {
  origem: { lat: number; lng: number };
  destino: { lat: number; lng: number };
}

export function MapaRotaInterno({ origem, destino }: MapaRotaInternoProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
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
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [origem.lng, origem.lat],
      zoom: 12,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Marcador da Loja (Origem)
    const origemEl = document.createElement("div");
    origemEl.innerHTML = renderToStaticMarkup(
      <div className="bg-white p-1 rounded-full shadow-lg border border-[#0d2c54]">
        <Store className="w-4 h-4 text-[#0d2c54]" />
      </div>
    );
    new mapboxgl.Marker(origemEl)
      .setLngLat([origem.lng, origem.lat])
      .addTo(map.current);

    // Marcador do Cliente (Destino)
    const destinoEl = document.createElement("div");
    destinoEl.innerHTML = renderToStaticMarkup(
      <div className="bg-white p-1 rounded-full shadow-lg border-2 border-[#e3000f]">
        <MapPin className="w-4 h-4 text-[#e3000f]" fill="currentColor" fillOpacity={0.2} />
      </div>
    );
    new mapboxgl.Marker(destinoEl)
      .setLngLat([destino.lng, destino.lat])
      .addTo(map.current);

    // Ajusta o zoom para ver ambos
    const bounds = new mapboxgl.LngLatBounds()
      .extend([origem.lng, origem.lat])
      .extend([destino.lng, destino.lat]);
    
    map.current.fitBounds(bounds, { padding: 40, animate: false });

    // Desenha a linha da rota
    map.current.on('load', () => {
      if (!map.current) return;
      
      map.current.addSource('route', {
        'type': 'geojson',
        'data': {
          'type': 'Feature',
          'properties': {},
          'geometry': {
            'type': 'LineString',
            'coordinates': [
              [origem.lng, origem.lat],
              [destino.lng, destino.lat]
            ]
          }
        }
      });

      map.current.addLayer({
        'id': 'route',
        'type': 'line',
        'source': 'route',
        'layout': {
          'line-join': 'round',
          'line-cap': 'round'
        },
        'paint': {
          'line-color': '#e3000f',
          'line-width': 3,
          'line-dasharray': [1, 2]
        }
      });
    });
    
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [mapboxToken, origem, destino]);

  if (!mapboxToken) return null;

  return (
    <div className="w-full h-48 rounded-xl overflow-hidden shadow-inner border border-slate-200 relative mt-4 bg-slate-50">
      <div ref={mapContainer} className="absolute inset-0" />
    </div>
  );
}
