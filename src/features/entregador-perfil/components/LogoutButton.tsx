import { LogOut } from "lucide-react";

type Props = {
  loading: boolean;
  onClick: () => void;
};

export function LogoutButton({ loading, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="mt-3 w-full flex items-center gap-4 px-2 py-4 text-left active:bg-white/[0.03] transition-colors disabled:opacity-60"
      style={{ color: "oklch(0.72 0.18 27)" }}
    >
      <LogOut className="h-5 w-5 shrink-0" strokeWidth={1.8} />
      <span className="flex-1 text-[15px] font-bold">
        {loading ? "Saindo..." : "Encerrar Sessão"}
      </span>
    </button>
  );
}
