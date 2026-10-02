import { PageHeader, StatBlock } from "@/components/chetak/primitives";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router";
import {
  BarBreakdown,
  BarSeries,
  ReportSection,
  RingBreakdown,
} from "@/components/chetak/ReportSection";
import { formatDuration } from "@/lib/chetak/format";
import { useTicketStore } from "@/lib/chetak/store";
import { cn } from "@/lib/utils";
import { useMemo } from "react";


export default function Reports() {
  const { tickets, stats } = useTicketStore();

  const resolved = useMemo(
    () => tickets.filter((ticket) => ticket.resolution),
    [tickets],
  );

  const headline = [
    {
      label: "Tickets received",
      value: tickets.length,
      hint: `${stats.createdToday} raised today`,
      tone: "ink" as const,
      to: "/tickets",
    },
    {
      label: "Tickets resolved",
      value: resolved.length,
      hint: `${stats.resolvedToday} resolved today`,
      tone: "success" as const,
      to: "/tickets?view=resolved",
    },
    {
      label: "Average resolution",
      value: stats.avgResolutionMs
        ? formatDuration(stats.avgResolutionMs)
        : "—",
      hint: "From creation to resolution",
      tone: "ink" as const,
      to: "/tickets?view=resolved",
    },
    {
      label: "SLA compliance",
      value: `${stats.slaCompliance}%`,
      hint: `${stats.breached} breached overall`,
      tone: stats.slaCompliance >= 90 ? ("success" as const) : ("warning" as const),
      to: "/tickets?view=risk",
    },
    {
      label: "Open tickets",
      value: stats.open,
      hint: `${stats.needsAction} need action`,
      tone: "brand" as const,
      to: "/tickets",
    },
  ];

  return (
    <div className="flex flex-col gap-14">
      <PageHeader
        eyebrow="Reporting"
        title="Reports"
        description="Service desk performance across the Chetak network, measured against the same SLA rules the queue runs on."
      />

      <section className="border-b border-border pb-10">
        {/*
          Each figure is ruled from above instead of separated by vertical
          dividers: the divider pattern had to know the column count, and at a
          1024px window (sidebar open) five columns of 140px was cramped. Three
          columns, then five from xl.
        */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-8 lg:grid-cols-3 xl:grid-cols-5">
          {headline.map((item) => (
            <div key={item.label} className="border-t border-border pt-5">
              <StatBlock
                label={item.label}
                value={item.value}
                hint={item.hint}
                tone={item.tone}
                to={item.to}
              />
            </div>
          ))}
        </div>
      </section>

      <ReportSection
        label="Volume"
        title="Received vs resolved"
        description="Daily ticket volume over the last seven days."
      >
        <BarSeries data={stats.daily} />
      </ReportSection>

      <ReportSection
        label="Composition"
        title="Where the work is coming from"
        description="Issue mix across every reported concern, and ticket volume by dealer."
      >
        <div className="grid gap-14 lg:grid-cols-2 lg:gap-16">
          <RingBreakdown data={stats.byCategory} caption="issues" />
          <BarBreakdown
            data={stats.byDealer.map((dealer) => ({
              label: dealer.label,
              value: dealer.value,
              hint: `${dealer.value} tickets`,
            }))}
          />
        </div>
      </ReportSection>

      <ReportSection
        label="Team"
        title="Executive workload"
        description="Open and resolved tickets owned by each service engineer."
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left">
            <thead>
              <tr>
                {["Service engineer", "Code", "Open", "Resolved", "Load"].map(
                  (heading, index) => (
                    <th
                      key={heading}
                      className={cn(
                        "label-eyebrow border-b border-border pb-3",
                        index >= 2 && "text-right",
                      )}
                    >
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {stats.byExecutive.map((row) => {
                const total = row.open + row.resolved || 1;
                const share = Math.round((row.open / total) * 100);
                return (
                  <tr
                    key={row.code}
                    className="border-b border-border/70 last:border-b-0"
                  >
                    <td className="py-4 pr-5 text-[14px] font-medium text-ink">
                      {row.label}
                    </td>
                    <td className="py-4 pr-5 text-[13px] tabular-nums text-muted-foreground">
                      {row.code}
                    </td>
                    <td className="py-4 pr-5 text-right text-[14px] tabular-nums text-ink">
                      {row.open}
                    </td>
                    <td className="py-4 pr-5 text-right text-[14px] tabular-nums text-ink">
                      {row.resolved}
                    </td>
                    <td className="py-4 text-right">
                      <span className="flex items-center justify-end gap-3">
                        <span className="h-1.5 w-24 overflow-hidden rounded-full bg-sand">
                          <span
                            className="block h-full rounded-full bg-teal"
                            style={{ width: `${share}%` }}
                          />
                        </span>
                        <span className="w-10 text-right text-[12px] tabular-nums text-muted-foreground">
                          {share}%
                        </span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ReportSection>

      <ReportSection
        label="Service levels"
        title="SLA posture"
        description="Compliance measured on closed tickets against the agreed priority windows."
      >
        <div className="grid gap-10 sm:grid-cols-3">
          {[
            {
              value: `${stats.slaCompliance}%`,
              label: "Closed inside the SLA window",
              tone: "text-success",
              to: "/tickets?view=risk",
            },
            {
              value: stats.breached,
              label: "Tickets past their SLA right now",
              tone: "text-critical",
              to: "/tickets?view=risk",
            },
            {
              value: resolved.length,
              label: "Resolutions recorded in this workspace",
              tone: "text-ink",
              to: "/tickets?view=resolved",
            },
          ].map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className="group block rounded-lg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand/30 focus-visible:ring-offset-2"
            >
              <p
                className={cn(
                  "text-4xl font-semibold tabular-nums tracking-[-0.03em]",
                  item.tone,
                )}
              >
                {item.value}
              </p>
              <p className="mt-2 flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors group-hover:text-ink">
                {item.label}
                <ArrowUpRight className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
              </p>
            </Link>
          ))}
        </div>
      </ReportSection>
    </div>
  );
}
