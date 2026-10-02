import { cn } from "@/lib/utils";
import {
  ASMS,
  CHANNELS,
  CHETAK_MODELS,
  DEALERS,
  EXECUTIVES,
  ISSUE_CATEGORIES,
  SLA_WINDOW,
} from "@/lib/chetak/data";
import { useTicketStore } from "@/lib/chetak/store";
import type { Attachment, IssueCategory, TicketPriority } from "@/lib/chetak/types";
import { formatBytes, formatDuration } from "@/lib/chetak/format";
import { clearDraft, readDraft, writeDraft } from "@/lib/chetak/drafts";
import { PageHeader } from "@/components/chetak/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Paperclip, Plus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

interface FormState {
  customerName: string;
  mobile: string;
  email: string;
  city: string;
  model: string;
  registrationNo: string;
  vin: string;
  batteryNumber: string;
  kms: string;
  purchaseDate: string;
  subject: string;
  category: IssueCategory;
  channel: string;
  description: string;
  priority: TicketPriority;
  executiveName: string;
  asmName: string;
  dealerCode: string;
}

const PRIORITIES: TicketPriority[] = ["Low", "Medium", "High", "Critical"];

const ACCEPTED_FILES =
  ".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx";

function kindOf(file: File): Attachment["kind"] {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return "document";
}

export default function CreateTicket() {
  const navigate = useNavigate();
  const { tickets, createTicket, currentExecutive } = useTicketStore();

  const [form, setForm] = useState<FormState>(() => ({
    customerName: "",
    mobile: "",
    email: "",
    city: "",
    model: CHETAK_MODELS[0],
    registrationNo: "",
    vin: "",
    batteryNumber: "",
    kms: "",
    purchaseDate: new Date().toISOString().slice(0, 10),
    subject: "",
    category: "Electrical",
    channel: "Dealer",
    description: "",
    priority: "Medium",
    executiveName: currentExecutive.name,
    asmName: ASMS[0].name,
    dealerCode: DEALERS[0].code,
  }));
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // A draft written on a previous visit survives a refresh — offer to resume.
  useEffect(() => {
    const draft = readDraft<FormState>();
    if (draft) setDraftSavedAt(draft.savedAt);
  }, []);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const nextId = useMemo(() => {
    const highest = tickets.reduce((max, ticket) => {
      const value = Number(ticket.id.split("-").pop());
      return Number.isFinite(value) && value > max ? value : max;
    }, 0);
    return `TKT-2026-${String(highest + 1).padStart(5, "0")}`;
  }, [tickets]);

  const errors = {
    customerName: !form.customerName.trim(),
    mobile: !form.mobile.trim(),
    subject: !form.subject.trim(),
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const addFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    setAttachments((current) => [
      ...current,
      ...files.map((file) => ({
        id: `draft-${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        kind: kindOf(file),
        sizeLabel: formatBytes(file.size),
        mimeType: file.type || undefined,
        uploadedBy: currentExecutive.name,
        uploadedAt: Date.now(),
      })),
    ]);
  };

  const saveDraft = () => {
    const draft = writeDraft(form);
    if (!draft) {
      toast.error(
        "This browser blocked local storage, so the draft was not saved.",
      );
      return;
    }
    setDraftSavedAt(draft.savedAt);
    toast.success(
      `Draft saved on this device · ${new Date(draft.savedAt).toLocaleTimeString()}`,
    );
  };

  const resumeDraft = () => {
    const draft = readDraft<FormState>();
    if (!draft) return;
    setForm(draft.form);
    setDraftSavedAt(draft.savedAt);
    toast.success("Draft resumed.");
  };

  const discardDraft = () => {
    clearDraft();
    setDraftSavedAt(null);
  };

  const submit = () => {
    setSubmitted(true);
    if (hasErrors) {
      const missing = [
        errors.customerName ? "customer name" : null,
        errors.mobile ? "mobile number" : null,
        errors.subject ? "issue summary" : null,
      ].filter(Boolean) as string[];
      const detail =
        missing.length > 1
          ? `${missing.slice(0, -1).join(", ")} and ${missing[missing.length - 1]}`
          : missing[0];
      toast.error(`Add the ${detail} before creating the ticket.`);
      return;
    }
    // Guard against a double-click creating two tickets from one form.
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);

    const created = createTicket({
      customer: {
        name: form.customerName.trim(),
        mobile: form.mobile.trim(),
        email: form.email.trim() || "not-provided@example.com",
        city: form.city.trim() || "—",
      },
      vehicle: {
        model: form.model,
        registrationNo: form.registrationNo.trim().toUpperCase() || "—",
        vin: form.vin.trim().toUpperCase() || "—",
        batteryNumber: form.batteryNumber.trim() || "—",
        purchaseDate: form.purchaseDate || "—",
        kms: Number(form.kms) || 0,
        minCellVoltage: 12,
        maxCellVoltage: 48,
        ecuList: ["VCU 2.1.4", "BMS 1.8.2", "Motor Controller 3.0.1", "Charger 1.4.0"],
      },
      dealer: DEALERS.find((item) => item.code === form.dealerCode) ?? DEALERS[0],
      executive:
        EXECUTIVES.find((item) => item.name === form.executiveName) ?? EXECUTIVES[0],
      asm: ASMS.find((item) => item.name === form.asmName) ?? ASMS[0],
      channel: form.channel as (typeof CHANNELS)[number],
      priority: form.priority,
      category: form.category,
      subject: form.subject.trim(),
      description: form.description.trim() || form.subject.trim(),
      attachments,
    });

    clearDraft();
    toast.success(`${created.id} created and routed to ${created.executive.name}.`);
    navigate(`/tickets/${created.id}`);
  };

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        eyebrow="Operations"
        title="Create a new ticket"
        description="Capture the issue and route it to the right team."
      />

      {draftSavedAt ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-sand/40 px-5 py-4">
          <p className="text-[13px] text-steel">
            A saved draft from{" "}
            {new Date(draftSavedAt).toLocaleString()} is stored on this device.
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={discardDraft}
              className="h-9 rounded-full text-muted-foreground"
            >
              Discard
            </Button>
            <Button
              type="button"
              onClick={resumeDraft}
              className="h-9 rounded-full px-4"
            >
              Resume draft
            </Button>
          </div>
        </div>
      ) : null}

      {/* Preview rail waits for `xl`: at 1024px the form was left ~320px. */}
      <div className="grid gap-12 xl:grid-cols-[minmax(0,1fr)_20rem] xl:gap-16">
        <div className="flex flex-col gap-12">
          <FormSection
            label="Customer"
            title="Who is reporting this?"
            description="The customer record is carried onto the ticket and used for all follow-ups."
          >
            <TextField
              label="Customer name"
              value={form.customerName}
              onChange={(value) => set("customerName", value)}
              placeholder="e.g. Vikram Menon"
              invalid={submitted && errors.customerName}
            />
            <TextField
              label="Mobile number"
              value={form.mobile}
              onChange={(value) => set("mobile", value)}
              placeholder="+91 90000 00000"
              invalid={submitted && errors.mobile}
            />
            <TextField
              label="Email"
              value={form.email}
              onChange={(value) => set("email", value)}
              placeholder="name@example.com"
            />
            <TextField
              label="City"
              value={form.city}
              onChange={(value) => set("city", value)}
              placeholder="Pune"
            />
          </FormSection>

          <FormSection
            label="Vehicle"
            title="Which vehicle is affected?"
            description="Model, registration and battery details as recorded against the customer's vehicle."
          >
            <SelectField
              label="Model name"
              value={form.model}
              onChange={(value) => set("model", value)}
              options={CHETAK_MODELS.map((model) => ({ value: model, label: model }))}
            />
            <TextField
              label="Vehicle registration no."
              value={form.registrationNo}
              onChange={(value) => set("registrationNo", value)}
              placeholder="MH12KT4417"
            />
            <TextField
              label="VIN"
              value={form.vin}
              onChange={(value) => set("vin", value)}
              placeholder="MD2C5920XSAK00000"
            />
            <TextField
              label="Battery number (BIN)"
              value={form.batteryNumber}
              onChange={(value) => set("batteryNumber", value)}
              placeholder="882113"
            />
            <TextField
              label="KMS till date"
              value={form.kms}
              onChange={(value) => set("kms", value)}
              placeholder="3410"
              type="number"
            />
            <TextField
              label="Purchase date"
              value={form.purchaseDate}
              onChange={(value) => set("purchaseDate", value)}
              type="date"
            />
          </FormSection>

          <FormSection
            label="Ticket"
            title="What is the issue?"
            description="Describe the concern the way the customer reported it."
          >
            <TextField
              label="Issue summary"
              value={form.subject}
              onChange={(value) => set("subject", value)}
              placeholder="e.g. Vehicle not accepting charge after the v4.2 update"
              invalid={submitted && errors.subject}
              className="sm:col-span-2"
            />
            <SelectField
              label="Category"
              value={form.category}
              onChange={(value) => set("category", value as IssueCategory)}
              options={ISSUE_CATEGORIES.map((category) => ({
                value: category,
                label: category,
              }))}
            />
            <SelectField
              label="Channel"
              value={form.channel}
              onChange={(value) => set("channel", value)}
              options={CHANNELS.map((channel) => ({ value: channel, label: channel }))}
            />
            <TextareaField
              label="Issue details"
              value={form.description}
              onChange={(value) => set("description", value)}
              placeholder="What did the customer report, and what has been checked so far?"
              className="sm:col-span-2"
            />
          </FormSection>

          <FormSection
            label="Assignment"
            title="Who owns this ticket?"
            description="Priority sets the SLA window. The ticket is routed to the executive and their ASM."
          >
            <SelectField
              label="Priority"
              value={form.priority}
              onChange={(value) => set("priority", value as TicketPriority)}
              options={PRIORITIES.map((priority) => ({
                value: priority,
                label: priority,
              }))}
            />
            <SelectField
              label="Service engineer"
              value={form.executiveName}
              onChange={(value) => set("executiveName", value)}
              options={EXECUTIVES.map((person) => ({
                value: person.name,
                label: `${person.name} · ${person.code}`,
              }))}
            />
            <SelectField
              label="Area service manager"
              value={form.asmName}
              onChange={(value) => set("asmName", value)}
              options={ASMS.map((person) => ({ value: person.name, label: person.name }))}
            />
            <SelectField
              label="Dealer"
              value={form.dealerCode}
              onChange={(value) => set("dealerCode", value)}
              options={DEALERS.map((dealer) => ({
                value: dealer.code,
                label: `${dealer.name} · ${dealer.code}`,
              }))}
            />
          </FormSection>

          <FormSection
            label="Attachments"
            title="Photos, videos or documents"
            description="Workshop photos and diagnostic files travel with the ticket."
          >
            <div className="sm:col-span-2">
              <div className="flex flex-wrap gap-2">
                {attachments.map((attachment) => (
                  <span
                    key={attachment.id}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-ink"
                  >
                    <Paperclip className="size-3 text-steel" />
                    {attachment.name}
                    <span className="text-[11px] text-muted-foreground">
                      {attachment.sizeLabel}
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${attachment.name}`}
                      onClick={() =>
                        setAttachments((current) =>
                          current.filter((item) => item.id !== attachment.id),
                        )
                      }
                      className="text-muted-foreground transition-colors hover:text-critical"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  className="hidden"
                  accept={ACCEPTED_FILES}
                  onChange={addFiles}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-full border border-dashed border-border px-3.5 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:border-ink/25 hover:text-ink"
                >
                  <Plus className="size-3" />
                  Add file
                </button>
              </div>
            </div>
          </FormSection>

          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-8">
            <Button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="h-11 rounded-full px-6"
            >
              Create Ticket
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={saveDraft}
              className="h-11 rounded-full border-border bg-card px-6 shadow-none"
            >
              Save Draft
            </Button>
            <p className="text-[11px] text-muted-foreground">
              The ticket enters the journey at <strong>Created</strong> and appears
              on the dashboard immediately.
            </p>
          </div>
        </div>

        {/* Capped so the sticky rail can never be taller than the viewport it
            sticks inside — otherwise its lower half stays off screen. */}
        <aside className="xl:sticky xl:top-24 xl:max-h-[calc(100svh-7rem)] xl:self-start xl:overflow-y-auto">
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="label-eyebrow">Ticket preview</p>
            <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight text-ink">
              {nextId}
            </p>
            <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-muted-foreground">
              {form.subject.trim() || "Issue summary will appear here."}
            </p>

            <dl className="mt-6 space-y-3 border-t border-border pt-5 text-[13px]">
              <PreviewRow label="Customer" value={form.customerName || "—"} />
              <PreviewRow label="Vehicle" value={form.model} />
              <PreviewRow label="Category" value={form.category} />
              <PreviewRow label="Priority" value={form.priority} />
              <PreviewRow
                label="SLA window"
                value={formatDuration(SLA_WINDOW[form.priority])}
              />
              <PreviewRow label="Assigned to" value={form.executiveName} />
              <PreviewRow
                label="Dealer"
                value={
                  DEALERS.find((item) => item.code === form.dealerCode)?.name ?? "—"
                }
              />
              <PreviewRow
                label="Attachments"
                value={`${attachments.length} file${attachments.length === 1 ? "" : "s"}`}
              />
            </dl>
          </div>
          <p className="mt-4 px-1 text-[11px] leading-relaxed text-muted-foreground">
            Existing Ticket Executive fields are preserved — customer, vehicle,
            battery, dealer, assignment and attachments all carry through to the
            ticket record.
          </p>
        </aside>
      </div>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </dt>
      <dd className="truncate text-right font-medium text-ink">{value}</dd>
    </div>
  );
}

function FormSection({
  label,
  title,
  description,
  children,
}: {
  label: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-border pt-8">
      <div className="max-w-xl">
        <p className="label-eyebrow">{label}</p>
        <h2 className="mt-2.5 text-lg font-semibold tracking-[-0.015em] text-ink">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      <div className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function FieldShell({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-2", className)}>
      <span className="label-eyebrow">{label}</span>
      {children}
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  invalid,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  invalid?: boolean;
  className?: string;
}) {
  return (
    <FieldShell label={label} className={className}>
      <Input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        className={cn(
          "h-11 rounded-xl border-border bg-card text-[14px] shadow-none focus-visible:border-brand/30 focus-visible:ring-4 focus-visible:ring-brand/10",
          invalid && "border-critical/60",
        )}
      />
    </FieldShell>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <FieldShell label={label} className={className}>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={4}
        className="resize-none rounded-xl border-border bg-card text-[14px] shadow-none focus-visible:border-brand/30 focus-visible:ring-4 focus-visible:ring-brand/10"
      />
    </FieldShell>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  className?: string;
}) {
  return (
    <FieldShell label={label} className={className}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11 w-full rounded-xl border-border bg-card text-[14px] shadow-none focus-visible:ring-4 focus-visible:ring-brand/10">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldShell>
  );
}
