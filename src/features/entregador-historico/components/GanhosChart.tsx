import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { Bucket, Periodo } from "../logic/types";
import {
  chartGridColor,
  chartHoverFill,
  chartTextColor,
  chartTooltipBg,
} from "../logic/chart-theme";

export function GanhosChart({
  chartData,
  periodo,
}: {
  chartData: Bucket[];
  periodo: Periodo;
}) {
  return (
    <div className="p-5 mb-6">
      <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
        Ganhos por {periodo === "semanal" ? "dia" : "mês"}
      </div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="barGanho" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#AE0000" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#8A0000" stopOpacity={0.75} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} vertical={false} opacity={0.4} />
            <XAxis
              dataKey="label"
              stroke={chartTextColor}
              tick={{ fontSize: 11, fill: chartTextColor }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke={chartTextColor}
              tick={{ fontSize: 11, fill: chartTextColor }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `R$${Math.round(v)}`}
            />
            <Tooltip
              cursor={{ fill: chartHoverFill }}
              wrapperStyle={{ outline: "none" }}
              contentStyle={{
                background: chartTooltipBg,
                border: `1px solid ${chartGridColor}`,
                borderRadius: 12,
                fontSize: 12,
                backdropFilter: "blur(12px)",
                boxShadow: "0 10px 30px -10px oklch(0 0 0 / 0.3)",
                color: chartTextColor,
              }}
              itemStyle={{ color: chartTextColor }}
              formatter={(v: number) => [`R$ ${v.toFixed(2)}`, "Ganho"]}
              labelStyle={{ color: chartTextColor }}
            />
            <Bar dataKey="valor" fill="url(#barGanho)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
