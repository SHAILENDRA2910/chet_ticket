import { cn } from "@/lib/utils";
import {
  relativeTime,
  type SlaInfo,
  type SlaState,
  slaInfo,
} from "@/lib/chetak/format";
import { useTicketStore } from "@/lib/chetak/store";
import {
  ISSUE_CATEGORIES,
  CHANNELS,
} from "@/lib/chetak/data";
import type {
  IssueCategory,
  Ticket,
  TicketPriority,
  TicketStatus,
} from "@/lib/chetak/types";
import { Search, X } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { PriorityBadge, StatusBadge, SlaIndicator } from "./primitives";
import { VehicleImage } from "./VehicleImage";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const STATUS_ORDER: TicketStatus[] = [
  "New",
  "Assigned",
  "In Progress",
  "Pending",
  "Resolved",
  "Closed",
];

export const PRIORITY_ORDER: TicketPriority[] = [
  "Low",
  "Medium",
  "High",
  "Critical",
];

export const PRIORITY_RANK: Record<TicketPriority, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

export interface TicketFilterState {
  query: string;
  status: TicketStatus | "all";
  priority: TicketPriority | "all";
  assignment: string | "all";
  category: IssueCategory | "all";
  sla: SlaState | "all";
  channel: string | "all";
  sort: "newest" | "priority" | "sla" | "updated";
}

export const DEFAULT_FILTERS: TicketFilterState = {
  query: "",
  status: "all",
  priority: "all",
  assignment: "all",
  category: "all",
  sla: "all",
  channel: "all",
  sort: "newest",
};

/** SLA states offered as filters (a completed ticket can still be `met`). */
export const SLA_FILTER_OPTIONS: Array<{ value: SlaState; label: string }> = [
  { value: "on-track", label: "On track" },
  { value: "at-risk", label: "At risk" },
  { value: "breached", label: "Breached" },
];

export function filterTickets(
  tickets: Ticket[],
  filters: TicketFilterState,
  now: number,
): Ticket[] {
  const needle = filters.query.trim().toLowerCase();

  const filtered = tickets.filter((ticket) => {
    if (filters.status !== "all" && ticket.status !== filters.status) return false;
    if (filters.priority !== "all" && ticket.priority !== filters.priority) return false;
    if (
      filters.assignment !== "all" &&
      ticket.executive.name !== filters.assignment
    ) {
      return false;
    }
    if (filters.sla !== "all" && slaInfo(ticket, now).state !== filters.sla) {
      return false;
    }
    if (filters.channel !== "all" && ticket.channel !== filters.channel) return false;
    if (
      filters.category !== "all" &&
      !ticket.issues.some((issue) => issue.category === filters.category)
    ) {
      return false;
    }
    if (!needle) return true;

    return [
      ticket.id,
      ticket.subject,
      ticket.description,
      ticket.customer.name,
      ticket.customer.mobile,
      ticket.customer.city,
      ticket.vehicle.model,
      ticket.vehicle.registrationNo,
      ticket.vehicle.vin,
      ticket.dealer.name,
      ticket.executive.name,
      ...ticket.issues.map((issue) => `${issue.title} ${issue.category}`),
    ]
      .join(" ")
      .toLowerCase()
      .includes(needle);
  });

  return filtered.sort((a, b) => {
    switch (filters.sort) {
      case "priority":
        return (
          PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
          a.slaDueAt - b.slaDueAt
        );
      case "sla": {
        const aState = slaInfo(a, now);
        const bState = slaInfo(b, now);
        const rank: Record<SlaInfo["state"], number> = {
          breached: 0,
          "at-risk": 1,
          "on-track": 2,
          met: 3,
        };
        return rank[aState.state] - rank[bState.state] || a.slaDueAt - b.slaDueAt;
      }
      case "updated":
        return b.updatedAt - a.updatedAt;
      default:
        return b.createdAt - a.createdAt;
    }
  });
}

/* -------------------------------------------------------------------------- */
/* Filters                                                                     */
/* -------------------------------------------------------------------------- */

export function TicketFilters({
  filters,
  onChange,
  resultCount,
  assignees,
  className,
}: {
  filters: TicketFilterState;
  onChange: (next: TicketFilterState) => void;
  resultCount: number;
  /** Ticket executives that actually appear in the current data. */
  assignees: string[];
  className?: string;
}) {
  const set = <K extends keyof TicketFilterState>(
    key: K,
    value: TicketFilterState[K],
  ) => onChange({ ...filters, [key]: value });

  const dirty =
    filters.query !== "" ||
    filters.status !== "all" ||
    filters.priority !== "all" ||
    filters.assignment !== "all" ||
    filters.category !== "all" ||
    filters.sla !== "all" ||
    filters.channel !== "all" ||
    filters.sort !== "newest";

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <label className="relative flex min-w-0 items-center xl:max-w-sm xl:flex-1">
          <Search className="pointer-events-none absolute left-3.5 size-4 text-muted-foreground" />
          <input
            aria-label="Search tickets"
            value={filters.query}
            onChange={(event) => set("query", event.target.value)}
            placeholder="Search ticket, customer, vehicle or VIN…"
            className="h-10 w-full rounded-full border border-border/70 bg-card pl-10 pr-4 text-sm text-ink outline-none transition-colors placeholder:text-muted-foreground focus:border-brand/30 focus:ring-4 focus:ring-brand/10"
          />
        </label>
        <div className="no-scrollbar -mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-0.5 xl:flex-wrap xl:justify-end xl:pb-0">
          <FilterSelect
            value={filters.status}
            onChange={(value) => set("status", value as TicketFilterState["status"])}
            placeholder="Status"
            options={STATUS_ORDER.map((status) => ({ value: status, label: status }))}
          />
          <FilterSelect
            value={filters.priority}
            onChange={(value) => set("priority", value as TicketFilterState["priority"])}
            placeholder="Priority"
            options={PRIORITY_ORDER.map((priority) => ({
              value: priority,
              label: priority,
            }))}
          />
          <FilterSelect
            value={filters.assignment}
            onChange={(value) => set("assignment", value)}
            placeholder="Assignment"
            anyLabel="Any assignment"
            options={assignees.map((name) => ({ value: name, label: name }))}
          />
          <FilterSelect
            value={filters.category}
            onChange={(value) => set("category", value as TicketFilterState["category"])}
            placeholder="Category"
            options={ISSUE_CATEGORIES.map((category) => ({
              value: category,
              label: category,
            }))}
          />
          <FilterSelect
            value={filters.sla}
            onChange={(value) => set("sla", value as TicketFilterState["sla"])}
            placeholder="SLA"
            anyLabel="Any SLA state"
            options={SLA_FILTER_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
          />
          <FilterSelect
            value={filters.channel}
            onChange={(value) => set("channel", value)}
            placeholder="Channel"
            options={CHANNELS.map((channel) => ({ value: channel, label: channel }))}
          />
          <FilterSelect
            value={filters.sort}
            onChange={(value) => set("sort", value as TicketFilterState["sort"])}
            placeholder="Sort"
            anyLabel="Newest first"
            options={[
              { value: "newest", label: "Newest first" },
              { value: "priority", label: "Priority" },
              { value: "sla", label: "SLA urgency" },
              { value: "updated", label: "Recently updated" },
            ]}
          />
          {dirty ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(DEFAULT_FILTERS)}
              className="h-9 shrink-0 rounded-full px-3 text-[12.5px] font-medium text-steel hover:text-ink"
            >
              <X className="size-3.5" />
              Clear
            </Button>
          ) : null}
        </div>
      </div>
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground tabular-nums">
        {resultCount} ticket{resultCount === 1 ? "" : "s"}
      </p>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
  anyLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
  anyLabel?: string;
}) {
  const active = value !== "all";

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-label={`Filter by ${placeholder.toLowerCase()}`}
        size="sm"
        className={cn(
          "h-9 shrink-0 gap-1.5 rounded-full border-0 px-3.5 text-[12.5px] font-medium shadow-none transition-colors focus-visible:ring-2 focus-visible:ring-brand/25",
          active
            ? "bg-brand/10 text-brand"
            : "bg-sand/70 text-steel hover:bg-sand hover:text-ink",
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{anyLabel ?? `Any ${placeholder.toLowerCase()}`}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* -------------------------------------------------------------------------- */
/* List                                                                        */
/* -------------------------------------------------------------------------- */

const HEAD =
  "label-eyebrow border-b border-border pb-3 font-semibold text-muted-foreground";

export function TicketRow({ ticket }: { ticket: Ticket }) {
  const navigate = useNavigate();
  const { now } = useTicketStore();

  return (
    <tr
      onClick={() => navigate(`/tickets/${ticket.id}`)}
      className="group cursor-pointer border-b border-border/70 transition-colors last:border-b-0 hover:bg-ink/[0.025]"
    >
      <td className="relative py-4 pl-4 pr-5 align-middle">
        <span className="absolute inset-y-0 left-0 w-[2px] rounded-full bg-teal opacity-0 transition-opacity group-hover:opacity-100" />
        <Link
          to={`/tickets/${ticket.id}`}
          className="block text-[15px] font-semibold tabular-nums tracking-[-0.01em] text-ink outline-none focus-visible:underline focus-visible:decoration-brand/40 focus-visible:underline-offset-4"
        >
          {ticket.id}
        </Link>
        <span className="mt-1.5 block text-[11px] text-muted-foreground">
          {ticket.channel} · {relativeTime(ticket.createdAt, now)}
        </span>
      </td>
      <td className="py-4 pr-5 align-middle">
        <span className="flex items-center gap-3">
          <VehicleImage
            model={ticket.vehicle.model}
            className="size-14 shrink-0 rounded-xl border border-border bg-linear-to-br from-sand to-ivory"
            imageClassName="p-1.5"
          />
          <span className="min-w-0">
            <span className="block truncate text-[14px] font-medium text-ink">
              {ticket.customer.name}
            </span>
            <span className="mt-1 block truncate text-[11px] text-muted-foreground">
              {ticket.vehicle.model} · {ticket.vehicle.registrationNo}
            </span>
          </span>
        </span>
      </td>
      <td className="max-w-[22rem] py-4 pr-5 align-middle">
        <span className="block truncate text-[14px] font-medium leading-snug text-ink">
          {ticket.subject}
        </span>
        <span className="mt-1.5 block truncate text-[11px] text-muted-foreground">
          {ticket.issues.map((issue) => issue.category).join(" · ")}
        </span>
      </td>
      <td className="hidden py-4 pr-5 align-middle md:table-cell">
        <PriorityBadge priority={ticket.priority} />
      </td>
      <td className="py-4 pr-5 align-middle">
        <StatusBadge status={ticket.status} />
      </td>
      <td className="hidden py-4 pr-5 align-middle lg:table-cell">
        <span className="block text-[13px] font-medium text-ink">
          {ticket.executive.name}
        </span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground">
          {ticket.dealer.region}
        </span>
      </td>
      <td className="py-4 pr-5 align-middle">
        <SlaIndicator ticket={ticket} />
      </td>
      <td className="hidden py-4 pr-4 align-middle text-right xl:table-cell">
        <span className="text-[13px] tabular-nums text-muted-foreground">
          {relativeTime(ticket.updatedAt, now)}
        </span>
      </td>
    </tr>
  );
}

export function TicketList({
  tickets,
  empty,
}: {
  tickets: Ticket[];
  empty?: React.ReactNode;
}) {
  if (!tickets.length) return <>{empty}</>;

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[880px] border-collapse text-left">
        <thead>
          <tr>
            <th className={cn(HEAD, "pl-4 text-left")}>Ticket</th>
            <th className={cn(HEAD, "text-left")}>Customer</th>
            <th className={cn(HEAD, "text-left")}>Issue</th>
            <th className={cn(HEAD, "hidden text-left md:table-cell")}>Priority</th>
            <th className={cn(HEAD, "text-left")}>Status</th>
            <th className={cn(HEAD, "hidden text-left lg:table-cell")}>Assigned to</th>
            <th className={cn(HEAD, "text-left")}>SLA</th>
            <th className={cn(HEAD, "hidden pr-4 text-right xl:table-cell")}>Updated</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => (
            <TicketRow key={ticket.id} ticket={ticket} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
