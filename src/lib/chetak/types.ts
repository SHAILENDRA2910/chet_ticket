/**
 * Domain model for the Chetak Service "Ticket Executive" workspace.
 *
 * These types mirror the concepts visible in the existing Hotline-Service
 * application: a service ticket is raised against a customer + vehicle, it is
 * routed through a fixed journey, carries one or more reported issues, and is
 * worked through communication, attachments and a resolution record.
 */

export type TicketStatus =
  | "New"
  | "Assigned"
  | "In Progress"
  | "Pending"
  | "Resolved"
  | "Closed";

export type TicketPriority = "Low" | "Medium" | "High" | "Critical";

export type IssueCategory =
  | "Electrical"
  | "Mechanical"
  | "Battery"
  | "Software"
  | "Body & Paint"
  | "Other";

export type IssueStatus = "Pending" | "In Progress" | "Resolved";

/** How the request reached the service desk. */
export type Channel =
  | "Dealer"
  | "Customer App"
  | "Call Centre"
  | "Field Visit"
  | "Email";

/**
 * Canonical order of the stages a ticket moves through. The journey itself is
 * an append-only log of events — this array only defines the visual order and
 * the stages the seed data may contain.
 */
export const JOURNEY_STAGES = [
  "Created",
  "Assigned",
  "In Progress",
  "Customer Contacted",
  "Resolved",
  "Closed",
] as const;

/**
 * A journey event stage. `Reopened` is an extra event that can only ever be
 * appended (after `Closed`/`Resolved`), never a stage the ticket moves into.
 */
export type JourneyStage = (typeof JOURNEY_STAGES)[number] | "Reopened";

export type ActorRole = "Customer" | "Executive" | "ASM" | "Dealer" | "System";

export interface Person {
  name: string;
  /** Employee / dealer code shown in the legacy application, e.g. `d13250`. */
  code: string;
  role: ActorRole;
}

export interface Customer {
  name: string;
  mobile: string;
  email: string;
  city: string;
}

export interface Vehicle {
  model: string;
  registrationNo: string;
  vin: string;
  batteryNumber: string;
  purchaseDate: string;
  kms: number;
  minCellVoltage: number;
  maxCellVoltage: number;
  ecuList: string[];
}

export interface Dealer {
  name: string;
  code: string;
  mobile: string;
  email: string;
  region: string;
}

export interface TicketIssue {
  id: string;
  title: string;
  category: IssueCategory;
  status: IssueStatus;
  raisedAt: number;
  raisedBy: string;
  /** Free-text detail captured with the issue. */
  details?: string;
  updatedAt?: number;
  /** Name of an optional file attached to the issue itself. */
  attachmentName?: string;
}

/** Fields captured when an executive adds or edits a reported issue. */
export interface IssueInput {
  title: string;
  category: IssueCategory;
  status: IssueStatus;
  details?: string;
  attachmentName?: string;
}

export interface JourneyEntry {
  stage: JourneyStage;
  at: number;
  actor: string;
  note?: string;
}

export type ActivityKind =
  | "created"
  | "assigned"
  | "status"
  | "contact"
  | "note"
  | "diagnosis"
  | "attachment"
  | "resolution"
  | "issue"
  | "import";

export interface ActivityEntry {
  id: string;
  at: number;
  actor: string;
  role: ActorRole;
  kind: ActivityKind;
  action: string;
  detail?: string;
}

/**
 * `reply`/`customer` messages are customer-facing communication; `note`
 * messages are internal-only and must never read as customer communication.
 */
export type CommunicationType = "customer" | "reply" | "note";

export interface Message {
  id: string;
  at: number;
  author: string;
  role: ActorRole;
  body: string;
  attachmentName?: string;
  /** Communication type — keeps internal notes separate from customer comms. */
  kind?: CommunicationType;
  /** Who the message was addressed to. */
  audience?: string;
  /** Subject line, where the communication carries one. */
  subject?: string;
}

export type AttachmentKind = "image" | "document" | "video";

export interface Attachment {
  id: string;
  name: string;
  kind: AttachmentKind;
  sizeLabel: string;
  uploadedBy: string;
  uploadedAt: number;
  /** MIME type reported by the browser for a real upload. */
  mimeType?: string;
  /** In-session object URL for a real upload (used for image thumbnails). */
  previewUrl?: string;
  /** The selected File, held for the current demo session only. */
  file?: File;
  /** Seeded reference data, clearly labelled as demo data in the UI. */
  demo?: boolean;
}

export interface Resolution {
  rootCause: string;
  actionTaken: string;
  remarks: string;
  partsUsed: string;
  resolvedBy: string;
  resolvedAt: number;
}

export interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  channel: Channel;
  /** Set while a ticket sits in `Pending` — what it is waiting on. */
  awaiting?: string;
  customer: Customer;
  vehicle: Vehicle;
  dealer: Dealer;
  executive: Person;
  asm: Person;
  issues: TicketIssue[];
  journey: JourneyEntry[];
  activity: ActivityEntry[];
  messages: Message[];
  attachments: Attachment[];
  resolution?: Resolution;
  /** Prior resolutions preserved when a ticket is reopened. */
  resolutionHistory?: Resolution[];
  createdAt: number;
  updatedAt: number;
  slaWindowMs: number;
  slaDueAt: number;
}

/** Fields the executive can change from the "Update Ticket" action. */
export interface TicketUpdate {
  status: TicketStatus;
  priority: TicketPriority;
  executive: Person;
  note?: string;
}

export interface NewTicketInput {
  customer: Customer;
  vehicle: Vehicle;
  dealer: Dealer;
  executive: Person;
  asm: Person;
  channel: Channel;
  priority: TicketPriority;
  category: IssueCategory;
  subject: string;
  description: string;
  attachments: Attachment[];
  /** Set when the ticket was created by a CSV import. */
  imported?: boolean;
}
