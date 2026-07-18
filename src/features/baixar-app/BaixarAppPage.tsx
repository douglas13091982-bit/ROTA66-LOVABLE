import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Lock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { AuthCard } from "@/components/AuthCard";
import { useBaixarApp } from "./hooks/use-baixar-app";
import { useOnboardingVideoEntregador } from "./hooks/use-onboarding-video";
import { AppHeader } from "./components/AppHeader";
import { DownloadSection } from "./components/DownloadSection";
import { AdminUpload } from "./components/AdminUpload";
import { OnboardingVideoPlayer } from "./components/OnboardingVideoPlayer";

const STORAGE_PREFIX = "rota66:onboarding-visto:";

export function BaixarAppPage() {
  const { user, hasRole, loading: authLoading } = useAuth();
  const isAdmin = hasRole("super_admin");
  const { apks, loading, downloading, uploading, handleDownload, handleUpload } =
    useBaixarApp(authLoading);

  const { data: onboardingVideo } = useOnboardingVideoEntregador(!authLoading);
  const [watched, setWatched] = useState(false);

  // Restore "already watched" from localStorage for this specific video
  useEffect(() => {
    if (!onboardingVideo) return;
    try {
      const v = localStorage.getItem(STORAGE_PREFIX + onboardingVideo.id);
      if (v === "1") setWatched(true);
    } catch {
      /* noop */
    }
  }, [onboardingVideo?.id]);

  const markWatched = () => {
    if (!onboardingVideo) return;
    setWatched(true);
    try {
      localStorage.setItem(STORAGE_PREFIX + onboardingVideo.id, "1");
    } catch {
      /* noop */
    }
  };

  // Admin bypasses the gate
  const gateActive = !!onboardingVideo && !watched && !isAdmin;

  return (
    <AuthCard
      title="BAIXE O APP"
      subtitle="Instale o aplicativo ROTA 66 direto no seu celular Android"
      footer={
        user ? (
          <Link to="/entregador" className="text-primary font-bold hover:underline inline-flex items-center gap-1">
            Ir para o painel <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <Link to="/login" className="text-primary font-bold hover:underline">
            Entrar
          </Link>
        )
      }
    >
      <AppHeader />

      {onboardingVideo && (
        <div className="mb-5">
          <OnboardingVideoPlayer
            video={onboardingVideo}
            onWatched={markWatched}
            watched={watched || isAdmin}
          />
        </div>
      )}

      {loading ? (
        <div className="text-center text-sm text-muted-foreground py-6">Carregando…</div>
      ) : gateActive ? (
        <div className="rounded-xl border-2 border-dashed border-red-400/50 bg-red-500/[0.06] p-5 text-center space-y-2">
          <Lock className="h-6 w-6 mx-auto text-red-500" />
          <div className="text-sm font-bold text-red-600 dark:text-red-300">
            Assista ao vídeo acima para liberar o download
          </div>
          <div className="text-[12px] text-neutral-600 dark:text-white/60">
            O botão de baixar o APK será liberado assim que você concluir a apresentação do aplicativo.
          </div>
        </div>
      ) : (
        <DownloadSection
          apks={apks}
          downloading={downloading}
          isAdmin={isAdmin}
          onDownload={handleDownload}
        />
      )}

      {isAdmin && <AdminUpload uploading={uploading} onUpload={handleUpload} />}
    </AuthCard>
  );
}
