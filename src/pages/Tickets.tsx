import { ContextNav, type ContextNavItem } from "@/components/chetak/AppLayout";
import { LineupStage } from "@/components/chetak/LineupStage";
import { EmptyState, PageHeader } from "@/components/chetak/primitives";
import {
  DEFAULT_FILTERS,
  TicketFilters,
  TicketList,
  filterTickets,
  type TicketFilterState,
} from "@/components/chetak/TicketTable";
import { isSlaRisk, needsAction } from "@/lib/chetak/format";
import { useTicketStore } from "@/lib/chetak/store";
import { ImportTickets } from "@/components/chetak/ImportTickets";
import { Button } from "@/components/ui/button";
import { Plus, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

type ContextTab =
  | "all"
  | "mine"
  | "action"
  | "pending"
  | "risk"
  | "resolved"
  | "closed";

const VALID_TABS: ContextTab[] = [
  "all",
  "mine",
  "action",
  "pending",
  "risk",
  "resolved",
  "closed",
];

function readTab(value: string | null): ContextTab {
  return VALID_TABS.includes(value as ContextTab) ? (value as ContextTab) : "all";
}

export default function Tickets() {
  const { tickets, now, currentExecutive } = useTicketStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = readTab(searchParams.get("view"));
  const [filters, setFilters] = useState<TicketFilterState>(DEFAULT_FILTERS);
  const [importOpen, setImportOpen] = useState(false);

  // A queue change is a different slice of the data, so reset the column filters.
  useEffect(() => {
    setFilters(DEFAULT_FILTERS);
  }, [tab]);

  const setTab = (next: ContextTab) => {
    setSearchParams(next === "all" ? {} : { view: next }, { replace: true });
  };

  const base = useMemo(() => {
    switch (tab) {
      case "mine":
        return tickets.filter(
          (ticket) => ticket.executive.name === currentExecutive.name,
        );
      case "action":
        return tickets.filter((ticket) => needsAction(ticket, now));
      case "pending":
        return tickets.filter((ticket) => ticket.status === "Pending");
      case "resolved":
        return tickets.filter((ticket) => ticket.status === "Resolved");
      case "closed":
        return tickets.filter((ticket) => ticket.status === "Closed");
      case "risk":
        return tickets.filter((ticket) => isSlaRisk(ticket, now));
      default:
        return tickets;
    }
  }, [tickets, tab, currentExecutive.name, now]);

  const visible = useMemo(
    () => filterTickets(base, filters, now),
    [base, filters, now],
  );

  // Assignment options come from the data itself, not a hardcoded list.
  const assignees = useMemo(
    () => [...new Set(tickets.map((ticket) => ticket.executive.name))].sort(),
    [tickets],
  );

  const filtersActive =
    filters.query !== "" ||
    filters.status !== "all" ||
    filters.priority !== "all" ||
    filters.assignment !== "all" ||
    filters.category !== "all" ||
    filters.sla !== "all" ||
    filters.channel !== "all";

  // Distinguish "nothing exists", "search found nothing" and "filters matched
  // nothing" instead of showing the same generic empty message for all three.
  const emptyCopy = filters.query
    ? {
        title: "No tickets match your search",
        description: `Nothing matched “${filters.query}”. Try a ticket ID, customer name or registration.`,
      }
    : filtersActive
      ? {
          title: "No tickets match these filters",
          description:
            "Adjust or clear the filters to see the queue again — the tickets are still there.",
        }
      : {
          title: "Nothing in this queue",
          description:
            "No tickets are in this slice right now. Switch to All tickets to see everything.",
        };

  const tabs: ContextNavItem[] = [
    { id: "all", label: "All Tickets", count: tickets.length },
    {
      id: "mine",
      label: "My Tickets",
      count: tickets.filter((t) => t.executive.name === currentExecutive.name).length,
    },
    {
      id: "action",
      label: "Needs action",
      count: tickets.filter((t) => needsAction(t, now)).length,
    },
    {
      id: "pending",
      label: "Pending",
      count: tickets.filter((t) => t.status === "Pending").length,
    },
    {
      id: "risk",
      label: "SLA at risk",
      count: tickets.filter((t) => isSlaRisk(t, now)).length,
    },
    {
      id: "resolved",
      label: "Resolved",
      count: tickets.filter((t) => t.status === "Resolved").length,
    },
    {
      id: "closed",
      label: "Closed",
      count: tickets.filter((t) => t.status === "Closed").length,
    },
  ];

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow="Operations"
        title="Tickets"
        description="Manage and track service requests."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setImportOpen(true)}
              className="h-10 rounded-full border-border bg-card px-5 shadow-none"
            >
              <Upload className="size-4" />
              Import
            </Button>
            <Button
              type="button"
              onClick={() => navigate("/tickets/new")}
              className="h-10 rounded-full px-5"
            >
              <Plus className="size-4" />
              Create Ticket
            </Button>
          </div>
        }
      />

      <ImportTickets open={importOpen} onOpenChange={setImportOpen} />

      <div className="flex flex-col gap-7">
        <ContextNav
          items={tabs}
          value={tab}
          onChange={(value) => setTab(value as ContextTab)}
        />

        <TicketFilters
          filters={filters}
          onChange={setFilters}
          resultCount={visible.length}
          assignees={assignees}
        />

        <TicketList
          tickets={visible}
          empty={
            <EmptyState
              title={emptyCopy.title}
              description={emptyCopy.description}
              action={
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFilters(DEFAULT_FILTERS);
                    if (!filtersActive) setTab("all");
                  }}
                  className="h-9 rounded-full border-border bg-card px-4 shadow-none"
                >
                  {filtersActive ? "Clear filters" : "View all tickets"}
                </Button>
              }
              media={
                <LineupStage
                  tone="light"
                  compact
                  bare
                  className="mx-auto h-48 max-w-sm"
                />
              }
            />
          }
        />
      </div>
    </div>
  );
}
