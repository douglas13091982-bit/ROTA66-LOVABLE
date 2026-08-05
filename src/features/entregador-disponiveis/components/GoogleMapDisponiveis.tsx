import { useEffect, useRef, useState, memo } from "react";
import { type LatLng } from "@/lib/geo";
import type { GrupoPedido } from "@/types/pedido";
import { Loader2 } from "lucide-react";

const MAPS_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;

const LIGHT_MAP_STYLE: any[] = [
  { elementType: "geometry", stylers: [{ color: "#ebe3cd" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#523735" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f1e6" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#c9b2a6" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#dfd2ae" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#93817c" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#f5f1e6" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#f8c967" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
];

interface Props {
  minhaPos: LatLng | null;
  grupos: GrupoPedido[];
  onSelecionarGrupo: (grupo: GrupoPedido) => void;
}

export const GoogleMapDisponiveis = memo(({ minhaPos, grupos, onSelecionarGrupo }: Props) => {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const myMarkerRef = useRef<any>(null);
  const [mapsLoaded, setMapsLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !MAPS_KEY) return;
    if (window.google?.maps?.Map) {
      setMapsLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => setMapsLoaded(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!mapsLoaded || !mapDivRef.current) return;

    const g = window.google;
    mapRef.current = new g.maps.Map(mapDivRef.current, {
      center: minhaPos || { lat: -15.78, lng: -47.93 },
      zoom: 15,
      disableDefaultUI: true,
      styles: LIGHT_MAP_STYLE,
    });
  }, [mapsLoaded]);

  // Atualiza marcador de posição própria
  useEffect(() => {
    if (!mapRef.current || !minhaPos) return;
    const g = window.google;
    
    if (!myMarkerRef.current) {
      myMarkerRef.current = new g.maps.Marker({
        position: minhaPos,
        map: mapRef.current,
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#3b82f6",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      });
      mapRef.current.setCenter(minhaPos);
    } else {
      myMarkerRef.current.setPosition(minhaPos);
    }
  }, [minhaPos]);

  // Atualiza marcadores de pedidos
  useEffect(() => {
    if (!mapRef.current) return;
    const g = window.google;

    const currentIds = new Set<string>();
    
    for (const grupo of grupos) {
      const p = grupo.items[0];
      if (p.endereco_coleta_lat == null || p.endereco_coleta_lng == null) continue;
      
      const id = `grupo-${p.rota_id || p.id}`;
      currentIds.add(id);

      if (!markersRef.current.has(id)) {
        const marker = new g.maps.Marker({
          position: { lat: Number(p.endereco_coleta_lat), lng: Number(p.endereco_coleta_lng) },
          map: mapRef.current,
          icon: {
            url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
                <circle cx="20" cy="20" r="18" fill="#AE0000" stroke="white" stroke-width="2"/>
                <path d="M12 20h16M20 12v16" stroke="white" stroke-width="3" stroke-linecap="round"/>
              </svg>
            `),
            scaledSize: new g.maps.Size(40, 40),
            anchor: new g.maps.Point(20, 20),
          },
        });
        marker.addListener("click", () => onSelecionarGrupo(grupo));
        markersRef.current.set(id, marker);
      }
    }

    // Remove marcadores antigos
    for (const [id, marker] of markersRef.current.entries()) {
      if (!currentIds.has(id)) {
        marker.setMap(null);
        markersRef.current.delete(id);
      }
    }
  }, [grupos, onSelecionarGrupo]);

  return (
    <div className="relative w-full h-full bg-white">
      <div ref={mapDivRef} className="w-full h-full" />
      {!mapsLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-white">
          <Loader2 className="w-8 h-8 animate-spin text-white opacity-20" />
        </div>
      )}
    </div>
  );
});
