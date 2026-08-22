import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { subscribeLazy } from "@/lib/realtime-lazy";
import { Bike, Loader2, MapPin } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { reverseGeocode } from "@/lib/reverse-geocode.functions";
import { EntregadoresMapaMapbox } from "./EntregadoresMapaMapbox";

type Stage = "livre" | "indo_coletar" | "chegou_coleta" | "em_rota_entrega";

type Entregador = {
  entregador_id: string;
  full_name: string | null;
  phone: string | null;
  lat: number;
  lng: number;
  updated_at: string;
  stage?: Stage | null;
};

const STAGE_COLORS: Record<Stage, string> = {
  livre: "#00D492",
  indo_coletar: "#3B82F6",
  chegou_coleta: "#F59E0B",
  em_rota_entrega: "#A855F7",
};

const STAGE_LABELS: Record<Stage, string> = {
  livre: "Livre",
  indo_coletar: "Indo coletar",
  chegou_coleta: "Na coleta",
  em_rota_entrega: "Em entrega",
};

const MAPS_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
const TRACKING_ID = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined;

const DARK_MAP_STYLE: any[] = [
  { elementType: "geometry", stylers: [{ color: "#0f172a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0f172a" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#cbd5e1" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
  { featureType: "poi", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#0b3d2e" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#3f6b52" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#0f172a" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#334155" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#0f172a" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0b1a2b" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3b5c7a" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#0b1a2b" }] },
];

function pulseIcon(g: any, phase: number, color: string = STAGE_COLORS.livre) {
  const haloR = 10 + phase * 18;
  const haloOpacity = 0.75 * (1 - phase);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">
    <circle cx="30" cy="30" r="${haloR.toFixed(1)}" fill="${color}" fill-opacity="${haloOpacity.toFixed(2)}"/>
    <circle cx="30" cy="30" r="${(haloR - 3).toFixed(1)}" fill="none" stroke="${color}" stroke-opacity="${(haloOpacity * 0.6).toFixed(2)}" stroke-width="1"/>
    <circle cx="30" cy="30" r="9" fill="${color}" stroke="${color}" stroke-width="1.5"/>
  </svg>`;
  return {
    url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
    scaledSize: new g.maps.Size(60, 60),
    anchor: new g.maps.Point(30, 30),
  };
}

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
  const { data: config } = useQuery({
    queryKey: ["config_frete"],
    queryFn: async () => {
      const { data } = await supabase
        .from("config_frete")
        .select("*")
        .eq("id", "singleton" as any)
        .maybeSingle();
      return data;
    },
  });

  const provedor = (config as any)?.provedor_mapa ?? "google";
  const mapboxToken = (config as any)?.mapbox_access_token;

  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const stageRef = useRef<Map<string, Stage>>(new Map());
  const infoRef = useRef<any>(null);
  const addressCacheRef = useRef<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [entregadores, setEntregadores] = useState<Entregador[]>([]);
  const [diag, setDiag] = useState<{ vinculados: number; onlineSemGps: number } | null>(null);
  const runReverseGeocode = useServerFn(reverseGeocode);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById("gm-iw-dark-style")) return;
    const style = document.createElement("style");
    style.id = "gm-iw-dark-style";
    style.textContent = `
      .gm-style .gm-style-iw-c { background:#0f172a !important; box-shadow:0 4px 20px rgba(0,0,0,0.5) !important; border-radius:10px !important; padding:10px 12px !important; }
      .gm-style .gm-style-iw-d { background:#0f172a !important; overflow:hidden !important; max-height:none !important; }
      .gm-style .gm-style-iw-d::-webkit-scrollbar { display:none !important; }
      .gm-style .gm-style-iw-tc::after { background:#0f172a !important; }
      .gm-style .gm-style-iw-chr { background:#0f172a !important; margin:0 !important; padding:0 !important; height:0 !important; }
      .gm-style .gm-style-iw-chr button { top:4px !important; right:4px !important; opacity:0.7 !important; }
      .gm-style .gm-style-iw-chr button > span { background:#cbd5e1 !important; }
    `;
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    if (provedor !== "google") return;
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
          backgroundColor: "#0b1220",
          styles: DARK_MAP_STYLE,
        });
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
    return () => { cancel = true; };
  }, [provedor]);

  useEffect(() => {
    if (source === "loja" && !lojaId) return;
    let cancel = false;
    const fetchData = async () => {
      const { data, error } = source === "loja"
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
      if (source === "loja" && lojaId) {
        const { data: vinc } = await supabase.from("loja_entregadores").select("entregador_id").eq("loja_id", lojaId).eq("ativo", true);
        const ids = (vinc ?? []).map((v: any) => v.entregador_id);
        if (ids.length > 0) {
          const { data: stat } = await supabase.from("entregador_status").select("entregador_id, online, lat, lng").in("entregador_id", ids).eq("online", true);
          const onlineSemGps = (stat ?? []).filter((s: any) => s.lat == null || s.lng == null).length;
          if (!cancel) setDiag({ vinculados: ids.length, onlineSemGps });
        } else {
          setDiag({ vinculados: 0, onlineSemGps: 0 });
        }
      }
    };
    fetchData();
    const id = setInterval(fetchData, 8000);
    const stopCh = subscribeLazy(
      () => supabase.channel(`mapa-ent-${source}-${lojaId ?? "admin"}`).on("postgres_changes", { event: "*", schema: "public", table: "entregador_status" }, fetchData).subscribe(),
      fetchData,
    );
    return () => { cancel = true; clearInterval(id); stopCh(); };
  }, [source, lojaId]);

  useEffect(() => {
    if (provedor !== "google" || !mapRef.current) return;
    const g = window.google;
    if (!g?.maps) return;
    const seen = new Set<string>();
    const bounds = new g.maps.LatLngBounds();
    for (const e of entregadores) {
      seen.add(e.entregador_id);
      const pos = { lat: Number(e.lat), lng: Number(e.lng) };
      bounds.extend(pos);
      const stage: Stage = (e.stage as Stage) ?? "livre";
      stageRef.current.set(e.entregador_id, stage);
      const color = STAGE_COLORS[stage];
      const existing = markersRef.current.get(e.entregador_id);
      if (existing) {
        existing.setPosition(pos);
      } else {
        const marker = new g.maps.Marker({
          position: pos,
          map: mapRef.current,
          title: e.full_name ?? "Entregador",
          icon: pulseIcon(g, 0, color),
        });
        marker.addListener("click", async () => {
          if (infoRef.current) infoRef.current.close();
          const info = new g.maps.InfoWindow();
          infoRef.current = info;
          const cached = addressCacheRef.current.get(e.entregador_id);
          const build = (addr: string | null) => `<div>${e.full_name}<br/>${addr || "..."}</div>`;
          info.setContent(build(cached ?? null));
          info.open({ anchor: marker, map: mapRef.current });
          if (!cached) {
            const res = await runReverseGeocode({ data: { lat: Number(e.lat), lng: Number(e.lng) } });
            if (res.address) {
              addressCacheRef.current.set(e.entregador_id, res.address);
              info.setContent(build(res.address));
            }
          }
        });
        markersRef.current.set(e.entregador_id, marker);
      }
    }
    for (const [id, marker] of markersRef.current.entries()) {
      if (!seen.has(id)) { marker.setMap(null); markersRef.current.delete(id); }
    }
    if (entregadores.length > 0) mapRef.current.fitBounds(bounds, 60);
  }, [entregadores, provedor]);

  useEffect(() => {
    if (provedor !== "google") return;
    const start = performance.now();
    const id = setInterval(() => {
      const g = window.google;
      if (!g?.maps) return;
      const phase = ((performance.now() - start) % 1600) / 1600;
      for (const [id, marker] of markersRef.current.entries()) {
        const stage = stageRef.current.get(id) ?? "livre";
        marker.setIcon(pulseIcon(g, phase, STAGE_COLORS[stage]));
      }
    }, 80);
    return () => clearInterval(id);
  }, [provedor]);

  return (
    <div className="bg-[#0f172a] border border-white/10 rounded-lg shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Bike className="h-4 w-4 text-emerald-400" />
          <h3 className="font-display tracking-wide text-lg text-white">{title}</h3>
        </div>
        <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          {entregadores.length} online
        </span>
      </div>
      <div className="relative">
        {provedor === "mapbox" && mapboxToken ? (
          <EntregadoresMapaMapbox source={source as any} lojaId={lojaId} accessToken={mapboxToken} />
        ) : (
          <div ref={mapDivRef} className="w-full h-[420px] bg-[#0b1220]" />
        )}
        {loading && <div className="absolute inset-0 flex items-center justify-center bg-background/60"><Loader2 className="animate-spin" /></div>}
        {erro && <div className="absolute inset-0 flex items-center justify-center bg-background/80 text-destructive">{erro}</div>}
      </div>
    </div>
  );
}
