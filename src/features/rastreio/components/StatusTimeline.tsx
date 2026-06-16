import { STATUS_STEPS } from "../logic/types";

export function StatusTimeline({ status }: { status: string }) {
  const currentStepIdx = STATUS_STEPS.findIndex((s) => (s.matches as readonly string[]).includes(status));
  return (
    <div className="bg-card border border-border rounded-lg p-5 shadow-card">
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Status do pedido</p>
      <div className="space-y-3">
        {STATUS_STEPS.map((step, idx) => {
          const Icon = step.icon;
          const done = idx <= currentStepIdx;
          const current = idx === currentStepIdx;
          return (
            <div key={step.key} className="flex items-center gap-3">
              <div
                className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                  done
                    ? current
                      ? "bg-gradient-red shadow-red text-primary-foreground"
                      : "bg-emerald-500 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span className={`text-sm ${current ? "font-bold" : done ? "" : "text-muted-foreground"}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
