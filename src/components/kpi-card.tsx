import type { ReactNode } from "react";
import { Card } from "@/components/ui/card.tsx";
import { cn } from "@/lib/utils.ts";

export function KpiCard({ label, value, subtext, icon, accent, onClick }: { label: string; value: ReactNode; subtext?: string; icon: ReactNode; accent?: "primary" | "emerald" | "sky" | "amber" | "purple" | "red"; onClick?: () => void }) {
  const accentClasses: Record<string, string> = { primary: "bg-primary/10 text-primary", emerald: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400", sky: "bg-sky-500/12 text-sky-600 dark:text-sky-400", amber: "bg-amber-500/12 text-amber-600 dark:text-amber-400", purple: "bg-purple-500/12 text-purple-600 dark:text-purple-400", red: "bg-red-500/12 text-red-600 dark:text-red-400" };
  return (
    <Card onClick={onClick} className={cn("gap-3 py-4 px-4 transition-all hover:shadow-md", onClick && "cursor-pointer hover:-translate-y-0.5")}>
      <div className="flex items-start justify-between">
        <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", accentClasses[accent ?? "primary"])}>
          {icon}
        </div>
      </div>
      <div className="space-y-0.5">
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        <p className="text-sm font-medium text-foreground/80">{label}</p>
        {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
      </div>
    </Card>
  );
}
