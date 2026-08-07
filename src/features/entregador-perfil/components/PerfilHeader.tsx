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
    <div className="flex flex-col items-center pt-4 pb-6">
      <div className="relative">
        <button
          type="button"
          onClick={() => galleryRef.current?.click()}
          disabled={uploading}
          className="h-32 w-32 rounded-full overflow-hidden bg-white/[0.04] border border-white/10 flex items-center justify-center disabled:opacity-60"
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
          className="absolute bottom-0 right-0 h-11 w-11 rounded-full flex items-center justify-center border-4 border-[color:var(--background)]"
          style={{ background: "#e3000f" }}
        >
          <BadgeCheck className="h-5 w-5 text-white" strokeWidth={2.5} />
        </div>
      </div>
      <h1 className="mt-4 text-[26px] font-extrabold text-white uppercase tracking-tight text-center leading-tight">
        {fullName || "Entregador"}
      </h1>
      <p className="mt-1 text-[15px] text-white/50">ID: {idCurto}</p>

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
