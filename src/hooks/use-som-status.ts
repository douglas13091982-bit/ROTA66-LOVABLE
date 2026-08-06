import { useState, useEffect } from "react";
import { pararNotificacao } from "@/lib/notificacao-som";

export function useSomStatus() {
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    function handleStatus(e: any) {
      setPlaying(!!e.detail?.playing);
    }
    window.addEventListener("notificacao-som:status", handleStatus);
    return () => window.removeEventListener("notificacao-som:status", handleStatus);
  }, []);

  return { playing, stop: pararNotificacao };
}
