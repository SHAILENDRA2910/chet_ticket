import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  SEED_TICKETS,
  SLA_WINDOW,
  EXECUTIVES,
  DEMO_SESSION,
} from "./data";
import { isOpen, isSlaRisk, needsAction, slaInfo } from "./format";
import { appendJourneyForStatus, canTransition } from "./workflow";
import type {
  ActivityEntry,
  ActorRole,
  Attachment,
  IssueInput,
  Message,
  NewTicketInput,
  Person,
  Resolution,
  Ticket,
  TicketIssue,
  TicketStatus,
  TicketUpdate,
} from "./types";

/** The executive signed in to this workspace. */
/** The executive the signed-in demo session works as. */
export const CURRENT_EXECUTIVE: Person = DEMO_SESSION.executive;

let seq = 900;
const uid = (prefix: string) => `${prefix}-${(seq += 1)}`;

/**
 * Append the journey events for a status change. The journey is append-only:
 * existing history is never rewritten or removed when the status moves.
 */
function advanceJourney(
  ticket: Ticket,
  status: TicketStatus,
  at: number,
  actor: string,
  note?: string,
): Ticket["journey"] {
  const appended = appendJourneyForStatus(
    ticket.journey,
    ticket.status,
    status,
    at,
    actor,
    note,
  );
  if (!appended.length) return ticket.journey;
  return [
    ...ticket.journey,
    ...appended.map((entry) => ({
      ...entry,
      note:
        entry.note ??
        (entry.stage === "Assigned"
          ? `Routed to ${ticket.executive.name}`
          : undefined),
    })),
  ];
}

function activity(
  at: number,
  actor: string,
  role: ActorRole,
  kind: ActivityEntry["kind"],
  action: string,
  detail?: string,
): ActivityEntry {
  return { id: uid("act"), at, actor, role, kind, action, detail };
}

function nextTicketId(tickets: Ticket[]): string {
  const highest = tickets.reduce((max, ticket) => {
    const value = Number(ticket.id.split("-").pop());
    return Number.isFinite(value) && value > max ? value : max;
  }, 0);
  return `TKT-2026-${String(highest + 1).padStart(5, "0")}`;
}

/** Build a ticket from the create/import input. Shared by both flows. */
function buildNewTicket(
  input: NewTicketInput,
  id: string,
  at: number,
  imported = false,
): Ticket {
  const created: Ticket = {
    id,
    subject: input.subject,
    description: input.description,
    status: "New",
    priority: input.priority,
    channel: input.channel,
    customer: input.customer,
    vehicle: input.vehicle,
    dealer: input.dealer,
    executive: input.executive,
    asm: input.asm,
    issues: [
      {
        id: uid("iss"),
        title: input.subject,
        category: input.category,
        status: "Pending",
        raisedAt: at,
        raisedBy: input.customer.name,
      },
    ],
    journey: [
      {
        stage: "Created",
        at,
        actor: input.customer.name,
        note: `Raised via ${input.channel} · ${input.dealer.name}`,
      },
    ],
    activity: [
      activity(at, CURRENT_EXECUTIVE.name, "Executive", "created", "Ticket created", input.subject),
      ...(imported
        ? [
            activity(
              at,
              CURRENT_EXECUTIVE.name,
              "Executive",
              "import",
              "Ticket imported",
              `Imported from CSV · ${input.dealer.name}`,
            ),
          ]
        : []),
    ],
    messages: [],
    attachments: input.attachments,
    createdAt: at,
    updatedAt: at,
    slaWindowMs: SLA_WINDOW[input.priority],
    slaDueAt: at + SLA_WINDOW[input.priority],
  };
  return created;
}

export interface WorkspaceStats {
  open: number;
  needsAction: number;
  slaAtRisk: number;
  resolvedToday: number;
  createdToday: number;
  breached: number;
  closedLast7Days: number;
  avgResolutionMs: number;
  slaCompliance: number;
  byCategory: Array<{ label: string; value: number }>;
  byDealer: Array<{ label: string; value: number }>;
  byExecutive: Array<{ label: string; code: string; open: number; resolved: number }>;
  daily: Array<{ label: string; received: number; resolved: number }>;
}

interface TicketStore {
  tickets: Ticket[];
  now: number;
  currentExecutive: Person;
  getTicket: (id: string) => Ticket | undefined;
  createTicket: (input: NewTicketInput) => Ticket;
  importTickets: (inputs: NewTicketInput[]) => Ticket[];
  updateTicket: (id: string, update: TicketUpdate) => void;
  addIssue: (id: string, issue: IssueInput) => void;
  updateIssue: (id: string, issueId: string, issue: IssueInput) => void;
  removeIssue: (id: string, issueId: string) => void;
  addMessage: (id: string, message: Omit<Message, "id">) => void;
  addAttachment: (id: string, attachment: Omit<Attachment, "id">) => void;
  resolveTicket: (id: string, resolution: Omit<Resolution, "resolvedAt">) => void;
  reopenTicket: (id: string) => void;
  resetDemo: () => void;
  stats: WorkspaceStats;
}

const TicketContext = createContext<TicketStore | null>(null);

const DAY = 24 * 60 * 60 * 1000;

function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function computeStats(tickets: Ticket[], now: number): WorkspaceStats {
  const today = startOfDay(now);
  const weekAgo = now - 7 * DAY;

  const open = tickets.filter(isOpen);
  const resolvedTickets = tickets.filter((t) => t.resolution);

  const byCategoryMap = new Map<string, number>();
  const byDealerMap = new Map<string, number>();
  for (const ticket of tickets) {
    for (const issue of ticket.issues) {
      byCategoryMap.set(issue.category, (byCategoryMap.get(issue.category) ?? 0) + 1);
    }
    byDealerMap.set(ticket.dealer.name, (byDealerMap.get(ticket.dealer.name) ?? 0) + 1);
  }

  const durations = resolvedTickets.map(
    (t) => (t.resolution?.resolvedAt ?? t.updatedAt) - t.createdAt,
  );
  const avgResolutionMs = durations.length
    ? durations.reduce((sum, value) => sum + value, 0) / durations.length
    : 0;

  const met = resolvedTickets.filter(
    (t) => (t.resolution?.resolvedAt ?? t.updatedAt) <= t.slaDueAt,
  ).length;

  const byExecutive = EXECUTIVES.map((person) => ({
    label: person.name,
    code: person.code,
    open: open.filter((t) => t.executive.name === person.name).length,
    resolved: resolvedTickets.filter((t) => t.executive.name === person.name).length,
  }));

  const daily = Array.from({ length: 7 }, (_, index) => {
    const dayStart = startOfDay(now) - (6 - index) * DAY;
    const dayEnd = dayStart + DAY;
    const label = new Date(dayStart).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });
    return {
      label,
      received: tickets.filter(
        (t) => t.createdAt >= dayStart && t.createdAt < dayEnd,
      ).length,
      resolved: resolvedTickets.filter((t) => {
        const at = t.resolution?.resolvedAt ?? t.updatedAt;
        return at >= dayStart && at < dayEnd;
      }).length,
    };
  });

  return {
    open: open.length,
    needsAction: tickets.filter((t) => needsAction(t, now)).length,
    slaAtRisk: tickets.filter((t) => isSlaRisk(t, now)).length,
    resolvedToday: resolvedTickets.filter((t) => {
      const at = t.resolution?.resolvedAt ?? t.updatedAt;
      return at >= today;
    }).length,
    createdToday: tickets.filter((t) => t.createdAt >= today).length,
    breached: tickets.filter((t) => slaInfo(t, now).state === "breached").length,
    closedLast7Days: resolvedTickets.filter((t) => {
      const at = t.resolution?.resolvedAt ?? t.updatedAt;
      return at >= weekAgo;
    }).length,
    avgResolutionMs,
    slaCompliance: resolvedTickets.length
      ? Math.round((met / resolvedTickets.length) * 100)
      : 100,
    byCategory: [...byCategoryMap.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value),
    byDealer: [...byDealerMap.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value),
    byExecutive,
    daily,
  };
}

export function TicketProvider({ children }: { children: ReactNode }) {
  const [tickets, setTickets] = useState<Ticket[]>(SEED_TICKETS);
  const [now, setNow] = useState(() => Date.now());
  const ticketsRef = useRef(tickets);
  ticketsRef.current = tickets;

  // Keep the SLA readouts live without re-rendering the tree constantly.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const updateTicket = useCallback((id: string, update: TicketUpdate) => {
    setTickets((current) =>
      current.map((ticket) => {
        if (ticket.id !== id) return ticket;
        const at = Date.now();
        const actor = CURRENT_EXECUTIVE.name;
        const entries: ActivityEntry[] = [];
        const statusChanged =
          ticket.status !== update.status &&
          canTransition(ticket.status, update.status);
        const priorityChanged = ticket.priority !== update.priority;
        const assigneeChanged = ticket.executive.name !== update.executive.name;

        if (statusChanged) {
          entries.push(
            activity(
              at,
              actor,
              "Executive",
              "status",
              `Status changed to ${update.status}`,
              update.note,
            ),
          );
        }
        if (assigneeChanged) {
          entries.push(
            activity(
              at,
              actor,
              "Executive",
              "assigned",
              `Assigned to ${update.executive.name}`,
              `${update.executive.name} (${update.executive.code})`,
            ),
          );
        }
        if (priorityChanged) {
          entries.push(
            activity(at, actor, "Executive", "status", `Priority set to ${update.priority}`),
          );
        }
        if (update.note && !statusChanged) {
          entries.push(activity(at, actor, "Executive", "note", "Note added", update.note));
        }

        const nextStatus = statusChanged ? update.status : ticket.status;
        const journey = statusChanged
          ? advanceJourney(ticket, nextStatus, at, actor, update.note)
          : ticket.journey;

        return {
          ...ticket,
          status: nextStatus,
          priority: update.priority,
          executive: update.executive,
          journey,
          activity: [...entries, ...ticket.activity],
          updatedAt: at,
        };
      }),
    );
  }, []);

  const addMessage = useCallback((id: string, message: Omit<Message, "id">) => {
    setTickets((current) =>
      current.map((ticket) => {
        if (ticket.id !== id) return ticket;
        const internal =
          message.kind === "note" || message.role === "System";
        const action = internal
          ? "Internal note added"
          : message.role === "Customer"
            ? "Customer replied"
            : message.role === "ASM"
              ? "ASM note shared with customer"
              : "Reply sent to customer";
        return {
          ...ticket,
          messages: [
            ...ticket.messages,
            {
              ...message,
              kind:
                message.kind ??
                (message.role === "Customer" ? "customer" : internal ? "note" : "reply"),
              id: uid("msg"),
            },
          ],
          updatedAt: message.at,
          activity: [
            activity(
              message.at,
              message.author,
              message.role,
              internal ? "note" : "contact",
              action,
              message.body.length > 90
                ? `${message.body.slice(0, 90)}…`
                : message.body,
            ),
            ...ticket.activity,
          ],
        };
      }),
    );
  }, []);

  const addAttachment = useCallback(
    (id: string, attachment: Omit<Attachment, "id">) => {
      setTickets((current) =>
        current.map((ticket) =>
          ticket.id === id
            ? {
                ...ticket,
                attachments: [...ticket.attachments, { ...attachment, id: uid("att") }],
                updatedAt: attachment.uploadedAt,
                activity: [
                  activity(
                    attachment.uploadedAt,
                    attachment.uploadedBy,
                    "Executive",
                    "attachment",
                    `Uploaded ${attachment.name}`,
                  ),
                  ...ticket.activity,
                ],
              }
            : ticket,
        ),
      );
    },
    [],
  );

  const emitIssue = useCallback(
    (id: string, mutate: (ticket: Ticket, at: number) => Ticket | null) => {
      setTickets((current) =>
        current.map((ticket) => {
          if (ticket.id !== id) return ticket;
          const at = Date.now();
          const next = mutate(ticket, at);
          return next ?? ticket;
        }),
      );
    },
    [],
  );

  const addIssue = useCallback(
    (id: string, issue: IssueInput) => {
      emitIssue(id, (ticket, at) => {
        const actor = CURRENT_EXECUTIVE.name;
        const entry: TicketIssue = {
          id: uid("iss"),
          title: issue.title.trim(),
          category: issue.category,
          status: issue.status,
          details: issue.details?.trim() || undefined,
          attachmentName: issue.attachmentName,
          raisedAt: at,
          raisedBy: actor,
        };
        return {
          ...ticket,
          issues: [...ticket.issues, entry],
          activity: [
            activity(
              at,
              actor,
              "Executive",
              "issue",
              "Issue added",
              `${entry.title} · ${entry.category}`,
            ),
            ...ticket.activity,
          ],
          updatedAt: at,
        };
      });
    },
    [emitIssue],
  );

  const updateIssue = useCallback(
    (id: string, issueId: string, issue: IssueInput) => {
      emitIssue(id, (ticket, at) => {
        const actor = CURRENT_EXECUTIVE.name;
        const existing = ticket.issues.find((item) => item.id === issueId);
        if (!existing) return null;
        return {
          ...ticket,
          issues: ticket.issues.map((item) =>
            item.id === issueId
              ? {
                  ...item,
                  title: issue.title.trim(),
                  category: issue.category,
                  status: issue.status,
                  details: issue.details?.trim() || undefined,
                  attachmentName: issue.attachmentName ?? item.attachmentName,
                  updatedAt: at,
                }
              : item,
          ),
          activity: [
            activity(
              at,
              actor,
              "Executive",
              "issue",
              "Issue updated",
              `${issue.title.trim()} · ${issue.category}`,
            ),
            ...ticket.activity,
          ],
          updatedAt: at,
        };
      });
    },
    [emitIssue],
  );

  const removeIssue = useCallback(
    (id: string, issueId: string) => {
      emitIssue(id, (ticket, at) => {
        const existing = ticket.issues.find((item) => item.id === issueId);
        if (!existing) return null;
        const actor = CURRENT_EXECUTIVE.name;
        return {
          ...ticket,
          issues: ticket.issues.filter((item) => item.id !== issueId),
          activity: [
            activity(
              at,
              actor,
              "Executive",
              "issue",
              "Issue removed",
              `${existing.title} · ${existing.category}`,
            ),
            ...ticket.activity,
          ],
          updatedAt: at,
        };
      });
    },
    [emitIssue],
  );

  const resolveTicket = useCallback(
    (id: string, resolution: Omit<Resolution, "resolvedAt">) => {
      setTickets((current) =>
        current.map((ticket) => {
          if (ticket.id !== id) return ticket;
          const at = Date.now();
          const actor = CURRENT_EXECUTIVE.name;
          return {
            ...ticket,
            status: "Resolved" as TicketStatus,
            awaiting: undefined,
            resolution: { ...resolution, resolvedAt: at },
            issues: ticket.issues.map((issue) => ({
              ...issue,
              status: "Resolved" as const,
            })),
            journey: advanceJourney(ticket, "Resolved", at, actor, resolution.remarks),
            activity: [
              activity(
                at,
                actor,
                "Executive",
                "resolution",
                "Ticket marked as resolved",
                resolution.actionTaken,
              ),
              ...ticket.activity,
            ],
            updatedAt: at,
          };
        }),
      );
    },
    [],
  );

  const reopenTicket = useCallback((id: string) => {
    setTickets((current) =>
      current.map((ticket) => {
        if (ticket.id !== id) return ticket;
        const at = Date.now();
        const actor = CURRENT_EXECUTIVE.name;
        // The resolution is preserved as historical info, the journey and
        // activity logs are appended to (nothing is deleted).
        const resolutionHistory = ticket.resolution
          ? [...(ticket.resolutionHistory ?? []), ticket.resolution]
          : ticket.resolutionHistory;
        return {
          ...ticket,
          status: "In Progress" as TicketStatus,
          awaiting: undefined,
          resolution: undefined,
          resolutionHistory,
          journey: advanceJourney(ticket, "In Progress", at, actor),
          activity: [
            activity(
              at,
              actor,
              "Executive",
              "status",
              "Ticket reopened",
              "Customer reported the issue again.",
            ),
            ...ticket.activity,
          ],
          updatedAt: at,
        };
      }),
    );
  }, []);

  const resetDemo = useCallback(() => {
    seq = 900;
    setTickets(SEED_TICKETS);
    setNow(Date.now());
  }, []);

  const createTicket = useCallback((input: NewTicketInput) => {
    const at = Date.now();
    const id = nextTicketId(ticketsRef.current);
    const created = buildNewTicket(input, id, at);
    setTickets((current) => [created, ...current]);
    return created;
  }, []);

  const importTickets = useCallback((inputs: NewTicketInput[]) => {
    if (!inputs.length) return [];
    const at = Date.now();
    const created: Ticket[] = [];
    let highest = ticketsRef.current.reduce((max, ticket) => {
      const value = Number(ticket.id.split("-").pop());
      return Number.isFinite(value) && value > max ? value : max;
    }, 0);
    for (const input of inputs) {
      highest += 1;
      const id = `TKT-2026-${String(highest).padStart(5, "0")}`;
      created.push(buildNewTicket(input, id, at, true));
    }
    setTickets((current) => [...created, ...current]);
    return created;
  }, []);

  const getTicket = useCallback(
    (id: string) => ticketsRef.current.find((ticket) => ticket.id === id),
    [],
  );

  const stats = useMemo(() => computeStats(tickets, now), [tickets, now]);

  const value = useMemo<TicketStore>(
    () => ({
      tickets,
      now,
      currentExecutive: CURRENT_EXECUTIVE,
      getTicket,
      createTicket,
      importTickets,
      updateTicket,
      addIssue,
      updateIssue,
      removeIssue,
      addMessage,
      addAttachment,
      resolveTicket,
      reopenTicket,
      resetDemo,
      stats,
    }),
    [
      tickets,
      now,
      getTicket,
      createTicket,
      importTickets,
      updateTicket,
      addIssue,
      updateIssue,
      removeIssue,
      addMessage,
      addAttachment,
      resolveTicket,
      reopenTicket,
      resetDemo,
      stats,
    ],
  );

  return <TicketContext.Provider value={value}>{children}</TicketContext.Provider>;
}

export function useTicketStore(): TicketStore {
  const context = useContext(TicketContext);
  if (!context) {
    throw new Error("useTicketStore must be used inside a <TicketProvider>");
  }
  return context;
}

export function useTicket(id: string | undefined): Ticket | undefined {
  const { tickets } = useTicketStore();
  return useMemo(
    () => (id ? tickets.find((ticket) => ticket.id === id) : undefined),
    [tickets, id],
  );
}
