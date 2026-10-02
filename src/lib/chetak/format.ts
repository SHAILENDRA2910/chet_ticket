import type { Ticket } from "./types";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const pad = (value: number) => String(value).padStart(2, "0");

/** `01 Oct 2026` */
export function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** `09:24` */
export function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** `01 Oct 2026, 09:24` */
export function formatDateTime(ts: number): string {
  return `${formatDate(ts)}, ${formatTime(ts)}`;
}

/** `12m ago`, `3h ago`, `2d ago` */
export function relativeTime(ts: number, now: number): string {
  const diff = Math.max(now - ts, 0);
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(ts);
}

/** `01h 42m`, `18m`, `1d 4h` */
export function formatDuration(ms: number): string {
  const total = Math.max(Math.round(ms / 60_000), 0);
  if (total < 60) return `${total}m`;
  const hours = Math.floor(total / 60);
  if (hours < 24) return `${pad(hours)}h ${pad(total % 60)}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export type SlaState = "on-track" | "at-risk" | "breached" | "met";

export interface SlaInfo {
  state: SlaState;
  remainingMs: number;
  /** `01h 42m` or `Breached`. */
  value: string;
  /** `remaining`, `At risk`, `SLA met`. */
  caption: string;
  tone: string;
}

const AT_RISK_THRESHOLD_MS = 90 * 60_000;

export function slaInfo(ticket: Ticket, now: number): SlaInfo {
  const isDone = ticket.status === "Resolved" || ticket.status === "Closed";

  if (isDone) {
    const closedAt = ticket.resolution?.resolvedAt ?? ticket.updatedAt;
    const met = closedAt <= ticket.slaDueAt;
    return {
      state: met ? "met" : "breached",
      remainingMs: ticket.slaDueAt - now,
      value: met ? "Met" : "Breached",
      caption: met ? "Closed within SLA" : "SLA missed",
      tone: met ? "success" : "critical",
    };
  }

  const remainingMs = ticket.slaDueAt - now;

  if (remainingMs <= 0) {
    return {
      state: "breached",
      remainingMs,
      value: "Breached",
      caption: `${formatDuration(Math.abs(remainingMs))} over`,
      tone: "critical",
    };
  }

  if (remainingMs <= AT_RISK_THRESHOLD_MS) {
    return {
      state: "at-risk",
      remainingMs,
      value: formatDuration(remainingMs),
      caption: "At risk",
      tone: "warning",
    };
  }

  return {
    state: "on-track",
    remainingMs,
    value: formatDuration(remainingMs),
    caption: "On track",
    tone: "success",
  };
}

export function isOpen(ticket: Ticket): boolean {
  return ticket.status !== "Resolved" && ticket.status !== "Closed";
}

export function needsAction(ticket: Ticket, now: number): boolean {
  if (!isOpen(ticket)) return false;
  const sla = slaInfo(ticket, now);
  return sla.state === "at-risk" || sla.state === "breached" || ticket.status === "New";
}

export function isSlaRisk(ticket: Ticket, now: number): boolean {
  if (!isOpen(ticket)) return false;
  const sla = slaInfo(ticket, now);
  return sla.state === "at-risk" || sla.state === "breached";
}

/** `1.4 MB`, `240 KB`, `12 B` — for real uploaded files. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  const rounded = exponent === 0 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[exponent]}`;
}
