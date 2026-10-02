import { cn } from "@/lib/utils";
import { relativeTime, slaInfo, type SlaState } from "@/lib/chetak/format";
import { useTicketStore, type WorkspaceStats } from "@/lib/chetak/store";
import type { Ticket, TicketPriority } from "@/lib/chetak/types";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { VehicleImage } from "./VehicleImage";
import { LineupStage } from "./LineupStage";
import {
  PriorityBadge,
  SlaIndicator,
  StatBlock,
  StatusBadge,
} from "./primitives";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

/* -------------------------------------------------------------------------- */
/* Focus panel                                                                 */
/*                                                                             */
/* Isolation effect: the single most urgent ticket gets the dark surface, the  */
/* largest type-scale jump and the only accent button, so the eye lands here   */
/* before it reads anything else on the page.                                  */
/* -------------------------------------------------------------------------- */

const DOT_GRID = {
  backgroundImage:
    "radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)",
  backgroundSize: "22px 22px",
} as const;

const PRIORITY_ON_DARK: Record<TicketPriority, string> = {
  Critical: "text-critical-soft",
  High: "text-teal-soft",
  Medium: "text-warning-soft",
  Low: "text-ivory/55",
};

const SLA_CHIP_ON_DARK: Record<SlaState, string> = {
  breached: "border-critical/40 bg-critical/20 text-critical-soft",
  "at-risk": "border-warning/40 bg-warning/20 text-warning-soft",
  "on-track": "border-ivory/15 bg-ivory/[0.06] text-ivory/70",
  met: "border-ivory/15 bg-ivory/[0.06] text-ivory/70",
};

export function DashboardFocus({
  ticket,
  slaRisk,
  className,
}: {
  ticket?: Ticket;
  slaRisk: number;
  className?: string;
}) {
  const navigate = useNavigate();
  const { now } = useTicketStore();
  const sla = ticket ? slaInfo(ticket, now) : undefined;
  const urgent = sla?.state === "breached" || sla?.state === "at-risk";

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[28px] bg-ink text-ivory",
        "shadow-[0_44px_90px_-56px_rgba(30,24,57,0.85)]",
        className,
      )}
    >
      {/* Accent light — the only aqua on the page besides the primary CTA. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -left-24 size-[30rem] rounded-full bg-aqua/20 blur-[100px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={DOT_GRID}
      />

      {/*
        The side-by-side split waits for `xl`. With the sidebar open a 1024px
        window only leaves ~700px of canvas, and the subject line at 2.15rem
        would be squeezed into half of that.
      */}
      <div className="relative grid gap-10 p-7 sm:p-9 lg:p-10 xl:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] xl:items-center xl:p-11">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-ivory/15 bg-ivory/[0.06] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-ivory/70">
              <span className="size-1.5 rounded-full bg-aqua" />
              {urgent ? "Escalated now" : ticket ? "Next in line" : "All clear"}
            </span>
            {sla ? (
              <span
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
                  SLA_CHIP_ON_DARK[sla.state],
                )}
              >
                SLA {sla.value}
                <span className="opacity-70">· {sla.caption}</span>
              </span>
            ) : null}
          </div>

          {ticket ? (
            <>
              <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.22em] text-ivory/45">
                {ticket.id}
              </p>
              <h2 className="mt-2.5 text-2xl font-semibold leading-[1.12] tracking-[-0.022em] text-balance sm:text-3xl lg:text-[2.15rem]">
                {ticket.subject}
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-ivory/60">
                {ticket.customer.name} · {ticket.vehicle.model}{" "}
                {ticket.vehicle.registrationNo} · {ticket.dealer.name}
              </p>

              <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-ivory/15 pt-6 sm:grid-cols-4">
                <FocusMeta label="Status">{ticket.status}</FocusMeta>
                <FocusMeta
                  label="Priority"
                  className={PRIORITY_ON_DARK[ticket.priority]}
                >
                  {ticket.priority}
                </FocusMeta>
                <FocusMeta
                  label="SLA"
                  className={
                    sla?.state === "breached"
                      ? "text-critical-soft"
                      : sla?.state === "at-risk"
                        ? "text-warning-soft"
                        : "text-ivory"
                  }
                >
                  {sla?.value}
                </FocusMeta>
                <FocusMeta label="Owner">{ticket.executive.name}</FocusMeta>
              </dl>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  onClick={() => navigate(`/tickets/${ticket.id}`)}
                  className="h-10 rounded-full bg-aqua px-5 text-ink hover:bg-aqua/90"
                >
                  Open ticket
                  <ArrowRight className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate("/tickets")}
                  className="h-10 rounded-full border border-ivory/20 px-5 text-ivory hover:bg-ivory/10 hover:text-ivory"
                >
                  Go to queue
                </Button>
              </div>
            </>
          ) : (
            <>
              <h2 className="mt-7 text-2xl font-semibold leading-[1.12] tracking-[-0.022em] text-balance sm:text-3xl lg:text-[2.15rem]">
                The queue is clear.
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-ivory/60">
                Nothing is inside the SLA risk window right now. New requests
                will surface here the moment they need you.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  onClick={() => navigate("/tickets/new")}
                  className="h-10 rounded-full bg-aqua px-5 text-ink hover:bg-aqua/90"
                >
                  Create ticket
                  <ArrowRight className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate("/tickets")}
                  className="h-10 rounded-full border border-ivory/20 px-5 text-ivory hover:bg-ivory/10 hover:text-ivory"
                >
                  Review {slaRisk === 0 ? "all tickets" : "the queue"}
                </Button>
              </div>

              {/* Clear queue, no queue to picture — so the lineup takes the
                  product's place, on the same panel the ticket would occupy. */}
              <LineupStage
                tone="dark"
                compact
                bare
                className="mt-9 h-52 max-w-md"
              />
            </>
          )}
        </div>

        {/* The vehicle floats on the panel: isolation by scale and contrast.
            Only when there is a ticket — the empty state stages the lineup
            instead, and two vehicles on one panel would fight each other. */}
        {ticket ? (
          <div className="relative hidden lg:block">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 size-[24rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-aqua/15 blur-[80px]"
            />
            <div className="relative">
              <VehicleImage
                model={ticket.vehicle.model}
                className="mx-auto h-52 w-full max-w-[26rem] xl:h-64"
                imageClassName="drop-shadow-[0_34px_54px_rgba(9,6,26,0.65)]"
              />
              <div className="mx-auto mt-3 h-3 w-2/5 rounded-[100%] bg-black/40 blur-md" />
              <div className="mt-6 flex items-center justify-center gap-3 text-[11px] font-medium uppercase tracking-[0.16em] text-ivory/45">
                <span>{ticket.vehicle.model}</span>
                <span className="size-1 rounded-full bg-ivory/30" />
                <span>{ticket.vehicle.registrationNo}</span>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function FocusMeta({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ivory/40">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1.5 truncate text-sm font-semibold text-ivory",
          className,
        )}
      >
        {children}
      </dd>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Workload instrument strip                                                   */
/*                                                                             */
/* One neutral card so the numbers read as a single instrument cluster. Chroma */
/* is spent only where it carries meaning: brand for action, warning for risk. */
/* -------------------------------------------------------------------------- */

const CELL_SPACING = [
  "",
  "border-l border-border",
  "border-t border-border lg:border-t-0 lg:border-l",
  "border-t border-l border-border lg:border-t-0",
];

interface WorkloadCell {
  label: string;
  value: number;
  hint: string;
  dot: string;
  tone: "ink" | "brand" | "warning" | "success" | "critical";
  to: string;
}

export function WorkloadSummary({ stats }: { stats: WorkspaceStats }) {
  const cells: WorkloadCell[] = [
    {
      label: "Open tickets",
      value: stats.open,
      hint: `${stats.createdToday} raised today`,
      dot: "bg-ink/30",
      tone: "ink",
      to: "/tickets",
    },
    {
      label: "Need action",
      value: stats.needsAction,
      hint: "Unassigned or inside the risk window",
      dot: "bg-brand",
      tone: "brand",
      to: "/tickets?view=action",
    },
    {
      label: "SLA at risk",
      value: stats.slaAtRisk,
      hint: `${stats.breached} already breached`,
      dot: stats.slaAtRisk ? "bg-warning" : "bg-ink/30",
      tone: stats.slaAtRisk ? "warning" : "ink",
      to: "/tickets?view=risk",
    },
    {
      label: "Resolved today",
      value: stats.resolvedToday,
      hint: `${stats.closedLast7Days} closed in the last 7 days`,
      dot: "bg-success",
      tone: "ink",
      to: "/tickets?view=resolved",
    },
  ];

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="grid grid-cols-2 lg:grid-cols-4">
        {cells.map((cell, index) => (
          <Link
            key={cell.label}
            to={cell.to}
            className={cn(
              "group block px-6 py-6 outline-none transition-colors",
              "hover:bg-brand/[0.03] focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:ring-inset",
              CELL_SPACING[index],
            )}
          >
            <StatBlock
              label={cell.label}
              value={cell.value}
              hint={cell.hint}
              tone={cell.tone}
              dot={cell.dot}
            />
          </Link>
        ))}
      </div>
      <Link
        to="/reports"
        className="group flex flex-wrap items-center justify-between gap-4 border-t border-border bg-sand/40 px-6 py-4 outline-none transition-colors hover:bg-sand/70 focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:ring-inset"
      >
        <p className="text-xs font-medium text-steel transition-colors group-hover:text-ink">
          SLA compliance · resolved inside window
        </p>
        <div className="flex items-center gap-3">
          <span className="h-1.5 w-36 overflow-hidden rounded-full bg-sand sm:w-48">
            <span
              className="block h-full rounded-full bg-brand"
              style={{ width: `${stats.slaCompliance}%` }}
            />
          </span>
          <span className="text-sm font-semibold tabular-nums text-ink">
            {stats.slaCompliance}%
          </span>
          <ArrowUpRight className="size-3.5 text-steel transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </div>
      </Link>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Queue row — deliberately quiet so the focus panel stays dominant            */
/* -------------------------------------------------------------------------- */

export function TicketListRow({ ticket }: { ticket: Ticket }) {
  const navigate = useNavigate();
  const { now } = useTicketStore();

  return (
    <button
      type="button"
      onClick={() => navigate(`/tickets/${ticket.id}`)}
      className="group relative grid w-full grid-cols-1 gap-x-6 gap-y-3 border-b border-border px-1 py-4 text-left outline-none transition-colors hover:bg-brand/[0.025] focus-visible:bg-brand/[0.05] sm:grid-cols-[8.5rem_minmax(0,1fr)] xl:grid-cols-[8.5rem_minmax(0,1fr)_auto]"
    >
      <span className="absolute inset-y-0 left-0 w-[2px] rounded-full bg-brand opacity-0 transition-opacity group-hover:opacity-100" />
      <span className="text-[13px] font-semibold tabular-nums tracking-[-0.01em] text-steel">
        {ticket.id}
      </span>
      <span className="flex min-w-0 items-center gap-3.5">
        <VehicleImage
          model={ticket.vehicle.model}
          className="hidden size-12 shrink-0 rounded-lg bg-sand/70 sm:block"
          imageClassName="p-1"
        />
        <span className="min-w-0">
          <span className="block truncate text-[14px] font-medium text-ink">
            {ticket.subject}
          </span>
          <span className="mt-1 block truncate text-[11px] text-muted-foreground">
            {ticket.customer.name} · {ticket.vehicle.model}{" "}
            {ticket.vehicle.registrationNo} · {ticket.dealer.name}
          </span>
        </span>
      </span>
      <span className="flex flex-wrap items-center gap-x-6 gap-y-2 opacity-90 transition-opacity group-hover:opacity-100 lg:col-start-2 lg:justify-end xl:col-start-auto">
        <PriorityBadge priority={ticket.priority} />
        <StatusBadge status={ticket.status} />
        <SlaIndicator ticket={ticket} className="min-w-[7rem]" />
        <span className="text-[11px] tabular-nums text-muted-foreground lg:w-20 lg:text-right">
          {relativeTime(ticket.updatedAt, now)}
        </span>
      </span>
    </button>
  );
}
