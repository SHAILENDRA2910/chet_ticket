import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { SectionHeading } from "./primitives";

export function ReportSection({
  label,
  title,
  description,
  action,
  children,
  className,
}: {
  label?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-t border-border pt-10", className)}>
      {/* Reuse the shared heading so Reports matches every other section. */}
      <SectionHeading
        label={label}
        title={title}
        description={description}
        action={action}
      />
      <div className="mt-8">{children}</div>
    </section>
  );
}

export interface Series {
  label: string;
  received: number;
  resolved: number;
}

export function BarSeries({ data }: { data: Series[] }) {
  const max = Math.max(...data.flatMap((d) => [d.received, d.resolved]), 1);
  const pct = (value: number) => (value === 0 ? 0 : Math.max((value / max) * 100, 4));

  return (
    <div>
      <div className="flex items-center gap-5 pb-5">
        <Legend color="bg-brand" label="Received" />
        <Legend color="bg-teal" label="Resolved" />
      </div>
      <div className="flex h-44 items-end gap-3">
        {data.map((day) => (
          <div
            key={day.label}
            className="group flex h-full flex-1 items-end justify-center gap-1.5"
          >
            <span
              title={`${day.received} received`}
              style={{ height: `${pct(day.received)}%` }}
              className="w-2.5 rounded-t-[3px] bg-brand transition-opacity group-hover:opacity-80 sm:w-3.5"
            />
            <span
              title={`${day.resolved} resolved`}
              style={{ height: `${pct(day.resolved)}%` }}
              className="w-2.5 rounded-t-[3px] bg-teal transition-opacity group-hover:opacity-80 sm:w-3.5"
            />
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-3 border-t border-border pt-3">
        {data.map((day) => (
          <span
            key={day.label}
            className="flex-1 text-center text-[10px] tabular-nums text-muted-foreground"
          >
            {day.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
      <span className={cn("size-2 rounded-sm", color)} />
      {label}
    </span>
  );
}

const PALETTE = [
  "#322b54",
  "#2a939d",
  "#47bcc8",
  "#c4022f",
  "#665a9e",
  "#6b6b7a",
];

export function RingBreakdown({
  data,
  caption,
}: {
  data: Array<{ label: string; value: number }>;
  caption: string;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const size = 168;
  const thickness = 18;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-center">
      <div className="relative shrink-0">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          aria-hidden="true"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#eaf2f5"
            strokeWidth={thickness}
          />
          {data.map((item, index) => {
            const length = total ? (item.value / total) * circumference : 0;
            const element = (
              <circle
                key={item.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={PALETTE[index % PALETTE.length]}
                strokeWidth={thickness}
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
              />
            );
            offset += length;
            return element;
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-2xl font-semibold tabular-nums tracking-tight text-ink">
              {total}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {caption}
            </p>
          </div>
        </div>
      </div>

      <ul className="w-full space-y-3">
        {data.map((item, index) => (
          <li key={item.label} className="flex items-center justify-between gap-4">
            <span className="flex min-w-0 items-center gap-2.5">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: PALETTE[index % PALETTE.length] }}
              />
              <span className="truncate text-[13px] font-medium text-ink">
                {item.label}
              </span>
            </span>
            <span className="text-[13px] tabular-nums text-muted-foreground">
              {item.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BarBreakdown({
  data,
  className,
  tone = "teal",
}: {
  data: Array<{ label: string; value: number; hint?: string }>;
  className?: string;
  /** Bars default to the teal accent; pass `brand` for low-chroma contexts. */
  tone?: "teal" | "brand";
}) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <ul className={cn("space-y-5", className)}>
      {data.map((item) => (
        <li key={item.label}>
          <div className="flex items-baseline justify-between gap-4">
            <span className="truncate text-[13px] font-medium text-ink">
              {item.label}
            </span>
            <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground">
              {item.hint ?? item.value}
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-sand">
            <div
              className={
                tone === "brand"
                  ? "h-full rounded-full bg-brand"
                  : "h-full rounded-full bg-teal"
              }
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
