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
      className="mt-4 w-full flex items-center justify-center gap-3 px-4 py-5 rounded-2xl border border-white/10 bg-white/[0.03] active:bg-white/[0.06] transition-colors disabled:opacity-60"
      style={{ color: "#E01818" }}
    >
      <LogOut className="h-5 w-5 shrink-0" strokeWidth={2} />
      <span className="text-[17px] font-bold">{loading ? "Saindo..." : "Sair da conta"}</span>
    </button>
  );
}
