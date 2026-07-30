import { Link } from "@tanstack/react-router";
import { Store } from "lucide-react";

export function LojaHeader({ nome, ativa }: { nome: string; ativa: boolean }) {
  return (
    <div className="pp-card pp-hairline-top rounded-2xl p-5 md:p-6 mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4 min-w-0">
        <div
          className="h-14 w-14 rounded-2xl grid place-items-center text-white shrink-0"
          style={{
            background: "linear-gradient(135deg, oklch(0.62 0.22 27), oklch(0.42 0.20 27))",
            boxShadow:
              "0 12px 30px -10px oklch(0.55 0.21 27 / 0.6), inset 0 1px 0 oklch(1 0 0 / 0.15)",
          }}
        >
          <Store className="h-6 w-6" style={{ color: "#ffffff" }} />
        </div>
        <div className="min-w-0">
          <div className="pp-eyebrow">Sua loja</div>
          <h2 className="text-2xl md:text-[26px] font-semibold text-white truncate tracking-tight mt-0.5">
            {nome}
          </h2>
          <p className="text-[12.5px] text-white/55 mt-1 flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${ativa ? "pp-dot-online" : "pp-dot-offline"}`}
            />
            {ativa ? "Aberta agora" : "Fechada"}
          </p>
        </div>
      </div>
      <Link to="/loja/pedidos" className="pp-cta">
        Ver pedidos
      </Link>
    </div>
  );
}
