import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { reverseGeocode } from "@/lib/reverse-geocode.functions";
import { useCidadesDisponiveis, type CidadeDisponivel } from "@/features/clientes-cidade/hooks/use-cidades-disponiveis";
import type { ClientesIndexStatus } from "../logic/types";

const CIDADE_CACHE_KEY = "cliente-cidade-detectada";

function norm(s: string | null | undefined) {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function pegarPosicao(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null),
      { enableHighAccuracy: false, maximumAge: 10 * 60_000, timeout: 8_000 },
    );
  });
}

export function useRedirectCidadeCliente() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<ClientesIndexStatus>("loading");
  const { data: cidades, isLoading: carregandoCidades } = useCidadesDisponiveis();

  useEffect(() => {
    if (carregandoCidades) return;
    let cancelled = false;
    const lista: CidadeDisponivel[] = cidades ?? [];

    function irPara(cidade: string, uf?: string | null) {
      try {
        localStorage.setItem(CIDADE_CACHE_KEY, JSON.stringify({ cidade, uf: uf ?? null }));
      } catch {
        /* ignore */
      }
      navigate({
        to: "/clientes/$cidade",
        params: { cidade: encodeURIComponent(cidade) },
        search: uf ? { uf: uf.toUpperCase() } : {},
        replace: true,
      });
    }

    function casar(cidade: string | null, uf?: string | null): CidadeDisponivel | null {
      const c = norm(cidade);
      if (!c) return null;
      return (
        lista.find((x) => norm(x.cidade) === c && (!uf || !x.estado || norm(x.estado) === norm(uf))) ??
        lista.find((x) => norm(x.cidade) === c) ??
        null
      );
    }

    (async () => {
      // 1) cidade do cadastro (usuário logado)
      const { data: auth } = await supabase.auth.getUser();
      if (cancelled) return;
      if (auth.user) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("cidade, estado")
          .eq("id", auth.user.id)
          .maybeSingle();
        if (cancelled) return;
        const c = (prof as any)?.cidade as string | null | undefined;
        const uf = (prof as any)?.estado as string | null | undefined;
        if (c && c.trim()) {
          irPara(c.trim(), uf?.trim());
          return;
        }
      }

      // 2) última cidade detectada
      try {
        const raw = localStorage.getItem(CIDADE_CACHE_KEY);
        if (raw) {
          const cached = JSON.parse(raw) as { cidade?: string; uf?: string | null };
          if (cached?.cidade) {
            irPara(cached.cidade, cached.uf);
            return;
          }
        }
      } catch {
        /* ignore */
      }

      // 3) GPS + reverse geocode
      const pos = await pegarPosicao();
      if (cancelled) return;
      if (pos) {
        try {
          const res = await reverseGeocode({
            data: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          });
          if (cancelled) return;
          const match = casar(res?.cidade ?? null, res?.uf ?? null);
          if (match) {
            irPara(match.cidade, match.estado);
            return;
          }
          if (res?.cidade) {
            irPara(res.cidade, res.uf);
            return;
          }
        } catch {
          /* ignore */
        }
      }

      // 4) só uma cidade atendida? vai direto
      if (lista.length === 1) {
        irPara(lista[0].cidade, lista[0].estado);
        return;
      }

      setStatus(auth.user ? "no-city" : "guest");
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, cidades, carregandoCidades]);

  return status;
}
