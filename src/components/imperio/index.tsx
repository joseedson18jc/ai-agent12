import type { CSSProperties, ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────
   Óticas Império UI kit — shared building blocks for every page.
   Palette lives in src/index.css (navy primary, gold accent).
   ───────────────────────────────────────────────────────────── */

/** Ordered chart palette: navy, gold, teal, terracotta, slate, then tints. */
export const CHART_COLORS = [
  "hsl(223 58% 30%)",
  "hsl(39 72% 50%)",
  "hsl(172 45% 34%)",
  "hsl(12 60% 52%)",
  "hsl(215 16% 58%)",
  "hsl(223 45% 55%)",
  "hsl(39 60% 70%)",
  "hsl(172 35% 55%)",
];

export const CHART = {
  navy: CHART_COLORS[0],
  gold: CHART_COLORS[1],
  teal: CHART_COLORS[2],
  terracotta: CHART_COLORS[3],
  slate: CHART_COLORS[4],
  grid: "hsl(36 20% 90%)",
  axis: "hsl(222 12% 50%)",
};

/** Shared Recharts props so every chart reads as one system. */
export const chartAxisProps = {
  stroke: CHART.axis,
  tick: { fontSize: 11, fill: CHART.axis },
  tickLine: false,
  axisLine: false,
} as const;

export const chartTooltipProps = {
  contentStyle: {
    borderRadius: 12,
    border: "1px solid hsl(36 20% 87%)",
    boxShadow: "0 14px 32px -10px hsl(224 45% 12% / 0.18)",
    fontSize: 12,
    padding: "8px 12px",
  } as CSSProperties,
  cursor: { fill: "hsl(40 45% 94% / 0.6)" },
};

/** Stagger helper for the page-load reveal. */
export const rise = (i: number): { className: string; style: CSSProperties } => ({
  className: "animate-rise",
  style: { animationDelay: `${Math.min(i, 12) * 55}ms` },
});

export function getInitials(name?: string | null) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

/* ── Page header ─────────────────────────────────────────── */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  icon: Icon,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  icon?: ElementType;
}) {
  return (
    <header className="animate-rise mb-6 sm:mb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          {Icon && (
            <div className="hidden sm:flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-gold shadow-sm ring-1 ring-gold/30">
              <Icon className="h-5 w-5" />
            </div>
          )}
          <div className="min-w-0">
            {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
            <h1 className="font-display text-2xl sm:text-[2rem] font-semibold leading-tight text-foreground">
              {title}
            </h1>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
      </div>
      <div className="gold-rule mt-5" />
    </header>
  );
}

/* ── Panel (section card) ────────────────────────────────── */
export function Panel({
  title,
  description,
  actions,
  icon: Icon,
  children,
  className,
  bodyClassName,
  style,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  icon?: ElementType;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  style?: CSSProperties;
}) {
  return (
    <section className={cn("surface overflow-hidden", className)} style={style}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
          <div className="flex items-start gap-2.5 min-w-0">
            {Icon && (
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                <Icon className="h-4 w-4" />
              </div>
            )}
            <div className="min-w-0">
              {title && <h2 className="font-display text-base sm:text-lg font-semibold leading-tight">{title}</h2>}
              {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

/* ── Stat card ───────────────────────────────────────────── */
type Tone = "navy" | "gold" | "success" | "warning" | "danger" | "info" | "neutral";

const TONE: Record<Tone, { chip: string; bar: string }> = {
  navy: { chip: "bg-primary text-gold", bar: "bg-primary" },
  gold: { chip: "bg-gold-soft text-gold-foreground", bar: "bg-gold" },
  success: { chip: "bg-success-soft text-success", bar: "bg-success" },
  warning: { chip: "bg-warning-soft text-warning", bar: "bg-warning" },
  danger: { chip: "bg-danger-soft text-danger", bar: "bg-danger" },
  info: { chip: "bg-info-soft text-info", bar: "bg-info" },
  neutral: { chip: "bg-muted text-muted-foreground", bar: "bg-muted-foreground/40" },
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "navy",
  featured = false,
  onClick,
  className,
  style,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ElementType;
  tone?: Tone;
  /** Featured cards render on the dark ink surface — use for the one headline number. */
  featured?: boolean;
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
}) {
  const t = TONE[tone];
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      style={style}
      className={cn(
        "group relative overflow-hidden rounded-2xl border p-4 sm:p-5 text-left transition-all",
        featured
          ? "ink-texture border-transparent text-sidebar-foreground shadow-lg"
          : "bg-card border-border shadow-sm",
        onClick && "hover:-translate-y-0.5 hover:shadow-md cursor-pointer",
        className,
      )}
    >
      {!featured && <span className={cn("absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full", t.bar)} />}
      <div className="flex items-start justify-between gap-3">
        <p className={cn("text-xs font-medium leading-tight", featured ? "text-sidebar-foreground/70" : "text-muted-foreground")}>
          {label}
        </p>
        {Icon && (
          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              featured ? "bg-white/10 text-gold" : t.chip,
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <p
        className={cn(
          "num mt-2 font-display text-xl sm:text-2xl font-semibold leading-none tracking-tight",
          featured ? "text-white" : "text-foreground",
        )}
      >
        {value}
      </p>
      {hint && (
        <p className={cn("mt-2 text-xs", featured ? "text-sidebar-foreground/60" : "text-muted-foreground")}>{hint}</p>
      )}
    </Comp>
  );
}

/* ── Empty state ─────────────────────────────────────────── */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: ElementType;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      <div className="relative mb-4">
        <div className="absolute inset-0 rounded-full bg-gold/15 blur-xl" />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-gold/30 bg-gold-soft text-gold-foreground">
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ── Status pill ─────────────────────────────────────────── */
export function StatusPill({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  const map: Record<Tone, string> = {
    navy: "bg-primary/10 text-primary",
    gold: "bg-gold-soft text-gold-foreground",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
    info: "bg-info-soft text-info",
    neutral: "bg-muted text-muted-foreground",
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap", map[tone])}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {children}
    </span>
  );
}

/* ── Initials avatar ─────────────────────────────────────── */
export function InitialsAvatar({ name, size = "md", className }: { name?: string | null; size?: "sm" | "md" | "lg"; className?: string }) {
  const s = size === "sm" ? "h-8 w-8 text-[11px]" : size === "lg" ? "h-14 w-14 text-base" : "h-10 w-10 text-xs";
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-gold ring-2 ring-card",
        s,
        className,
      )}
    >
      {getInitials(name)}
    </div>
  );
}

/* ── AI insight card (used by Dashboard, Reports, forms) ─── */
export function InsightCard({
  icon: Icon,
  title,
  children,
  tone = "info",
  action,
}: {
  icon: ElementType;
  title: string;
  children?: ReactNode;
  tone?: "success" | "warning" | "info" | "danger" | "gold";
  action?: ReactNode;
}) {
  const map = {
    success: "text-success bg-success-soft",
    warning: "text-warning bg-warning-soft",
    info: "text-info bg-info-soft",
    danger: "text-danger bg-danger-soft",
    gold: "text-gold-foreground bg-gold-soft",
  };
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-3.5 transition-colors hover:border-gold/40">
      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", map[tone])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug">{title}</p>
        {children && <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{children}</div>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}

/* ── Brand mark ──────────────────────────────────────────── */
export function BrandMark({ className }: { className?: string }) {
  // Stylised pair of lenses beneath a crown point — "Império" optics
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" aria-hidden="true">
      <path d="M13 11.5l3.5 3 3.5-5 3.5 5 3.5-3-1.4 6H14.4L13 11.5z" fill="currentColor" />
      <circle cx="12.5" cy="25" r="6" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="27.5" cy="25" r="6" stroke="currentColor" strokeWidth="2.2" />
      <path d="M18.5 24.2c1-.9 2-.9 3 0" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
