import { useRef } from "react";
import { BadgeCheck, User } from "lucide-react";
import { AvatarImg } from "@/components/AvatarImg";

type Props = {
  fullName: string;
  idCurto: string;
  avatarUrl: string | null;
  uploading: boolean;
  onPickFile: (file: File | null) => void;
};

export function PerfilHeader({ fullName, idCurto, avatarUrl, uploading, onPickFile }: Props) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col items-center pt-2 pb-6">
      <div className="relative">
        <button
          type="button"
          onClick={() => galleryRef.current?.click()}
          disabled={uploading}
          className="h-28 w-28 rounded-3xl overflow-hidden bg-white/[0.04] border border-white/10 flex items-center justify-center disabled:opacity-60"
          aria-label="Trocar foto"
        >
          {avatarUrl ? (
            <AvatarImg
              src={avatarUrl}
              alt="Foto"
              className="h-full w-full object-cover"
              fallback={<User className="h-10 w-10 text-white/30" />}
            />
          ) : (
            <User className="h-10 w-10 text-white/30" />
          )}
        </button>
        <div
          className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full flex items-center justify-center shadow-[0_6px_18px_-6px_oklch(0.55_0.22_27_/_0.7)]"
          style={{
            background: "linear-gradient(135deg, oklch(0.72 0.18 27), oklch(0.55 0.22 27))",
          }}
        >
          <BadgeCheck className="h-4 w-4 text-white" strokeWidth={2.5} />
        </div>
      </div>
      <h1 className="mt-4 text-2xl font-extrabold text-white tracking-tight text-center">
        {fullName || "Entregador"}
      </h1>
      <p className="mt-1 text-[11px] font-mono uppercase tracking-[0.18em] text-white/45">
        ID: {idCurto}
      </p>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          onPickFile(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          onPickFile(e.target.files?.[0] ?? null);
          e.target.value = "";
        }}
      />
    </div>
  );
}
