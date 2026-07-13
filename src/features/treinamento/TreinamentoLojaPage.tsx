import { useState } from "react";
import { GraduationCap, PlayCircle } from "lucide-react";
import { useTreinamentoVideos, type TreinamentoVideo } from "./hooks/use-treinamento-videos";
import { getYoutubeEmbed, getYoutubeThumb } from "@/lib/youtube";

export function TreinamentoLojaPage() {
  const { data: videos, isLoading } = useTreinamentoVideos();
  const [selected, setSelected] = useState<TreinamentoVideo | null>(null);

  const active = selected ?? videos?.[0] ?? null;
  const embed = active ? getYoutubeEmbed(active.youtube_url) : null;

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-white/[0.04] border border-white/10 grid place-items-center">
          <GraduationCap className="h-5 w-5 text-white/80" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">Treinamento</h1>
          <p className="text-[12px] text-white/50">Vídeos para aprender a usar o sistema</p>
        </div>
      </header>

      {isLoading ? (
        <div className="text-white/50 text-sm">Carregando vídeos...</div>
      ) : !videos || videos.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-10 text-center">
          <PlayCircle className="h-10 w-10 text-white/30 mx-auto mb-3" />
          <div className="text-white/70 font-medium">Nenhum vídeo disponível ainda</div>
          <div className="text-[12px] text-white/40 mt-1">Assim que novos treinamentos forem publicados aparecerão aqui.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {active && embed ? (
              <>
                <div className="aspect-video w-full rounded-xl overflow-hidden border border-white/10 bg-black">
                  <iframe
                    key={active.id}
                    src={embed}
                    title={active.titulo}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <div>
                  <h2 className="text-white font-semibold text-lg">{active.titulo}</h2>
                  {active.descricao && (
                    <p className="text-white/60 text-sm mt-1 whitespace-pre-wrap">{active.descricao}</p>
                  )}
                </div>
              </>
            ) : (
              <div className="aspect-video w-full rounded-xl border border-white/10 bg-white/[0.02] grid place-items-center text-white/40 text-sm">
                Selecione um vídeo
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="pp-eyebrow px-1">Aulas ({videos.length})</div>
            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
              {videos.map((v) => {
                const thumb = getYoutubeThumb(v.youtube_url);
                const isActive = active?.id === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelected(v)}
                    className={`w-full text-left flex gap-3 p-2 rounded-lg border transition ${
                      isActive
                        ? "border-white/25 bg-white/[0.06]"
                        : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="relative shrink-0 w-24 aspect-video rounded-md overflow-hidden bg-black">
                      {thumb ? (
                        <img src={thumb} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full grid place-items-center text-white/40">
                          <PlayCircle className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium text-white line-clamp-2">{v.titulo}</div>
                      {v.descricao && (
                        <div className="text-[11px] text-white/50 line-clamp-2 mt-0.5">{v.descricao}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
