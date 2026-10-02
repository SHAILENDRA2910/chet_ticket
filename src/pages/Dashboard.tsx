import { cn } from "@/lib/utils";
import { formatDate, isOpen, isSlaRisk, relativeTime } from "@/lib/chetak/format";
import { useTicketStore } from "@/lib/chetak/store";
import { PRIORITY_RANK } from "@/components/chetak/TicketTable";
import {
  DashboardFocus,
  TicketListRow,
  WorkloadSummary,
} from "@/components/chetak/DashboardParts";
import { BarBreakdown } from "@/components/chetak/ReportSection";
import {
  InitialsAvatar,
  PageHeader,
  SectionHeading,
} from "@/components/chetak/primitives";
import { Button } from "@/components/ui/button";
import { ArrowRight, Plus } from "lucide-react";
import { useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { JOURNEY_STAGES, type TicketStatus } from "@/lib/chetak/types";

const STATUS_FLOW: TicketStatus[] = [
  "New",
  "Assigned",
  "In Progress",
  "Pending",
  "Resolved",
  "Closed",
];

/* Status keeps its semantic hue, but as a 6px dot rather than a filled chip so
   the rail stays quiet next to the focus panel. */
const STATUS_DOT: Record<TicketStatus, string> = {
  New: "bg-info",
  Assigned: "bg-ink/45",
  "In Progress": "bg-teal",
  Pending: "bg-warning",
  Resolved: "bg-success",
  Closed: "bg-steel/50",
};

export default function Dashboard() {
  const { tickets, stats, now, currentExecutive } = useTicketStore();
  const navigate = useNavigate();

  const attention = useMemo(
    () =>
      tickets
        .filter(
          (ticket) =>
            isOpen(ticket) &&
            (ticket.status === "New" ||
              isSlaRisk(ticket, now) ||
              ticket.priority === "Critical"),
        )
        .sort(
          (a, b) =>
            PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
            a.slaDueAt - b.slaDueAt,
        ),
    [tickets, now],
  );

  const focus = attention[0];
  const rest = attention.slice(1, 7);

  const feed = useMemo(
    () =>
      tickets
        .flatMap((ticket) =>
          ticket.activity.map((item) => ({ ...item, ticketId: ticket.id })),
        )
        .sort((a, b) => b.at - a.at)
        .slice(0, 7),
    [tickets],
  );

  const mine = tickets.filter(
    (ticket) => ticket.executive.name === currentExecutive.name,
  ).length;

  const mineOpen = tickets.filter(
    (ticket) =>
      isOpen(ticket) && ticket.executive.name === currentExecutive.name,
  ).length;

  /* The session is the executive whose queue this is, so the header greets them
     by name and states their own load rather than a generic page title. */
  const hour = new Date(now).getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = currentExecutive.name.split(" ")[0];

  return (
    <div className="flex flex-col gap-12 lg:gap-16">
      <PageHeader
        eyebrow={`Service operations · ${formatDate(now)}`}
        title={`${greeting}, ${firstName}.`}
        description={`${mineOpen} open ticket${mineOpen === 1 ? "" : "s"} sit with you, and ${stats.needsAction} need${stats.needsAction === 1 ? "s" : ""} action right now.`}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/reports")}
              className="h-10 rounded-full border-border bg-card px-5 shadow-none"
            >
              View reports
            </Button>
            <Button
              type="button"
              onClick={() => navigate("/tickets/new")}
              className="h-10 rounded-full px-5"
            >
              <Plus className="size-4" />
              Create ticket
            </Button>
          </>
        }
      />

      <DashboardFocus ticket={focus} slaRisk={stats.slaAtRisk} />

      <WorkloadSummary stats={stats} />

      <section>
        <SectionHeading
          label="Priority queue"
          title="Also needs your attention"
          description="Critical work and anything inside the SLA risk window, ordered by urgency. The most urgent request is highlighted above."
          action={
            <Link
              to="/tickets"
              className="inline-flex items-center gap-2 text-sm font-medium text-steel transition-colors hover:text-brand"
            >
              All tickets
              <ArrowRight className="size-4" />
            </Link>
          }
        />
        <div className="mt-7 border-t border-border">
          {rest.length ? (
            rest.map((ticket) => (
              <TicketListRow key={ticket.id} ticket={ticket} />
            ))
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {focus
                ? "Nothing else is competing for your attention."
                : "Nothing urgent right now — the queue is clear."}
            </p>
          )}
        </div>
      </section>

      <section className="grid gap-14 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
        <div>
          <SectionHeading
            label="Activity"
            title="Latest across the network"
            description="Recent updates from every ticket in the service network."
          />
          <ol className="mt-7 border-t border-border">
            {feed.map((item) => (
              <li key={item.id}>
                <Link
                  to={`/tickets/${item.ticketId}`}
                  className="group flex items-start gap-4 border-b border-border py-3.5 transition-colors hover:bg-brand/[0.02]"
                >
                  <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-brand/35 transition-colors group-hover:bg-teal" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-4">
                      <span className="text-[12px] font-semibold tabular-nums text-ink">
                        {item.ticketId}
                      </span>
                      <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                        {relativeTime(item.at, now)}
                      </span>
                    </span>
                    <span className="mt-1 block text-[13px] text-ink">
                      {item.action}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                      {item.actor} · {item.detail ?? "no additional detail"}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-muted-foreground">
            You currently own{" "}
            <span className="font-semibold tabular-nums text-ink">{mine}</span>{" "}
            tickets across the network.
          </p>
        </div>

        <div className="flex flex-col gap-12">
          <div>
            <SectionHeading label="Queue" title="Tickets by status" />
            <ul className="mt-6 border-y border-border">
              {STATUS_FLOW.map((status) => (
                <li
                  key={status}
                  className="flex items-center justify-between gap-4 border-b border-border py-2.5 last:border-b-0"
                >
                  <span className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        STATUS_DOT[status],
                      )}
                    />
                    <span className="text-[13px] text-ink">{status}</span>
                  </span>
                  <span className="text-[13px] font-semibold tabular-nums text-ink">
                    {tickets.filter((ticket) => ticket.status === status).length}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">
              {stats.open} open · {stats.resolvedToday} resolved today ·{" "}
              {stats.slaAtRisk} inside the SLA risk window.
            </p>
          </div>

          <div>
            <SectionHeading label="Service network" title="Volume by dealer" />
            <div className="mt-6">
              <BarBreakdown
                tone="brand"
                data={stats.byDealer.map((dealer) => ({
                  label: dealer.label,
                  value: dealer.value,
                  hint: `${dealer.value} tickets`,
                }))}
              />
            </div>
          </div>

          <div>
            <SectionHeading label="Team" title="Load by owner" />
            <ul className="mt-6 space-y-3.5">
              {stats.byExecutive.map((row) => (
                <li key={row.code} className="flex items-center gap-3">
                  <InitialsAvatar
                    name={row.label}
                    tone="sand"
                    className="size-7 text-[10px]"
                  />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-ink">
                    {row.label}
                  </span>
                  <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground">
                    <span className="font-semibold text-ink">{row.open}</span>{" "}
                    open · {row.resolved} done
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-t border-border pt-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl">
            <p className="label-eyebrow">Ticket journey</p>
            <h2 className="mt-3 text-xl font-semibold tracking-[-0.015em] text-ink sm:text-[1.375rem]">
              Every ticket follows the same service path.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Created, assigned, in progress, customer contacted, resolved and
              closed — the journey stays the single source of truth for where a
              request stands, and it is visible on every ticket.
            </p>
          </div>
          <ol className="flex flex-wrap items-center gap-y-3 lg:max-w-md lg:justify-end">
            {JOURNEY_STAGES.map((stage, index) => (
              <li key={stage} className="flex items-center">
                <span className="inline-flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-brand/40" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-steel">
                    {stage}
                  </span>
                </span>
                {index !== JOURNEY_STAGES.length - 1 ? (
                  <span className="mx-3 h-px w-6 bg-border" />
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
