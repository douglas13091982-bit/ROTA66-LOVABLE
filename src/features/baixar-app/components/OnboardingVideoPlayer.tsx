import { useEffect, useRef, useState } from "react";
import { CheckCircle2, PlayCircle, Lock } from "lucide-react";
import { getYoutubeId } from "@/lib/youtube";
import type { OnboardingVideo } from "../hooks/use-onboarding-video";

interface Props {
  video: OnboardingVideo;
  onWatched: () => void;
  watched: boolean;
}

// Loads YT IFrame API once
let ytApiPromise: Promise<any> | null = null;
function loadYouTubeApi(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  const w = window as any;
  if (w.YT && w.YT.Player) return Promise.resolve(w.YT);
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      if (typeof prev === "function") {
        try {
          prev();
        } catch {
          /* noop */
        }
      }
      resolve((window as any).YT);
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.async = true;
    document.head.appendChild(tag);
  });
  return ytApiPromise;
}

export function OnboardingVideoPlayer({ video, onWatched, watched }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [started, setStarted] = useState(false);
  const videoId = getYoutubeId(video.youtube_url);

  useEffect(() => {
    if (!videoId || !containerRef.current) return;
    let cancelled = false;
    let interval: any = null;

    loadYouTubeApi().then((YT) => {
      if (cancelled || !containerRef.current) return;
      playerRef.current = new YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          controls: 1,
          disablekb: 1,
        },
        events: {
          onReady: () => setReady(true),
          onStateChange: (e: any) => {
            const state = e.data;
            // 1 = playing
            if (state === 1) {
              setStarted(true);
              if (!interval) {
                interval = setInterval(() => {
                  try {
                    const p = playerRef.current;
                    if (!p || typeof p.getCurrentTime !== "function") return;
                    const cur = p.getCurrentTime() ?? 0;
                    const dur = p.getDuration() ?? 0;
                    if (dur > 0) {
                      const pct = Math.min(100, Math.round((cur / dur) * 100));
                      setProgressPct(pct);
                      if (pct >= 95) {
                        onWatched();
                      }
                    }
                  } catch {
                    /* noop */
                  }
                }, 1000);
              }
            }
            // 0 = ended
            if (state === 0) {
              setProgressPct(100);
              onWatched();
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      try {
        playerRef.current?.destroy?.();
      } catch {
        /* noop */
      }
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  if (!videoId) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[13px] font-bold text-red-600 dark:text-yellow-400 uppercase tracking-wide">
        <PlayCircle className="h-5 w-5" />
        Assista antes de baixar
      </div>

      {video.descricao && (
        <p className="text-[13px] text-neutral-700 dark:text-white/70 leading-snug">
          {video.descricao}
        </p>
      )}

      <div className="relative aspect-video w-full rounded-xl overflow-hidden border-2 border-red-500/40 bg-black shadow-lg">
        <div ref={containerRef} className="w-full h-full" />
        {!ready && (
          <div className="absolute inset-0 grid place-items-center text-white/70 text-sm bg-black">
            Carregando vídeo…
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="space-y-1">
        <div className="h-2 w-full rounded-full bg-neutral-200 dark:bg-white/10 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              watched ? "bg-emerald-500" : "bg-gradient-red"
            }`}
            style={{ width: `${watched ? 100 : progressPct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-neutral-600 dark:text-white/60">
          <span>
            {watched
              ? "Vídeo concluído — download liberado"
              : started
                ? `Assistindo… ${progressPct}%`
                : "Toque em play para começar"}
          </span>
          {watched ? (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" /> Liberado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-red-600 dark:text-yellow-400 font-semibold">
              <Lock className="h-3.5 w-3.5" /> Bloqueado
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
