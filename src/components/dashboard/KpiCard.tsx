import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  delta?: number | null; // % vs período anterior
  icon?: LucideIcon;
  progress?: number; // 0-100
  accent?: "vert" | "blue" | "amber" | "rose";
  spark?: number[]; // mini-sparkline values
  invertDelta?: boolean; // when lower-is-better
}

const accentMap = {
  vert: "from-vert-dark via-vert to-vert-light text-white",
  blue: "from-blue-800 via-blue-600 to-blue-400 text-white",
  amber: "from-amber-700 via-amber-500 to-amber-300 text-white",
  rose: "from-rose-800 via-rose-600 to-rose-400 text-white",
};

function Sparkline({ data, filled }: { data: number[]; filled: boolean }) {
  if (!data.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 24;
  const step = data.length > 1 ? w / (data.length - 1) : w;
  const pts = data.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(" ");
  const area = `0,${h} ${pts} ${w},${h}`;
  const stroke = filled ? "rgba(255,255,255,0.95)" : "var(--vert)";
  const fill = filled ? "rgba(255,255,255,0.18)" : "color-mix(in oklab, var(--vert) 18%, transparent)";
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polygon points={area} fill={fill} />
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function KpiCard({ label, value, sub, delta, icon: Icon, progress, accent, spark, invertDelta }: KpiCardProps) {
  const filled = Boolean(accent);
  const goodDelta = delta != null && (invertDelta ? delta < 0 : delta > 0);
  const badDelta = delta != null && (invertDelta ? delta > 0 : delta < 0);
  const neutralDelta = delta != null && delta === 0;
  const DeltaIcon = neutralDelta ? Minus : goodDelta ? ArrowUpRight : ArrowDownRight;

  return (
    <div
      className={cn(
        "group rounded-xl p-4 border relative overflow-hidden transition-all",
        "hover:shadow-lg hover:-translate-y-0.5",
        filled
          ? `bg-gradient-to-br ${accentMap[accent!]} border-transparent shadow-md`
          : "bg-card border-border hover:border-vert-light/60",
      )}
    >
      {/* Accent ring decoration */}
      {filled && (
        <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-white/10 blur-xl pointer-events-none" />
      )}

      <div className="flex items-start justify-between gap-2 relative">
        <div className="min-w-0">
          <div
            className={cn(
              "text-[10px] font-semibold uppercase tracking-[0.08em]",
              filled ? "text-white/75" : "text-muted-foreground",
            )}
          >
            {label}
          </div>
          <div className="stat-number text-[1.65rem] leading-tight mt-1 tabular-nums">{value}</div>
          {sub && (
            <div className={cn("text-[11px] mt-0.5", filled ? "text-white/65" : "text-muted-foreground")}>
              {sub}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {Icon && (
            <div
              className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center",
                filled ? "bg-white/15 backdrop-blur-sm" : "bg-vert-soft text-vert-dark",
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
            </div>
          )}
          {spark && spark.length > 1 && (
            <div className="opacity-90">
              <Sparkline data={spark} filled={filled} />
            </div>
          )}
        </div>
      </div>

      {typeof progress === "number" && (
        <div className="mt-3 relative">
          <div className={cn("h-1 rounded-full overflow-hidden", filled ? "bg-white/20" : "bg-muted")}>
            <div
              className={cn("h-full rounded-full transition-all", filled ? "bg-white" : "bg-vert")}
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>
      )}

      {delta != null && (
        <div
          className={cn(
            "inline-flex items-center gap-1 mt-2 px-1.5 py-0.5 rounded-md text-[11px] font-bold tabular-nums",
            filled
              ? "bg-white/15 text-white"
              : goodDelta
                ? "bg-emerald-50 text-emerald-700"
                : badDelta
                  ? "bg-rose-50 text-rose-700"
                  : "bg-muted text-muted-foreground",
          )}
        >
          <DeltaIcon className="h-3 w-3" />
          {delta > 0 ? "+" : ""}
          {delta.toFixed(0)}%
          <span className={cn("font-normal opacity-70", filled ? "" : "")}>vs ant.</span>
        </div>
      )}
    </div>
  );
}
