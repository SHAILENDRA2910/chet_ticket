import { cn } from "@/lib/utils";
import {
  formatBytes,
  formatDate,
  formatDateTime,
  formatTime,
  relativeTime,
  slaInfo,
} from "@/lib/chetak/format";
import { ISSUE_CATEGORIES } from "@/lib/chetak/data";
import { useTicketStore } from "@/lib/chetak/store";
import type {
  ActivityEntry,
  ActivityKind,
  Attachment,
  IssueCategory,
  IssueInput,
  IssueStatus,
  Message,
  Ticket,
  TicketIssue,
} from "@/lib/chetak/types";
import {
  CheckCircle2,
  Eye,
  FilePlus2,
  FileText,
  Film,
  Image as ImageIcon,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  StickyNote,
  Trash2,
  Upload,
  UserCheck,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  InitialsAvatar,
  MetaField,
  PriorityBadge,
  SectionHeading,
  SlaIndicator,
  StatusBadge,
} from "./primitives";
import { VehicleImage, photoFor } from "./VehicleImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* -------------------------------------------------------------------------- */
/* Header                                                                      */
/* -------------------------------------------------------------------------- */

export function TicketHeader({
  ticket,
  onUpdate,
}: {
  ticket: Ticket;
  onUpdate: () => void;
}) {
  const { now } = useTicketStore();
  const sla = slaInfo(ticket, now);

  return (
    <header>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="label-eyebrow">
            Service request · {ticket.channel} · raised{" "}
            {relativeTime(ticket.createdAt, now)}
          </p>
          <h1 className="mt-3 text-4xl font-semibold tabular-nums tracking-[-0.035em] text-ink sm:text-5xl">
            {ticket.id}
          </h1>
          <p className="mt-3 max-w-2xl text-lg leading-snug text-muted-foreground">
            {ticket.subject}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              document
                .getElementById("communication")
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
            className="h-10 rounded-full border-border bg-card px-5 shadow-none"
          >
            Add note
          </Button>
          <Button
            type="button"
            onClick={onUpdate}
            className="h-10 rounded-full px-5"
          >
            Update Ticket
          </Button>
        </div>
      </div>

      <div className="mt-8 grid gap-7 border-y border-border py-7 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        <div>
          <p className="label-eyebrow">Priority</p>
          <PriorityBadge priority={ticket.priority} className="mt-3" />
        </div>
        <div>
          <p className="label-eyebrow">Status</p>
          <StatusBadge status={ticket.status} size="md" className="mt-2.5" />
          {ticket.awaiting ? (
            <p className="mt-2 text-xs text-muted-foreground">{ticket.awaiting}</p>
          ) : null}
        </div>
        <SlaIndicator ticket={ticket} variant="stacked" />
        <div className="min-w-0">
          <p className="label-eyebrow">Assigned to</p>
          <div className="mt-2.5 flex items-center gap-2.5">
            <InitialsAvatar name={ticket.executive.name} />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-ink">
                {ticket.executive.name}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {ticket.executive.code} · {ticket.asm.name} (ASM)
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/* Metadata                                                                    */
/* -------------------------------------------------------------------------- */

export function TicketMetadata({ ticket }: { ticket: Ticket }) {
  return (
    <section className="grid gap-7 border-b border-border pb-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <MetaField label="Customer" value={ticket.customer.name} hint={ticket.customer.city} />
      <MetaField
        label="Vehicle"
        value={ticket.vehicle.model}
        hint={`${ticket.vehicle.registrationNo} · ${ticket.vehicle.kms.toLocaleString("en-IN")} km`}
      />
      <MetaField
        label="Contact"
        value={ticket.customer.mobile}
        hint={ticket.customer.email}
      />
      <MetaField
        label="Category"
        value={ticket.issues[0]?.category ?? "Other"}
        hint={`${ticket.issues.length} reported issue${ticket.issues.length === 1 ? "" : "s"}`}
      />
      <MetaField
        label="Created"
        value={formatDate(ticket.createdAt)}
        hint={formatTime(ticket.createdAt)}
      />
      <MetaField
        label="Updated"
        value={formatDate(ticket.updatedAt)}
        hint={formatTime(ticket.updatedAt)}
      />
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Reported issues                                                             */
/* -------------------------------------------------------------------------- */

const ISSUE_STATUSES: IssueStatus[] = ["Pending", "In Progress", "Resolved"];

const EMPTY_ISSUE: IssueInput = {
  title: "",
  category: "Electrical",
  status: "Pending",
  details: "",
};

function issueStatusTone(status: IssueStatus) {
  return status;
}

export function TicketIssues({ ticket }: { ticket: Ticket }) {
  const { addIssue, updateIssue, removeIssue } = useTicketStore();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "edit" | "view">("add");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<IssueInput>(EMPTY_ISSUE);
  const [pendingRemove, setPendingRemove] = useState<TicketIssue | null>(null);
  const savingRef = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Release the double-submit guard once the dialog has closed.
  useEffect(() => {
    if (!open) savingRef.current = false;
  }, [open]);

  const startAdd = () => {
    setMode("add");
    setEditingId(null);
    setForm(EMPTY_ISSUE);
    setOpen(true);
  };

  const start = (issue: TicketIssue, next: "edit" | "view") => {
    setMode(next);
    setEditingId(issue.id);
    setForm({
      title: issue.title,
      category: issue.category,
      status: issue.status,
      details: issue.details ?? "",
      attachmentName: issue.attachmentName,
    });
    setOpen(true);
  };

  const set = <K extends keyof IssueInput>(key: K, value: IssueInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const onPickFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    set("attachmentName", file.name);
  };

  const save = () => {
    const title = form.title.trim();
    if (!title || savingRef.current) return;
    savingRef.current = true;
    const payload: IssueInput = {
      ...form,
      title,
      details: form.details?.trim() || undefined,
    };
    if (mode === "edit" && editingId) {
      updateIssue(ticket.id, editingId, payload);
      toast.success("Issue updated.");
    } else {
      addIssue(ticket.id, payload);
      toast.success("Issue added.");
    }
    setOpen(false);
  };

  const readOnly = mode === "view";

  return (
    <section>
      <SectionHeading
        label="Reported issues"
        title={`${ticket.issues.length} concern${ticket.issues.length === 1 ? "" : "s"} on this ticket`}
        action={
          <Button
            type="button"
            variant="outline"
            onClick={startAdd}
            className="h-9 rounded-full border-border bg-card px-4 shadow-none"
          >
            <Plus className="size-3.5" />
            Add Issue
          </Button>
        }
      />
      <ul className="mt-6 border-t border-border">
        {ticket.issues.map((issue) => (
          <li
            key={issue.id}
            className="flex flex-col gap-2 border-b border-border py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">{issue.title}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {issue.category} · raised by {issue.raisedBy} ·{" "}
                {formatDateTime(issue.updatedAt ?? issue.raisedAt)}
              </p>
              {issue.details ? (
                <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
                  {issue.details}
                </p>
              ) : null}
              {issue.attachmentName ? (
                <p className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] text-steel">
                  <Paperclip className="size-3" />
                  {issue.attachmentName}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <StatusBadge status={issueStatusTone(issue.status)} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={`Actions for ${issue.title}`}
                    className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-sand hover:text-ink"
                  >
                    <MoreHorizontal className="size-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem
                    onClick={() => start(issue, "view")}
                    className="cursor-pointer"
                  >
                    <Eye className="mr-2 size-4" />
                    View
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => start(issue, "edit")}
                    className="cursor-pointer"
                  >
                    <Pencil className="mr-2 size-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setPendingRemove(issue)}
                    className="cursor-pointer"
                  >
                    <Trash2 className="mr-2 size-4" />
                    Remove
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </li>
        ))}
        {!ticket.issues.length ? (
          <li className="border-b border-border py-6 text-center text-[13px] text-muted-foreground">
            No issues recorded yet — add the first concern.
          </li>
        ) : null}
      </ul>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="text-left">
            <DialogTitle>
              {mode === "add"
                ? "Add issue"
                : mode === "edit"
                  ? "Edit issue"
                  : "Issue details"}
            </DialogTitle>
            <DialogDescription className="text-[13px]">
              {ticket.id} · reported issue against this service ticket.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5">
            <label className="flex flex-col gap-2">
              <span className="label-eyebrow">Issue summary</span>
              <Input
                value={form.title}
                disabled={readOnly}
                onChange={(event) => set("title", event.target.value)}
                placeholder="e.g. Side stand switch not working"
                className="h-11 rounded-xl border-border bg-card text-[14px] shadow-none"
              />
            </label>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="label-eyebrow">Category / type</span>
                <Select
                  value={form.category}
                  disabled={readOnly}
                  onValueChange={(value) => set("category", value as IssueCategory)}
                >
                  <SelectTrigger className="h-11 w-full rounded-xl border-border bg-card text-[14px] shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ISSUE_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="label-eyebrow">Issue status</span>
                <Select
                  value={form.status}
                  disabled={readOnly}
                  onValueChange={(value) => set("status", value as IssueStatus)}
                >
                  <SelectTrigger className="h-11 w-full rounded-xl border-border bg-card text-[14px] shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ISSUE_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            </div>

            <label className="flex flex-col gap-2">
              <span className="label-eyebrow">Issue details</span>
              <Textarea
                value={form.details ?? ""}
                disabled={readOnly}
                onChange={(event) => set("details", event.target.value)}
                rows={3}
                placeholder="What did the customer report, and what has been observed?"
                className="resize-none rounded-xl border-border bg-card text-[13px] shadow-none"
              />
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx"
                onChange={onPickFile}
              />
              {!readOnly ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                  className="h-9 rounded-full border-border bg-card px-4 shadow-none"
                >
                  <Paperclip className="size-3.5" />
                  {form.attachmentName ? "Change file" : "Attach file (optional)"}
                </Button>
              ) : null}
              {form.attachmentName ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-sand px-3 py-1.5 text-[12px] font-medium text-steel">
                  <FileText className="size-3" />
                  {form.attachmentName}
                  {!readOnly ? (
                    <button
                      type="button"
                      aria-label="Remove attachment"
                      onClick={() => set("attachmentName", undefined)}
                      className="text-muted-foreground transition-colors hover:text-critical"
                    >
                      <X className="size-3" />
                    </button>
                  ) : null}
                </span>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="h-10 rounded-full text-muted-foreground"
            >
              {readOnly ? "Close" : "Cancel"}
            </Button>
            {!readOnly ? (
              <Button
                type="button"
                onClick={save}
                disabled={!form.title.trim()}
                className="h-10 rounded-full px-5"
              >
                {mode === "edit" ? "Save changes" : "Save Issue"}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={pendingRemove !== null}
        onOpenChange={(next) => {
          if (!next) setPendingRemove(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle>Remove this issue?</AlertDialogTitle>
            <AlertDialogDescription className="text-[13px] leading-relaxed">
              {pendingRemove
                ? `“${pendingRemove.title}” will be removed from ${ticket.id}. The removal is recorded in the ticket history.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-10 rounded-full">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingRemove) {
                  removeIssue(ticket.id, pendingRemove.id);
                  toast.success("Issue removed.");
                }
                setPendingRemove(null);
              }}
              className="h-10 rounded-full bg-critical text-ivory hover:bg-critical/90"
            >
              Remove issue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Vehicle + dealer detail                                                     */
/* -------------------------------------------------------------------------- */

export function VehicleDetail({ ticket }: { ticket: Ticket }) {
  const rows = [
    { label: "VIN", value: ticket.vehicle.vin },
    { label: "Battery number", value: ticket.vehicle.batteryNumber },
    { label: "Purchase date", value: ticket.vehicle.purchaseDate },
    {
      label: "Cell voltage",
      value: `${ticket.vehicle.minCellVoltage} V – ${ticket.vehicle.maxCellVoltage} V`,
    },
  ];

  return (
    <section>
      <SectionHeading label="Vehicle record" title="Vehicle & dealer context" />
      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
        <VehicleImage
          model={ticket.vehicle.model}
          className="h-44 bg-linear-to-br from-sand to-ivory"
          imageClassName="p-3 transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <dl className="divide-y divide-border">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-4 px-4 py-3">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {row.label}
              </dt>
              <dd className="truncate text-[13px] font-medium text-ink">{row.value}</dd>
            </div>
          ))}
        </dl>
        <div className="border-t border-border px-4 py-4">
          <p className="label-eyebrow">ECU list</p>
          <ul className="mt-2.5 flex flex-wrap gap-1.5">
            {ticket.vehicle.ecuList.map((ecu) => (
              <li
                key={ecu}
                className="rounded-full bg-sand px-2.5 py-1 text-[11px] font-medium text-steel"
              >
                {ecu}
              </li>
            ))}
          </ul>
        </div>
        <div className="border-t border-border px-4 py-4">
          <p className="label-eyebrow">Dealer</p>
          <p className="mt-2 text-[13px] font-semibold text-ink">{ticket.dealer.name}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Code {ticket.dealer.code} · {ticket.dealer.region}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">{ticket.dealer.mobile}</p>
          <p className="text-[11px] text-muted-foreground">{ticket.dealer.email}</p>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Activity                                                                    */
/* -------------------------------------------------------------------------- */

const ACTIVITY_ICON: Record<ActivityKind, typeof FilePlus2> = {
  created: FilePlus2,
  assigned: UserCheck,
  status: RefreshCw,
  contact: MessageSquare,
  note: StickyNote,
  diagnosis: Wrench,
  attachment: Paperclip,
  resolution: CheckCircle2,
  issue: Wrench,
  import: Upload,
};

const ACTIVITY_TONE: Record<ActivityKind, string> = {
  created: "bg-sand text-steel",
  assigned: "bg-info-soft text-info",
  status: "bg-sand text-steel",
  contact: "bg-info-soft text-info",
  note: "bg-warning-soft text-warning",
  diagnosis: "bg-teal-soft text-teal",
  attachment: "bg-sand text-steel",
  resolution: "bg-success-soft text-success",
  issue: "bg-teal-soft text-teal",
  import: "bg-info-soft text-info",
};

export function ActivityTimeline({ activity }: { activity: ActivityEntry[] }) {
  const { now } = useTicketStore();

  return (
    <ol className="mt-6">
      {activity.map((item, index) => {
        const Icon = ACTIVITY_ICON[item.kind];
        return (
          <li
            key={item.id}
            className="relative grid grid-cols-[3.35rem_1.5rem_minmax(0,1fr)] gap-x-4 pb-7 last:pb-0"
          >
            <span className="pt-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
              {formatTime(item.at)}
            </span>
            <span className="relative flex justify-center">
              {index !== activity.length - 1 ? (
                <span className="absolute left-1/2 top-7 -bottom-1 w-px -translate-x-1/2 bg-border" />
              ) : null}
              <span
                className={cn(
                  "relative z-10 grid size-6 place-items-center rounded-full",
                  ACTIVITY_TONE[item.kind],
                )}
              >
                <Icon className="size-3" />
              </span>
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">{item.action}</p>
              {item.detail ? (
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                  {item.detail}
                </p>
              ) : null}
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {item.actor} · {relativeTime(item.at, now)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* -------------------------------------------------------------------------- */
/* Communication                                                               */
/* -------------------------------------------------------------------------- */

function MessageBubble({ message }: { message: Message }) {
  const { now } = useTicketStore();

  if (message.kind === "note" || message.role === "System") {
    return (
      <li className="flex flex-col items-center gap-2 py-2">
        <span className="max-w-[80%] rounded-2xl bg-warning-soft px-4 py-2.5 text-center text-[13px] leading-relaxed text-warning">
          <span className="mr-2 text-[10px] font-semibold uppercase tracking-[0.14em]">
            Internal note
          </span>
          {message.body}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {message.author} · {relativeTime(message.at, now)}
        </span>
      </li>
    );
  }

  const fromCustomer = message.role === "Customer";

  return (
    <li
      className={cn(
        "flex flex-col gap-2",
        fromCustomer ? "items-start" : "items-end",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2.5",
          fromCustomer ? "flex-row" : "flex-row-reverse",
        )}
      >
        <InitialsAvatar
          name={message.author}
          tone={fromCustomer ? "sand" : "ink"}
          className="size-7 text-[10px]"
        />
        <span className="text-[12px] font-semibold text-ink">{message.author}</span>
        <span className="text-[11px] text-muted-foreground">
          {message.role}
          {message.audience ? ` → ${message.audience}` : ""} ·{" "}
          {relativeTime(message.at, now)}
        </span>
      </div>
      <div
        className={cn(
          "max-w-[92%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed sm:max-w-[80%]",
          fromCustomer
            ? "rounded-tl-md bg-sand text-ink"
            : message.role === "ASM"
              ? "rounded-tr-md bg-info-soft text-info"
              : "rounded-tr-md bg-ink text-ivory",
        )}
      >
        {message.subject ? (
          <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] opacity-70">
            {message.subject}
          </span>
        ) : null}
        {message.body}
        {message.attachmentName ? (
          <span
            className={cn(
              "mt-3 flex items-center gap-2 rounded-xl px-2.5 py-2 text-[11px]",
              fromCustomer ? "bg-ivory/70 text-steel" : "bg-ivory/10 text-ivory/80",
            )}
          >
            <Paperclip className="size-3" />
            {message.attachmentName}
          </span>
        ) : null}
      </div>
    </li>
  );
}

export function CommunicationPanel({ ticket }: { ticket: Ticket }) {
  const { addMessage, currentExecutive } = useTicketStore();
  const [draft, setDraft] = useState("");
  const [subject, setSubject] = useState("");
  const [attachmentName, setAttachmentName] = useState<string | undefined>();
  const [mode, setMode] = useState<"reply" | "note">("reply");
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    const body = draft.trim();
    if (!body) return;
    const internal = mode === "note";
    addMessage(ticket.id, {
      at: Date.now(),
      author: currentExecutive.name,
      role: internal ? "System" : "Executive",
      kind: internal ? "note" : "reply",
      audience: internal ? "Service team" : ticket.customer.name,
      subject: !internal && subject.trim() ? subject.trim() : undefined,
      attachmentName,
      body,
    });
    setDraft("");
    setSubject("");
    setAttachmentName(undefined);
  };

  // Internal notes are kept out of the customer communication thread.
  const isInternal = (message: Message) =>
    message.kind === "note" || message.role === "System";
  const conversation = ticket.messages.filter((message) => !isInternal(message));
  const notes = ticket.messages.filter(isInternal);

  return (
    <div id="communication" className="scroll-mt-24">
      <SectionHeading
        label="Customer communication"
        title="Conversation history"
        description="Everything said on this ticket — customer replies, executive responses and internal notes."
      />

      {conversation.length ? (
        <ul className="mt-7 flex flex-col gap-5">
          {conversation.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </ul>
      ) : (
        <p className="mt-6 rounded-2xl border border-dashed border-border bg-card/60 px-5 py-8 text-center text-sm text-muted-foreground">
          No conversation yet. Send the first reply to the customer.
        </p>
      )}

      {notes.length ? (
        <div className="mt-8 rounded-2xl border border-warning/25 bg-warning-soft/30 p-5">
          <p className="label-eyebrow">
            Internal notes · not shared with the customer
          </p>
          <ul className="mt-3 flex flex-col gap-4">
            {notes.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-8 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMode("reply")}
            className={cn(
              "rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors",
              mode === "reply"
                ? "bg-ink text-ivory"
                : "text-muted-foreground hover:bg-sand hover:text-ink",
            )}
          >
            Reply to customer
          </button>
          <button
            type="button"
            onClick={() => setMode("note")}
            className={cn(
              "rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors",
              mode === "note"
                ? "bg-ink text-ivory"
                : "text-muted-foreground hover:bg-sand hover:text-ink",
            )}
          >
            Add internal note
          </button>
        </div>

        {mode === "reply" ? (
          <Input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="Subject (optional)"
            className="mt-3 h-10 rounded-xl border-border bg-ivory text-[13px] shadow-none"
          />
        ) : null}

        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={3}
          placeholder={
            mode === "reply"
              ? "Write a reply to the customer…"
              : "Record an internal note for the service team…"
          }
          className="mt-3 resize-none border-0 bg-transparent px-1 text-[13px] shadow-none focus-visible:ring-0"
        />

        <div className="mt-2 flex items-center justify-between gap-3 border-t border-border pt-3">
          <div className="flex min-w-0 items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) setAttachmentName(file.name);
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 text-[12px] font-medium text-muted-foreground transition-colors hover:text-ink"
            >
              <Paperclip className="size-3.5" />
              {mode === "note" ? "Attach reference" : "Attach file"}
            </button>
            {attachmentName ? (
              <span className="inline-flex min-w-0 items-center gap-1.5 rounded-full bg-sand px-2.5 py-1 text-[11px] font-medium text-steel">
                <FileText className="size-3 shrink-0" />
                <span className="truncate">{attachmentName}</span>
                <button
                  type="button"
                  aria-label="Remove attachment"
                  onClick={() => setAttachmentName(undefined)}
                  className="text-muted-foreground transition-colors hover:text-critical"
                >
                  <X className="size-3" />
                </button>
              </span>
            ) : null}
          </div>
          <Button
            type="button"
            onClick={submit}
            disabled={!draft.trim()}
            className="h-9 rounded-full px-4"
          >
            <Send className="size-3.5" />
            {mode === "note" ? "Save note" : "Send reply"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Attachments                                                                 */
/* -------------------------------------------------------------------------- */

function extensionOf(name: string) {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop()!.toUpperCase() : "FILE";
}

function AttachmentTile({ attachment }: { attachment: Attachment }) {
  const isImage = attachment.kind === "image";
  const isVideo = attachment.kind === "video";
  const Icon = isVideo ? Film : FileText;
  const thumbnail = attachment.previewUrl ?? (isImage ? photoFor(attachment.name) : undefined);
  // Seeded reference attachments carry no real file — label them honestly.
  const isDemo = !attachment.previewUrl && !attachment.file;

  return (
    <figure className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-[0_10px_30px_-18px_rgba(30,24,57,0.35)]">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-linear-to-br from-sand to-ivory">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={attachment.name}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-sand/50">
            <Icon className="size-8 text-steel/70" />
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-ink/85 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ivory">
          {extensionOf(attachment.name)}
        </span>
        {isDemo ? (
          <span className="absolute right-3 top-3 rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-warning">
            Demo data
          </span>
        ) : null}
      </div>
      <figcaption className="flex-1 px-3.5 py-3">
        <p className="truncate text-[13px] font-medium text-ink">{attachment.name}</p>
        <p className="mt-1 truncate text-[11px] text-muted-foreground">
          {attachment.mimeType ?? extensionOf(attachment.name)} · {attachment.sizeLabel}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {attachment.uploadedBy} · {formatDateTime(attachment.uploadedAt)}
        </p>
      </figcaption>
    </figure>
  );
}

interface SelectedFile {
  file: File;
  kind: Attachment["kind"];
  previewUrl?: string;
}

const ACCEPTED_FILES =
  ".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx";

const SUPPORTED_EXTENSIONS = ["jpg", "jpeg", "png", "pdf", "doc", "docx", "xls", "xlsx"];

function isSupportedFile(file: File): boolean {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return SUPPORTED_EXTENSIONS.includes(extension);
}

function kindForFile(file: File): SelectedFile {
  const type = file.type.toLowerCase();
  if (type.startsWith("image/")) {
    return { file, kind: "image", previewUrl: URL.createObjectURL(file) };
  }
  if (type.startsWith("video/")) return { file, kind: "video" };
  return { file, kind: "document" };
}

export function AttachmentGallery({ ticket }: { ticket: Ticket }) {
  const { addAttachment, currentExecutive } = useTicketStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<SelectedFile | null>(null);

  const pick = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!isSupportedFile(file)) {
      toast.error(
        `${file.name} is not a supported type. Attach a JPG, PNG, PDF, DOC/DOCX or XLS/XLSX file.`,
      );
      return;
    }
    setSelected(kindForFile(file));
  };

  const attach = () => {
    if (!selected) return;
    const { file, kind, previewUrl } = selected;
    addAttachment(ticket.id, {
      name: file.name,
      kind,
      mimeType: file.type || undefined,
      sizeLabel: formatBytes(file.size),
      previewUrl,
      file,
      uploadedBy: currentExecutive.name,
      uploadedAt: Date.now(),
    });
    setSelected(null);
    toast.success(`${file.name} attached to ${ticket.id}.`);
  };

  return (
    <div>
      <SectionHeading
        label="Attachments"
        title="Photos and documents"
        description="Workshop photos, diagnostic logs and job cards attached to this ticket."
        action={
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            className="h-9 rounded-full border-border bg-card px-4 shadow-none"
          >
            <Plus className="size-3.5" />
            Add file
          </Button>
        }
      />

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={ACCEPTED_FILES}
        onChange={pick}
      />

      {selected ? (
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-dashed border-brand/40 bg-brand/[0.03] p-4">
          <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-sand">
            {selected.previewUrl ? (
              <img
                src={selected.previewUrl}
                alt={selected.file.name}
                className="h-full w-full object-cover"
              />
            ) : selected.kind === "image" ? (
              <ImageIcon className="size-5 text-steel" />
            ) : (
              <FileText className="size-5 text-steel" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-ink">
              {selected.file.name}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {selected.file.type || "Unknown type"} · {formatBytes(selected.file.size)} · not
              attached yet
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSelected(null)}
              className="h-9 rounded-full text-muted-foreground"
            >
              Cancel
            </Button>
            <Button type="button" onClick={attach} className="h-9 rounded-full px-4">
              <Upload className="size-3.5" />
              Attach
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-3">
        {ticket.attachments.map((attachment) => (
          <AttachmentTile key={attachment.id} attachment={attachment} />
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="grid min-h-[9rem] place-items-center rounded-2xl border border-dashed border-border bg-card/50 px-4 py-8 text-center transition-colors hover:border-ink/25 hover:bg-card"
        >
          <span className="flex flex-col items-center gap-2">
            <span className="grid size-9 place-items-center rounded-full bg-sand text-steel">
              <Plus className="size-4" />
            </span>
            <span className="text-[12px] font-medium text-muted-foreground">
              Select a file to attach
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Resolution                                                                  */
/* -------------------------------------------------------------------------- */

const EMPTY_RESOLUTION = {
  rootCause: "",
  actionTaken: "",
  remarks: "",
  partsUsed: "",
};

export function ResolutionPanel({ ticket }: { ticket: Ticket }) {
  const { resolveTicket, reopenTicket, currentExecutive } = useTicketStore();
  const [form, setForm] = useState(EMPTY_RESOLUTION);

  const set = (key: keyof typeof EMPTY_RESOLUTION, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const ready = form.rootCause.trim().length > 3 && form.actionTaken.trim().length > 3;
  const busyRef = useRef(false);

  // Each ticket state change re-arms the guard for the next action.
  useEffect(() => {
    busyRef.current = false;
  }, [ticket.status, ticket.resolution]);

  const handleResolve = () => {
    if (busyRef.current || !ready) return;
    busyRef.current = true;
    resolveTicket(ticket.id, {
      rootCause: form.rootCause.trim(),
      actionTaken: form.actionTaken.trim(),
      remarks:
        form.remarks.trim() || "Closed after verification with the customer.",
      partsUsed: form.partsUsed.trim() || "None",
      resolvedBy: currentExecutive.name,
    });
    toast.success(`${ticket.id} resolved.`);
  };

  const handleReopen = () => {
    if (busyRef.current) return;
    busyRef.current = true;
    reopenTicket(ticket.id);
    toast.success(`${ticket.id} reopened and moved back into progress.`);
  };

  if (ticket.resolution) {
    const rows = [
      { label: "Root cause", value: ticket.resolution.rootCause },
      { label: "Action taken", value: ticket.resolution.actionTaken },
      { label: "Remarks", value: ticket.resolution.remarks },
      { label: "Parts / service", value: ticket.resolution.partsUsed },
    ];

    return (
      <section className="rounded-2xl border border-success/25 bg-success-soft/50 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="label-eyebrow">Resolution</p>
            <h3 className="mt-2 text-lg font-semibold text-ink">
              {ticket.status === "Closed" ? "Ticket closed" : "Ticket resolved"}
            </h3>
          </div>
          <StatusBadge status={ticket.status} size="md" />
        </div>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          {rows.map((row) => (
            <div key={row.label}>
              <dt className="label-eyebrow">{row.label}</dt>
              <dd className="mt-1.5 text-[13px] leading-relaxed text-ink">
                {row.value || "—"}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-5 border-t border-success/20 pt-4 text-[11px] text-muted-foreground">
          Resolved by {ticket.resolution.resolvedBy} ·{" "}
          {formatDateTime(ticket.resolution.resolvedAt)}
        </p>
        <Button
          type="button"
          variant="ghost"
          onClick={handleReopen}
          className="mt-4 h-9 rounded-full px-4 text-steel"
        >
          Reopen ticket
        </Button>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      {ticket.resolutionHistory?.length ? (
        <div className="mb-6 rounded-xl border border-border bg-sand/40 p-4">
          <p className="label-eyebrow">Previous resolution · preserved on reopen</p>
          {ticket.resolutionHistory.map((item) => (
            <div key={item.resolvedAt} className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
              <p className="font-medium text-ink">{item.rootCause}</p>
              <p className="mt-1">{item.actionTaken}</p>
              <p className="mt-1 text-[11px]">
                {item.resolvedBy} · {formatDateTime(item.resolvedAt)}
              </p>
            </div>
          ))}
        </div>
      ) : null}
      <SectionHeading
        label="Resolution"
        title="Record the fix and close the loop"
        description="Capture what caused the issue and what was done, so the next executive has the full picture."
      />

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <ResolutionField
          label="Root cause"
          value={form.rootCause}
          onChange={(value) => set("rootCause", value)}
          placeholder="e.g. Cell imbalance after the v4.2 update"
        />
        <ResolutionField
          label="Action taken"
          value={form.actionTaken}
          onChange={(value) => set("actionTaken", value)}
          placeholder="e.g. BMS recalibrated and pack balance charged"
        />
        <ResolutionField
          label="Resolution remarks"
          value={form.remarks}
          onChange={(value) => set("remarks", value)}
          placeholder="Customer informed and vehicle road tested"
        />
        <ResolutionField
          label="Parts / service information"
          value={form.partsUsed}
          onChange={(value) => set("partsUsed", value)}
          placeholder="e.g. Side stand harness · tail lamp assembly"
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-5">
        <Button
          type="button"
          disabled={!ready}
          onClick={handleResolve}
          className="h-10 rounded-full px-5"
        >
          <CheckCircle2 className="size-4" />
          Mark as Resolved
        </Button>
        <p className="text-[11px] text-muted-foreground">
          Root cause and action taken are required. The journey, activity log and
          dashboard update immediately.
        </p>
      </div>
    </section>
  );
}

function ResolutionField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="label-eyebrow">{label}</span>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        placeholder={placeholder}
        className="resize-none rounded-xl border-border bg-card text-[13px] shadow-none"
      />
    </label>
  );
}
