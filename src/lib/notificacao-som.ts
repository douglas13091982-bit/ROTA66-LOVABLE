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
let currentAudioEl: HTMLAudioElement | null = null;

// Elemento <audio> pré-criado e "destravado" por um gesto do usuário.
let unlockedAudioEl: HTMLAudioElement | null = null;
let unlockedAudioUrl: string | null = null;
let audioUnlocked = false;
let unlockedAudioCtx: AudioContext | null = null;

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
 * Pré-carrega o arquivo MP3 no elemento <audio> reutilizável.
 * Deve ser chamado assim que a config estiver disponível, ANTES do pedido chegar.
 */
export async function precarregarSom(cfg: ConfigNotificacaoSom): Promise<void> {
  if (!cfg?.audio_path) return;
  const url = await getAudioUrl(cfg.audio_path);
  if (!url) return;
  if (!unlockedAudioEl) {
    unlockedAudioEl = new Audio();
    unlockedAudioEl.preload = "auto";
  }
  if (unlockedAudioUrl !== url) {
    unlockedAudioEl.src = url;
    unlockedAudioUrl = url;
    try { unlockedAudioEl.load(); } catch {}
  }
}

/**
 * Destrava reprodução de áudio. DEVE ser chamado dentro de um handler
 * de gesto do usuário (click/touchstart). Faz um play() mudo+pausa para
 * autorizar futuras chamadas .play() sem gesto.
 */
export function isAudioDesbloqueado() {
  return audioUnlocked;
}

// WAV silencioso curto — usado para "primar" o <audio> quando o MP3 ainda
// não foi carregado. Tocar QUALQUER áudio dentro do gesto satisfaz a
// política de autoplay (Chrome Android) e libera futuras chamadas .play().
const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

export function desbloquearAudio() {
  if (audioUnlocked) return;
  try {
    if (!unlockedAudioEl) {
      unlockedAudioEl = new Audio();
      unlockedAudioEl.preload = "auto";
    }
    const el = unlockedAudioEl;
    const hadRealSrc = !!unlockedAudioUrl && el.src === unlockedAudioUrl;
    if (!hadRealSrc) {
      el.src = SILENT_WAV;
    }
    const prevVol = el.volume;
    el.volume = 0; // inaudível, mas reprodução real (não muted)
    const p = el.play();
    const finish = () => {
      try { el.pause(); } catch {}
      try { el.currentTime = 0; } catch {}
      el.volume = prevVol;
      audioUnlocked = true;
    };
    if (p && typeof p.then === "function") {
      p.then(finish).catch(() => { el.volume = prevVol; });
    } else {
      finish();
    }
  } catch {}
  try {
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx && !unlockedAudioCtx) {
      const ctx: AudioContext = new AudioCtx();
      unlockedAudioCtx = ctx;
      if (ctx.state === "suspended") ctx.resume();
    }
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
    if (currentAudioEl) {
      currentAudioEl.pause();
      currentAudioEl.currentTime = 0;
      currentAudioEl = null;
    }
  } catch {}
  try {
    if (currentAudioCtx) {
      currentAudioCtx.suspend();
      currentAudioCtx.close();
      currentAudioCtx = null;
    }
  } catch {}
}

export function tocarBeepSintetico(cfg: ConfigNotificacaoSom) {
  try {
    pararNotificacao();
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
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
    setTimeout(() => {
      if (currentAudioCtx === ctx) currentAudioCtx = null;
      try { ctx.close(); } catch {}
    }, (rep * (dur + gap) + 0.1) * 1000);
  } catch {}
}

function tocarArquivoPreCarregado(cfg: ConfigNotificacaoSom): boolean {
  if (!unlockedAudioEl || !unlockedAudioUrl) return false;
  try {
    pararNotificacao();
    const audio = unlockedAudioEl;
    audio.volume = Math.max(0, Math.min(1, cfg.volume));
    try { audio.currentTime = 0; } catch {}
    currentAudioEl = audio;
    const p = audio.play();
    if (p && typeof p.then === "function") {
      p.catch(() => {
        currentAudioEl = null;
        tocarBeepSintetico(cfg);
      });
    }
    return true;
  } catch {
    return false;
  }
}

export function tocarNotificacao(cfg: ConfigNotificacaoSom) {
  if (!cfg?.ativo) return;
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
