import { memo, useEffect, useRef } from "react";
import type { LatLng } from "@/lib/geo";
import type { GrupoPedido } from "@/types/pedido";

const MAPS_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;

interface Props {
  minhaPos: LatLng | null;
  grupos: GrupoPedido[];
  onSelectGrupo: (grupo: GrupoPedido) => void;
}

const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#0f172a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0f172a" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0b1a2b" }] },
];

export const MapDisponiveis = memo(function MapDisponiveis({ minhaPos, grupos, onSelectGrupo }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    if (!containerRef.current || !MAPS_KEY) return;

    const loadMap = async () => {
      if (!window.google) {
        await new Promise((resolve) => {
          const script = document.createElement("script");
          script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}`;
          script.onload = resolve;
          document.head.appendChild(script);
        });
      }

      const center = minhaPos || { lat: -15.78, lng: -47.93 };
      
      if (!mapRef.current) {
        mapRef.current = new google.maps.Map(containerRef.current!, {
          center,
          zoom: 14,
          styles: DARK_MAP_STYLE,
          disableDefaultUI: true,
          zoomControl: false,
        });
      }
    };

    loadMap();
  }, [minhaPos]);

  useEffect(() => {
    if (!mapRef.current) return;

    // Limpar marcadores
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    const bounds = new google.maps.LatLngBounds();
    let hasPoints = false;

    if (minhaPos) {
      new google.maps.Marker({
        position: minhaPos,
        map: mapRef.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#3B82F6",
          fillOpacity: 1,
          strokeColor: "white",
          strokeWeight: 2,
        },
        title: "Sua posição"
      });
      bounds.extend(minhaPos);
      hasPoints = true;
    }

    grupos.forEach(grupo => {
      const p = grupo.items[0];
      if (p.endereco_coleta_lat && p.endereco_coleta_lng) {
        const pos = { lat: Number(p.endereco_coleta_lat), lng: Number(p.endereco_coleta_lng) };
        const marker = new google.maps.Marker({
          position: pos,
          map: mapRef.current!,
          icon: {
            path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
            scale: 6,
            fillColor: "#AE0000",
            fillOpacity: 1,
            strokeColor: "white",
            strokeWeight: 2,
          }
        });

        marker.addListener("click", () => onSelectGrupo(grupo));
        markersRef.current.push(marker);
        bounds.extend(pos);
        hasPoints = true;
      }
    });

    if (hasPoints && grupos.length > 0) {
      mapRef.current.fitBounds(bounds, 50);
    }
  }, [grupos, minhaPos, onSelectGrupo]);

  return (
    <div className="absolute inset-0 z-0">
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.2)]" />
    </div>
  );
});