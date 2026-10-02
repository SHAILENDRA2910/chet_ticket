import type { JourneyStage, TicketStatus } from "./types";

/**
 * Status and Journey are related but different things:
 *   - Status  = the ticket's current state.
 *   - Journey = an append-only log of the stages it has actually moved through.
 *
 * This module holds the explicit status → stage lookup used only to choose the
 * stage label appended when a status changes. Display code must render the
 * journey from `ticket.journey` events, never from the current status.
 */

export const STAGE_SEQUENCE: JourneyStage[] = [
  "Created",
  "Assigned",
  "In Progress",
  "Customer Contacted",
  "Resolved",
  "Closed",
];

/** The stage a status sits on. `Reopened` is an event, not a status. */
export const STAGE_FOR_STATUS: Record<TicketStatus, JourneyStage> = {
  New: "Created",
  Assigned: "Assigned",
  "In Progress": "In Progress",
  Pending: "In Progress",
  Resolved: "Resolved",
  Closed: "Closed",
};

export function stageRank(stage: JourneyStage): number {
  if (stage === "Reopened") return STAGE_SEQUENCE.length;
  return STAGE_SEQUENCE.indexOf(stage);
}

/** The canonical stages a ticket with this status will have moved through. */
export function stagesForStatus(status: TicketStatus): JourneyStage[] {
  const target = stageRank(STAGE_FOR_STATUS[status]);
  return STAGE_SEQUENCE.filter((stage) => stageRank(stage) <= target);
}

/**
 * Sensible lifecycle transitions, taken from the existing Ticket Executive
 * workflow. Reopening a resolved/closed ticket moves it back to In Progress.
 */
export const STATUS_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  New: ["Assigned", "In Progress", "Closed"],
  Assigned: ["In Progress", "Pending", "Closed"],
  "In Progress": ["Pending", "Resolved", "Closed"],
  Pending: ["In Progress", "Resolved", "Closed"],
  Resolved: ["Closed", "In Progress"],
  Closed: ["In Progress"],
};

/** The current status plus every status it may move to. */
export function allowedStatuses(current: TicketStatus): TicketStatus[] {
  return [current, ...STATUS_TRANSITIONS[current]];
}

export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
  return from === to || STATUS_TRANSITIONS[from].includes(to);
}

/** True when moving to `to` reopens an already resolved/closed ticket. */
export function isReopen(from: TicketStatus, to: TicketStatus): boolean {
  return (
    (from === "Resolved" || from === "Closed") &&
    (to === "In Progress" || to === "Assigned")
  );
}

/**
 * Append the journey events for a status change. Old events are never removed:
 * the function only ever appends the canonical stages the ticket has now
 * reached, plus a `Reopened` marker when the ticket was reopened.
 */
export function appendJourneyForStatus(
  journey: { stage: JourneyStage }[],
  from: TicketStatus,
  to: TicketStatus,
  at: number,
  actor: string,
  note?: string,
): Array<{ stage: JourneyStage; at: number; actor: string; note?: string }> {
  // The progression position is the most recent canonical stage, so a ticket
  // reopened back to In Progress can still append Resolved again later.
  let reached = -1;
  for (let index = journey.length - 1; index >= 0; index -= 1) {
    if (journey[index].stage === "Reopened") continue;
    reached = stageRank(journey[index].stage);
    break;
  }

  const appended: Array<{
    stage: JourneyStage;
    at: number;
    actor: string;
    note?: string;
  }> = [];

  if (isReopen(from, to)) {
    appended.push({ stage: "Reopened", at, actor, note });
    appended.push({ stage: "In Progress", at, actor });
    return appended;
  }

  const target = stageRank(STAGE_FOR_STATUS[to]);
  const stages = STAGE_SEQUENCE.slice(reached + 1, target + 1);
  stages.forEach((stage, index) => {
    appended.push({
      stage,
      at,
      actor,
      note: index === stages.length - 1 ? note : undefined,
    });
  });

  return appended;
}
