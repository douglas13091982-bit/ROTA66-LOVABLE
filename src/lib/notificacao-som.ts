import { supabase } from "@/integrations/supabase/client";

export type SomScope = "entregador" | "loja";

export type ConfigNotificacaoSom = {
  id: string;
  scope?: SomScope;
  ativo: boolean;
  volume: number;
  frequencia_inicial: number;
  frequencia_final: number;
  duracao_ms: number;
  repeticoes: number;
  intervalo_ms: number;
  tipo_onda: string;
  vibrar: boolean;
  audio_path: string | null;
};

export const DEFAULT_SOM: ConfigNotificacaoSom = {
  id: "",
  scope: "entregador",
  ativo: true,
  volume: 0.6,
  frequencia_inicial: 880,
  frequencia_final: 440,
  duracao_ms: 300,
  repeticoes: 1,
  intervalo_ms: 250,
  tipo_onda: "sine",
  vibrar: true,
  audio_path: null,
};

export const SOM_BUCKET = "notificacao-som";

let currentAudioCtx: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;

// AudioContext principal usado tanto para o beep sintético quanto para
// tocar o MP3 pré-carregado via Web Audio API (contorna restrições de
// autoplay do <audio> em Android/iOS).
let mainAudioCtx: AudioContext | null = null;
let audioUnlocked = false;

// Buffer decodificado do MP3 configurado pelo admin.
let unlockedAudioUrl: string | null = null;
let unlockedAudioBuffer: AudioBuffer | null = null;

function getOrCreateCtx(): AudioContext | null {
  if (mainAudioCtx) return mainAudioCtx;
  try {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;
    mainAudioCtx = new AudioCtx();
    return mainAudioCtx;
  } catch {
    return null;
  }
}

export async function fetchConfigSom(scope: SomScope = "entregador"): Promise<ConfigNotificacaoSom> {
  const { data } = await supabase
    .from("config_notificacao_som" as any)
    .select("*")
    .eq("scope", scope)
    .limit(1)
    .maybeSingle();
  return { ...DEFAULT_SOM, scope, ...((data as any) ?? {}) };
}

/** Gera URL assinada (válida por 1h) para o arquivo de som. */
export async function getAudioUrl(audioPath: string | null): Promise<string | null> {
  if (!audioPath) return null;
  const { data } = await supabase.storage
    .from(SOM_BUCKET)
    .createSignedUrl(audioPath, 3600);
  return data?.signedUrl ?? null;
}

/**
 * Pré-carrega o MP3 decodificando em AudioBuffer. Assim, na hora de tocar,
 * basta chamar start() sobre um BufferSource — sem passar por <audio>,
 * evitando o bloqueio de autoplay quando a "cadeia de gesto" não é respeitada.
 */
export async function precarregarSom(cfg: ConfigNotificacaoSom): Promise<boolean> {
  if (!cfg?.audio_path) return false;
  const url = await getAudioUrl(cfg.audio_path);
  if (!url) return false;
  if (unlockedAudioUrl === url && unlockedAudioBuffer) return true;
  try {
    const ctx = getOrCreateCtx();
    if (!ctx) return false;
    const resp = await fetch(url);
    if (!resp.ok) return false;
    const arr = await resp.arrayBuffer();
    // decodeAudioData retorna Promise em navegadores modernos.
    const buf = await new Promise<AudioBuffer>((resolve, reject) => {
      try {
        const p = ctx.decodeAudioData(arr, resolve, reject);
        if (p && typeof (p as any).then === "function") (p as any).then(resolve, reject);
      } catch (e) {
        reject(e);
      }
    });
    unlockedAudioBuffer = buf;
    unlockedAudioUrl = url;
    return true;
  } catch {
    return false;
  }
}

export function isAudioDesbloqueado() {
  return audioUnlocked;
}

/**
 * Destrava reprodução de áudio. DEVE ser chamado dentro de um handler
 * de gesto do usuário (click/touchstart). Retoma o AudioContext, que é
 * a única coisa que precisa de gesto — depois, qualquer BufferSource toca.
 */
export function desbloquearAudio() {
  if (audioUnlocked) return;
  const ctx = getOrCreateCtx();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") {
      const p = ctx.resume();
      if (p && typeof p.then === "function") {
        p.then(() => { audioUnlocked = ctx.state === "running"; }).catch(() => {});
      }
    }
    // Tocar um buffer silencioso curto dentro do gesto satisfaz iOS Safari.
    const silent = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = silent;
    src.connect(ctx.destination);
    src.start(0);
    if (ctx.state === "running") audioUnlocked = true;
  } catch {}
}

/** Registra listeners globais que destravam o áudio no primeiro toque/clique. */
export function instalarDesbloqueioAutomatico() {
  if (typeof window === "undefined") return;
  if ((window as any).__somUnlockInstalled) return;
  (window as any).__somUnlockInstalled = true;
  const handler = () => {
    desbloquearAudio();
    if (audioUnlocked) {
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("touchstart", handler);
      window.removeEventListener("click", handler);
      window.removeEventListener("keydown", handler);
    }
  };
  window.addEventListener("pointerdown", handler, { passive: true });
  window.addEventListener("touchstart", handler, { passive: true });
  window.addEventListener("click", handler, { passive: true });
  window.addEventListener("keydown", handler, { passive: true });
}

export function pararNotificacao() {
  try {
    if (currentSource) {
      try { currentSource.stop(); } catch {}
      try { currentSource.disconnect(); } catch {}
      currentSource = null;
    }
  } catch {}
  try {
    if (currentAudioCtx && currentAudioCtx !== mainAudioCtx) {
      currentAudioCtx.suspend();
      currentAudioCtx.close();
    }
    currentAudioCtx = null;
  } catch {}
}

export function tocarBeepSintetico(cfg: ConfigNotificacaoSom) {
  try {
    pararNotificacao();
    const ctx = getOrCreateCtx();
    if (!ctx) return;
    currentAudioCtx = ctx;
    const dur = Math.max(50, cfg.duracao_ms) / 1000;
    const gap = Math.max(0, cfg.intervalo_ms) / 1000;
    const rep = Math.max(1, Math.min(10, cfg.repeticoes));
    const vol = Math.max(0, Math.min(1, cfg.volume));
    const tipo = (["sine", "square", "sawtooth", "triangle"].includes(cfg.tipo_onda)
      ? cfg.tipo_onda
      : "sine") as OscillatorType;
    for (let i = 0; i < rep; i++) {
      const start = ctx.currentTime + i * (dur + gap);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = tipo;
      osc.frequency.setValueAtTime(cfg.frequencia_inicial, start);
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, cfg.frequencia_final),
        start + dur,
      );
      gain.gain.setValueAtTime(vol, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + dur);
      osc.start(start);
      osc.stop(start + dur);
    }
  } catch {}
}

function tocarArquivoPreCarregado(cfg: ConfigNotificacaoSom): boolean {
  if (!unlockedAudioBuffer) return false;
  const ctx = getOrCreateCtx();
  if (!ctx) return false;
  try {
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    pararNotificacao();
    const src = ctx.createBufferSource();
    src.buffer = unlockedAudioBuffer;
    const gain = ctx.createGain();
    gain.gain.value = Math.max(0, Math.min(1, cfg.volume));
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start(0);
    currentSource = src;
    currentAudioCtx = ctx;
    src.onended = () => {
      if (currentSource === src) currentSource = null;
    };
    return true;
  } catch {
    return false;
  }
}


const MUTE_KEY = "notificacao-som:mutado";

export function isNotificacaoMutada(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setNotificacaoMutada(mutado: boolean) {
  try {
    if (mutado) {
      window.localStorage.setItem(MUTE_KEY, "1");
      pararNotificacao();
    } else {
      window.localStorage.removeItem(MUTE_KEY);
    }
    try {
      window.dispatchEvent(new CustomEvent("notificacao-som:mute-changed", { detail: { mutado } }));
    } catch {}
  } catch {}
}

export function tocarNotificacao(cfg: ConfigNotificacaoSom) {
  if (!cfg?.ativo) return;
  if (isNotificacaoMutada()) return;
  try {
    if (cfg.vibrar && typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
  } catch {}
  // IMPORTANTE: usamos APENAS o elemento já pré-carregado para evitar
  // quebrar a "cadeia de gesto" no Android (await + new Audio + play falha).
  if (cfg.audio_path && tocarArquivoPreCarregado(cfg)) return;
  tocarBeepSintetico(cfg);
}
