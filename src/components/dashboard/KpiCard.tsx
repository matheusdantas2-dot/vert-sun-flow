import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  trend?: { value: string; positive?: boolean };
  icon?: LucideIcon;
  progress?: number; // 0-100
  accent?: "vert" | "blue" | "amber" | "rose";
}

const accentMap = {
  vert: "from-vert-dark to-vert text-white",
  blue: "from-blue-700 to-blue-500 text-white",
  amber: "from-amber-600 to-amber-400 text-white",
  rose: "from-rose-700 to-rose-500 text-white",
};

export function KpiCard({ label, value, sub, trend, icon: Icon, progress, accent }: KpiCardProps) {
  const filled = Boolean(accent);
  return (
    <div
      className={cn(
        "rounded-xl p-5 border border-border relative overflow-hidden",
        filled ? `bg-gradient-to-br ${accentMap[accent!]}` : "bg-card",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div
            className={cn(
              "text-[11px] font-semibold uppercase tracking-wider",
              filled ? "text-white/70" : "text-muted-foreground",
            )}
          >
            {label}
          </div>
          <div className="stat-number text-3xl mt-1.5">{value}</div>
          {sub && (
            <div className={cn("text-xs mt-1", filled ? "text-white/65" : "text-muted-foreground")}>
              {sub}
            </div>
          )}
        </div>
        {Icon && (
          <div
            className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
              filled ? "bg-white/15" : "bg-vert-soft text-vert-dark",
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      {typeof progress === "number" && (
        <div className="mt-3">
          <div className={cn("h-1.5 rounded-full overflow-hidden", filled ? "bg-white/20" : "bg-muted")}>
            <div
              className={cn("h-full rounded-full", filled ? "bg-vert-glow" : "bg-vert-light")}
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>
      )}
      {trend && (
        <div
          className={cn(
            "text-xs mt-2 font-semibold",
            trend.positive ? "text-vert-glow" : "text-rose-300",
            !filled && (trend.positive ? "text-vert" : "text-rose-600"),
          )}
        >
          {trend.value}
        </div>
      )}
    </div>
  );
}
