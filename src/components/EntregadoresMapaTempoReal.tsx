import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bike, Loader2, MapPin } from "lucide-react";

type Entregador = {
  entregador_id: string;
  full_name: string | null;
  phone: string | null;
  lat: number;
  lng: number;
  updated_at: string;
};

const MAPS_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
const TRACKING_ID = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined;

let mapsLoading: Promise<void> | null = null;
function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  
  if (window.google?.maps?.Map) return Promise.resolve();
  if (mapsLoading) return mapsLoading;
  if (!MAPS_KEY) return Promise.reject(new Error("Google Maps key não configurada"));

  mapsLoading = new Promise<void>((resolve, reject) => {
    const cbName = `__initMap_${Math.random().toString(36).slice(2)}`;
    (window as any)[cbName] = () => {
      delete (window as any)[cbName];
      resolve();
    };
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&loading=async&callback=${cbName}${TRACKING_ID ? `&channel=${TRACKING_ID}` : ""}`;
    s.async = true;
    s.defer = true;
    s.onerror = () => reject(new Error("Falha ao carregar Google Maps"));
    document.head.appendChild(s);
  });
  return mapsLoading;
}

export function EntregadoresMapaTempoReal({
  source,
  lojaId,
  title = "Entregadores em tempo real",
}: {
  source: "loja" | "admin";
  lojaId?: string;
  title?: string;
}) {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [entregadores, setEntregadores] = useState<Entregador[]>([]);
  const [diag, setDiag] = useState<{ vinculados: number; onlineSemGps: number } | null>(null);

  // Carrega o Google Maps
  useEffect(() => {
    let cancel = false;
    loadGoogleMaps()
      .then(() => {
        if (cancel || !mapDivRef.current) return;

        const g = window.google;
        mapRef.current = new g.maps.Map(mapDivRef.current, {
          center: { lat: -15.78, lng: -47.93 },
          zoom: 4,
          disableDefaultUI: false,
          streetViewControl: false,
          mapTypeControl: false,
        });
        // Centraliza na localização do navegador da loja/admin se houver permissão
        if (typeof navigator !== "undefined" && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              if (cancel || !mapRef.current) return;
              if (markersRef.current.size === 0) {
                mapRef.current.setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                mapRef.current.setZoom(13);
              }
            },
            () => {},
            { maximumAge: 300000, timeout: 5000 }
          );
        }
      })
      .catch((e) => !cancel && setErro(e.message));
    return () => {
      cancel = true;
    };
  }, []);

  // Busca e atualiza
  useEffect(() => {
    if (source === "loja" && !lojaId) return;
    let cancel = false;

    const fetchData = async () => {
      const { data, error } =
        source === "loja"
          ? await (supabase.rpc as any)("entregadores_online_loja", { _loja_id: lojaId })
          : await (supabase.rpc as any)("entregadores_online_admin");
      if (cancel) return;
      if (error) {
        setErro(error.message);
        setLoading(false);
        return;
      }
      setEntregadores((data ?? []) as Entregador[]);
      setLoading(false);

      // Diagnóstico (somente loja): mostra quantos vinculados ativos existem e
      // quantos estão online mas sem coordenadas (não aparecem no mapa).
      if (source === "loja" && lojaId) {
        const { data: vinc } = await supabase
          .from("loja_entregadores")
          .select("entregador_id, ativo")
          .eq("loja_id", lojaId)
          .eq("ativo", true);
        const ids = (vinc ?? []).map((v: any) => v.entregador_id);
        const vinculados = ids.length;
        let onlineSemGps = 0;
        if (ids.length > 0) {
          const { data: stat } = await supabase
            .from("entregador_status")
            .select("entregador_id, online, lat, lng")
            .in("entregador_id", ids)
            .eq("online", true);
          onlineSemGps = (stat ?? []).filter((s: any) => s.lat == null || s.lng == null).length;
        }
        if (!cancel) setDiag({ vinculados, onlineSemGps });
      }
    };

    fetchData();
    const id = setInterval(fetchData, 15_000);
    return () => {
      cancel = true;
      clearInterval(id);
    };
  }, [source, lojaId]);

  // Sincroniza marcadores
  useEffect(() => {
    if (!mapRef.current) return;
    
    const g = window.google;
    if (!g?.maps) return;

    const seen = new Set<string>();
    const bounds = new g.maps.LatLngBounds();

    for (const e of entregadores) {
      seen.add(e.entregador_id);
      const pos = { lat: Number(e.lat), lng: Number(e.lng) };
      bounds.extend(pos);
      const existing = markersRef.current.get(e.entregador_id);
      if (existing) {
        existing.setPosition(pos);
      } else {
        const marker = new g.maps.Marker({
          position: pos,
          map: mapRef.current,
          title: e.full_name ?? "Entregador",
          icon: {
            path: g.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#dc2626",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 3,
          },
        });
        const info = new g.maps.InfoWindow({
          content: `<div style="font-family:sans-serif;padding:4px 6px;">
            <div style="font-weight:600;">${(e.full_name ?? "Entregador").replace(/</g, "&lt;")}</div>
            ${e.phone ? `<div style="font-size:12px;color:#555;">${e.phone.replace(/</g, "&lt;")}</div>` : ""}
            <div style="font-size:11px;color:#888;margin-top:2px;">Atualizado: ${new Date(e.updated_at).toLocaleTimeString()}</div>
          </div>`,
        });
        marker.addListener("click", () => info.open({ anchor: marker, map: mapRef.current }));
        markersRef.current.set(e.entregador_id, marker);
      }
    }

    // remove marcadores que não estão mais online
    for (const [id, marker] of markersRef.current.entries()) {
      if (!seen.has(id)) {
        marker.setMap(null);
        markersRef.current.delete(id);
      }
    }

    if (entregadores.length > 0) {
      mapRef.current.fitBounds(bounds, 60);
      if (entregadores.length === 1) {
        mapRef.current.setZoom(15);
      }
    }
  }, [entregadores]);

  return (
    <div className="bg-card border border-border rounded-lg shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Bike className="h-4 w-4 text-primary" />
          <h3 className="font-display tracking-wide text-lg">{title}</h3>
        </div>
        <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          {entregadores.length} online
        </span>
      </div>
      <div className="relative">
        <div ref={mapDivRef} className="w-full h-[420px] bg-muted" />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
        {erro && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 p-4">
            <div className="text-center text-sm text-destructive flex flex-col items-center gap-2">
              <MapPin className="h-6 w-6" />
              {erro}
            </div>
          </div>
        )}
        {!loading && !erro && entregadores.length === 0 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-background/90 border border-border rounded-md px-3 py-1.5 text-xs text-muted-foreground shadow-card max-w-[90%] text-center">
            {source === "loja" && diag
              ? diag.vinculados === 0
                ? "Você ainda não vinculou nenhum entregador a essa loja."
                : diag.onlineSemGps > 0
                  ? `${diag.onlineSemGps} entregador(es) online sem GPS — peça para liberar a localização no celular.`
                  : `Nenhum entregador online agora (${diag.vinculados} vinculado(s)).`
              : "Nenhum entregador online no momento"}
          </div>
        )}
      </div>
    </div>
  );
}
