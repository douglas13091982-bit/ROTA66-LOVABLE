import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { subscribeLazy } from "@/lib/realtime-lazy";
import { Bike, Loader2, MapPin } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { reverseGeocode } from "@/lib/reverse-geocode.functions";

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

// Cores por estágio do fluxo de entrega
const STAGE_COLORS: Record<Stage, string> = {
  livre: "#00D492",           // verde neon — sem pedido
  indo_coletar: "#3B82F6",    // azul — aceitou, indo coletar
  chegou_coleta: "#F59E0B",   // âmbar — chegou na coleta
  em_rota_entrega: "#A855F7", // roxo — em rota de entrega
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
  // phase: 0..1
  const haloR = 10 + phase * 18; // 10 -> 28
  const haloOpacity = 0.75 * (1 - phase); // 0.75 -> 0
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


  // Injeta estilo dark do InfoWindow (remove barras brancas)
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
          backgroundColor: "#0b1220",
          styles: DARK_MAP_STYLE,
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
    const id = setInterval(fetchData, 8_000);

    // Realtime: qualquer mudança em entregador_status (ex.: entregador clica
    // offline) dispara refetch imediato — sem esperar o próximo polling.
    const stopCh = subscribeLazy(
      () =>
        supabase
          .channel(`mapa-entregadores-${source}-${lojaId ?? "admin"}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "entregador_status" },
            () => fetchData()
          )
          .subscribe(),
      () => fetchData(),
    );


    return () => {
      cancel = true;
      clearInterval(id);
      stopCh();
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
      const stage: Stage = (e.stage as Stage) ?? "livre";
      stageRef.current.set(e.entregador_id, stage);
      const color = STAGE_COLORS[stage];
      const existing = markersRef.current.get(e.entregador_id);
      if (existing) {
        const prev = existing.getPosition?.();
        if (!prev || Math.abs(prev.lat() - pos.lat) > 0.0002 || Math.abs(prev.lng() - pos.lng) > 0.0002) {
          addressCacheRef.current.delete(e.entregador_id);
        }
        existing.setPosition(pos);
      } else {
        const marker = new g.maps.Marker({
          position: pos,
          map: mapRef.current,
          title: e.full_name ?? "Entregador",
          icon: pulseIcon(g, 0, color),
        });
        const buildContent = (address: string | null, loadingAddr: boolean) => {
          const curStage = stageRef.current.get(e.entregador_id) ?? "livre";
          const curColor = STAGE_COLORS[curStage];
          const curLabel = STAGE_LABELS[curStage];
          const nome = (e.full_name ?? "Entregador").replace(/</g, "&lt;");
          const fone = e.phone ? e.phone.replace(/</g, "&lt;") : "";
          const enderecoHtml = loadingAddr
            ? `<div style="font-size:12px;color:#cbd5e1;margin-top:6px;display:flex;align-items:center;gap:4px;"><span style="display:inline-block;width:10px;height:10px;border:2px solid #cbd5e1;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;"></span>Buscando endereço...</div>`
            : address
              ? `<div style="font-size:12px;color:#f1f5f9;margin-top:6px;max-width:240px;line-height:1.4;"><span style="color:${curColor};font-weight:600;">📍</span> ${address.replace(/</g, "&lt;")}</div>`
              : `<div style="font-size:12px;color:#cbd5e1;margin-top:6px;">Endereço indisponível</div>`;
          return `<div style="font-family:sans-serif;padding:4px 6px;color:#f8fafc;">
            <div style="font-weight:600;color:#ffffff;">${nome}</div>
            <div style="display:inline-flex;align-items:center;gap:6px;margin-top:4px;padding:2px 8px;border-radius:999px;background:${curColor}22;border:1px solid ${curColor}66;font-size:11px;color:${curColor};font-weight:600;">
              <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${curColor};"></span>${curLabel}
            </div>
            ${fone ? `<div style="font-size:12px;color:#cbd5e1;margin-top:4px;">${fone}</div>` : ""}
            <div style="font-size:11px;color:#94a3b8;margin-top:2px;">Atualizado: ${new Date(e.updated_at).toLocaleTimeString()}</div>
            ${enderecoHtml}
          </div>`;
        };
        marker.addListener("click", async () => {
          if (infoRef.current) infoRef.current.close();
          const info = new g.maps.InfoWindow();
          infoRef.current = info;
          const cached = addressCacheRef.current.get(e.entregador_id);
          info.setContent(buildContent(cached ?? null, !cached));
          info.open({ anchor: marker, map: mapRef.current });
          if (!cached) {
            try {
              const res: any = await runReverseGeocode({ data: { lat: Number(e.lat), lng: Number(e.lng) } });
              const addr = res?.address ?? null;
              if (addr) addressCacheRef.current.set(e.entregador_id, addr);
              info.setContent(buildContent(addr, false));
            } catch {
              info.setContent(buildContent(null, false));
            }
          }
        });
        markersRef.current.set(e.entregador_id, marker);
      }
    }

    // remove marcadores que não estão mais online
    for (const [id, marker] of markersRef.current.entries()) {
      if (!seen.has(id)) {
        marker.setMap(null);
        markersRef.current.delete(id);
        stageRef.current.delete(id);
      }
    }

    if (entregadores.length > 0) {
      mapRef.current.fitBounds(bounds, 60);
      if (entregadores.length === 1) {
        mapRef.current.setZoom(15);
      }
    }
  }, [entregadores]);

  // Pulso neon animado nos marcadores (cor por estágio)
  useEffect(() => {
    const start = performance.now();
    const id = setInterval(() => {
      const g = window.google;
      if (!g?.maps) return;
      const phase = ((performance.now() - start) % 1600) / 1600;
      for (const [entregadorId, marker] of markersRef.current.entries()) {
        const stage = stageRef.current.get(entregadorId) ?? "livre";
        marker.setIcon(pulseIcon(g, phase, STAGE_COLORS[stage]));
      }
    }, 80); // ~12fps
    return () => clearInterval(id);
  }, []);



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
        <div ref={mapDivRef} className="w-full h-[420px] bg-[#0b1220]" />
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
      {/* Legenda dos estágios */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 border-t border-white/10 bg-[#0b1220]">
        {(Object.keys(STAGE_COLORS) as Stage[]).map((s) => (
          <div key={s} className="flex items-center gap-1.5 text-[11px] text-slate-300">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: STAGE_COLORS[s], boxShadow: `0 0 6px ${STAGE_COLORS[s]}` }}
            />
            {STAGE_LABELS[s]}
          </div>
        ))}
      </div>
    </div>
  );
}
