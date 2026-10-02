/**
 * Local draft storage for the Create Ticket screen.
 *
 * A draft is only ever reported as saved once it has actually been written to
 * localStorage, and it survives a browser refresh so the executive can resume.
 */

const DRAFT_KEY = "chetak.ticket-draft.v1";

export interface TicketDraft<T> {
  savedAt: number;
  form: T;
}

export function readDraft<T>(): TicketDraft<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TicketDraft<T>;
    if (!parsed || typeof parsed.savedAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Persist the draft and return it. Throws nothing — returns null on failure. */
export function writeDraft<T>(form: T): TicketDraft<T> | null {
  if (typeof window === "undefined") return null;
  const draft: TicketDraft<T> = { savedAt: Date.now(), form };
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    return draft;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore quota / privacy-mode failures */
  }
}
