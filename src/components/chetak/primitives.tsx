import { cn } from "@/lib/utils";
import { slaInfo, initials, type SlaState } from "@/lib/chetak/format";
import { useTicketStore } from "@/lib/chetak/store";
import type {
  Ticket,
  TicketPriority,
  TicketStatus,
} from "@/lib/chetak/types";
import { ArrowUpRight } from "lucide-react";
import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { Link } from "react-router";

/* -------------------------------------------------------------------------- */
/* Brand                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Official Chetak marks supplied under `/public/assets`.
 * - `CHETAK_ROUNDEL` is the teal circular badge with a transparent background,
 *   so it sits directly on the dark indigo surfaces.
 * - `CHETAK_WORDMARK` is the metallic script signature on white, which is
 *   blended into light surfaces instead of showing a white plate.
 */
export const CHETAK_ROUNDEL = "/assets/chetak_logo.png";
export const CHETAK_WORDMARK = "/assets/chetak-logo.jpg";

type SurfaceTone = "light" | "dark";

function parseColor(value: string): [number, number, number, number] | null {
  const match = value.match(/rgba?\(([^)]+)\)/);
  if (!match) return null;
  const parts = match[1]
    .split(/[,\s/]+/)
    .filter(Boolean)
    .map(Number);
  if (parts.length < 3 || parts.some((part) => Number.isNaN(part))) {
    return null;
  }
  return [parts[0], parts[1], parts[2], parts.length > 3 ? parts[3] : 1];
}

function relativeLuminance(r: number, g: number, b: number): number {
  const channel = (value: number) => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/**
 * Finds the colour a mark actually sits on by walking the ancestor chain, so
 * the logo variant never has to be chosen by hand. Only solid backgrounds are
 * trusted — gradient overlays are skipped because their average colour cannot
 * be sampled from computed styles.
 */
function detectSurfaceTone(element: Element | null): SurfaceTone {
  let node: Element | null = element;
  while (node) {
    const styles = window.getComputedStyle(node);
    const parsed = parseColor(styles.backgroundColor);
    const hasGradient = styles.backgroundImage !== "none";
    if (parsed && parsed[3] > 0.9 && !hasGradient) {
      return relativeLuminance(parsed[0], parsed[1], parsed[2]) > 0.5
        ? "light"
        : "dark";
    }
    node = node.parentElement;
  }
  return "light";
}

/** Measures before paint, and again on resize, so marks never flash wrong. */
function useSurfaceTone(ref: RefObject<Element | null>): SurfaceTone {
  const [tone, setTone] = useState<SurfaceTone>("light");

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setTone(detectSurfaceTone(element));
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [ref]);

  return tone;
}

/**
 * Brand mark that swaps with the surface behind it: the metallic script
 * wordmark on the ivory/white canvas, the transparent roundel on indigo.
 * Pass `surface` only to override the automatic choice.
 */
export function ChetakLogo({
  className,
  surface = "auto",
}: {
  className?: string;
  surface?: "auto" | SurfaceTone;
}) {
  const ref = useRef<HTMLImageElement | null>(null);
  const detected = useSurfaceTone(ref);
  const tone: SurfaceTone = surface === "auto" ? detected : surface;

  if (tone === "dark") {
    return (
      <img
        ref={ref}
        src={CHETAK_ROUNDEL}
        alt="Chetak"
        className={cn("size-10 shrink-0 select-none object-contain", className)}
      />
    );
  }

  return (
    <img
      ref={ref}
      src={CHETAK_WORDMARK}
      alt="Chetak"
      className={cn("h-auto w-40 select-none mix-blend-multiply", className)}
    />
  );
}

/**
 * Full lockup. The composition follows the surface too: on indigo the roundel
 * carries a text lockup, on the light canvas the script wordmark is used.
 */
export function ChetakMark({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const tone = useSurfaceTone(ref);

  return (
    <span ref={ref} className={cn("flex items-center gap-3", className)}>
      <ChetakLogo surface={tone} className="size-11" />
      {tone === "dark" ? (
        <span className="grid leading-none">
          <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-ivory/45">
            Chetak Service
          </span>
          <span className="mt-2 text-[15px] font-semibold tracking-[-0.01em] text-ivory">
            Ticket Executive
          </span>
        </span>
      ) : (
        <>
          <span className="flex flex-col leading-none">
            <ChetakLogo surface="light" className="w-32" />
            <span className="mt-1 text-[9px] font-semibold tracking-[0.32em] text-muted-foreground">
              SERVICE
            </span>
          </span>
          {!compact ? (
            <span className="ml-1 hidden border-l border-border pl-3 text-[11px] font-medium tracking-wide text-muted-foreground lg:block">
              Ticket Executive
            </span>
          ) : null}
        </>
      )}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Badges                                                                      */
/* -------------------------------------------------------------------------- */

const STATUS_TONE: Record<TicketStatus, { chip: string; dot: string }> = {
  New: { chip: "bg-info-soft text-info", dot: "bg-info" },
  Assigned: { chip: "bg-ink/[0.07] text-ink", dot: "bg-ink/50" },
  "In Progress": { chip: "bg-teal-soft text-teal", dot: "bg-teal" },
  Pending: { chip: "bg-warning-soft text-warning", dot: "bg-warning" },
  Resolved: { chip: "bg-success-soft text-success", dot: "bg-success" },
  Closed: { chip: "bg-sand text-steel", dot: "bg-steel/60" },
};

export function StatusBadge({
  status,
  size = "sm",
  className,
}: {
  status: TicketStatus;
  size?: "sm" | "md";
  className?: string;
}) {
  const tone = STATUS_TONE[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold uppercase tracking-[0.08em]",
        size === "sm" ? "px-2.5 py-1 text-[10px]" : "px-3 py-1.5 text-[11px]",
        tone.chip,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", tone.dot)} />
      {status}
    </span>
  );
}

const PRIORITY_TONE: Record<TicketPriority, string> = {
  Critical: "text-critical",
  High: "text-teal",
  Medium: "text-warning",
  Low: "text-muted-foreground",
};

export function PriorityBadge({
  priority,
  className,
  showLabel = true,
}: {
  priority: TicketPriority;
  className?: string;
  showLabel?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em]",
        PRIORITY_TONE[priority],
        className,
      )}
    >
      <span className="h-3.5 w-[3px] rounded-full bg-current" />
      {showLabel ? priority : <span className="sr-only">{priority}</span>}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* SLA                                                                         */
/* -------------------------------------------------------------------------- */

const SLA_TONE: Record<SlaState, string> = {
  "on-track": "text-success",
  "at-risk": "text-warning",
  breached: "text-critical",
  met: "text-success",
};

export function SlaIndicator({
  ticket,
  variant = "inline",
  className,
}: {
  ticket: Ticket;
  variant?: "inline" | "stacked";
  className?: string;
}) {
  const { now } = useTicketStore();
  const sla = slaInfo(ticket, now);
  const tone = SLA_TONE[sla.state];

  if (variant === "stacked") {
    return (
      <div className={cn("min-w-[7rem]", className)}>
        <p className="label-eyebrow">SLA</p>
        <p className={cn("mt-1.5 text-2xl font-semibold tabular-nums tracking-tight", tone)}>
          {sla.value}
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className={cn("size-1.5 rounded-full bg-current", tone)} />
          {sla.caption}
        </p>
      </div>
    );
  }

  return (
    <span className={cn("inline-flex items-baseline gap-1.5", className)}>
      <span className={cn("text-sm font-semibold tabular-nums", tone)}>{sla.value}</span>
      <span className="text-[11px] text-muted-foreground">{sla.caption}</span>
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Layout primitives                                                           */
/* -------------------------------------------------------------------------- */

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("border-b border-border pb-8", className)}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          {eyebrow ? <p className="label-eyebrow">{eyebrow}</p> : null}
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-ink text-balance sm:text-4xl lg:text-[2.75rem] lg:leading-[1.08]">
            {title}
          </h1>
          {description ? (
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-3">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}

export function SectionHeading({
  label,
  title,
  description,
  action,
  className,
}: {
  label?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="max-w-2xl">
        {label ? <p className="label-eyebrow">{label}</p> : null}
        <h2 className="mt-2.5 text-xl font-semibold tracking-[-0.015em] text-ink sm:text-[1.375rem]">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex items-center gap-3">{action}</div> : null}
    </div>
  );
}

export function MetaField({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="label-eyebrow">{label}</p>
      <p className="mt-2 truncate text-[15px] font-semibold tracking-[-0.01em] text-ink">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/**
 * A KPI readout. Pass `to` to make the whole block an interactive link into the
 * view it summarises — the label shifts to brand and a corner arrow appears on
 * hover, so the affordance costs no layout space.
 */
export function StatBlock({
  value,
  label,
  hint,
  tone = "ink",
  dot,
  to,
  className,
}: {
  value: ReactNode;
  label: string;
  hint?: ReactNode;
  tone?: "ink" | "brand" | "warning" | "success" | "critical";
  /** Tailwind background class for an optional status dot beside the label. */
  dot?: string;
  to?: string;
  className?: string;
}) {
  const tones: Record<string, string> = {
    ink: "text-ink",
    brand: "text-brand",
    warning: "text-warning",
    success: "text-success",
    critical: "text-critical",
  };

  const body = (
    <>
      <p className="label-eyebrow flex items-center gap-2 transition-colors group-hover:text-brand">
        {dot ? <span className={cn("size-1.5 rounded-full", dot)} /> : null}
        {label}
        {to ? (
          <ArrowUpRight className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
        ) : null}
      </p>
      <p
        className={cn(
          "mt-3 text-4xl font-semibold tabular-nums tracking-[-0.03em] sm:text-5xl",
          tones[tone],
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
    </>
  );

  if (!to) return <div className={cn("min-w-0", className)}>{body}</div>;

  return (
    <Link
      to={to}
      className={cn(
        "group block min-w-0 rounded-lg outline-none transition-colors",
        "focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:ring-offset-2",
        className,
      )}
    >
      {body}
    </Link>
  );
}

export function InitialsAvatar({
  name,
  className,
  tone = "ink",
}: {
  name: string;
  className?: string;
  tone?: "ink" | "sand";
}) {
  return (
    <span
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold tracking-wide",
        tone === "ink" ? "bg-ink text-ivory" : "bg-sand text-ink",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
  media,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  /** Optional visual anchor, e.g. the lineup stage, shown under the action. */
  media?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/60 px-6 py-16 text-center",
        className,
      )}
    >
      <p className="text-base font-semibold text-ink">{title}</p>
      {description ? (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action}
      {media ? <div className="mt-4 w-full max-w-sm">{media}</div> : null}
    </div>
  );
}

export function Rule({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-border", className)} />;
}
