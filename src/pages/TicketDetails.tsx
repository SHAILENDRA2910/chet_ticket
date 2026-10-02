import { ContextNav, type ContextNavItem } from "@/components/chetak/AppLayout";
import { LineupStage } from "@/components/chetak/LineupStage";
import { EmptyState, SectionHeading } from "@/components/chetak/primitives";
import { TicketJourney } from "@/components/chetak/TicketJourney";
import {
  ActivityTimeline,
  AttachmentGallery,
  CommunicationPanel,
  ResolutionPanel,
  TicketHeader,
  TicketIssues,
  TicketMetadata,
  VehicleDetail,
} from "@/components/chetak/TicketWork";
import { EXECUTIVES } from "@/lib/chetak/data";
import { useTicket, useTicketStore } from "@/lib/chetak/store";
import { allowedStatuses } from "@/lib/chetak/workflow";
import type { TicketPriority, TicketStatus } from "@/lib/chetak/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";

const PRIORITY_OPTIONS: TicketPriority[] = ["Low", "Medium", "High", "Critical"];

export default function TicketDetails() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const ticket = useTicket(ticketId);
  const { updateTicket } = useTicketStore();
  const navigate = useNavigate();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [status, setStatus] = useState<TicketStatus>("New");
  const [priority, setPriority] = useState<TicketPriority>("Medium");
  const [executive, setExecutive] = useState(EXECUTIVES[0].name);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!ticket) return;
    setStatus(ticket.status);
    setPriority(ticket.priority);
    setExecutive(ticket.executive.name);
  }, [ticket]);

  if (!ticket) {
    return (
      <EmptyState
        title="Ticket not found"
        description={`No ticket with the reference ${ticketId ?? "—"} exists in this workspace.`}
        action={
          <Button
            type="button"
            onClick={() => navigate("/tickets")}
            className="h-9 rounded-full px-4"
          >
            Back to tickets
          </Button>
        }
        media={
          <LineupStage tone="light" compact bare className="mx-auto h-48 max-w-sm" />
        }
      />
    );
  }

  const tabs: ContextNavItem[] = [
    { id: "details", label: "Details" },
    { id: "journey", label: "Ticket Journey" },
    { id: "communication", label: "Communication" },
    { id: "attachments", label: "Attachments" },
    { id: "resolution", label: "Resolution" },
  ];

  const jump = (id: string) => {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const save = () => {
    const nextExecutive =
      EXECUTIVES.find((person) => person.name === executive) ?? ticket.executive;
    updateTicket(ticket.id, {
      status,
      priority,
      executive: nextExecutive,
      note: note.trim() || undefined,
    });
    setSheetOpen(false);
    setNote("");
    toast.success(`${ticket.id} updated.`);
  };

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/tickets"
          className="inline-flex items-center gap-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-3.5" />
          Back to tickets
        </Link>
        <ContextNav
          items={tabs}
          value=""
          onChange={jump}
          className="hidden border-b-0 lg:flex"
        />
      </div>

      <TicketHeader ticket={ticket} onUpdate={() => setSheetOpen(true)} />

      <div id="details" className="scroll-mt-24">
        <TicketMetadata ticket={ticket} />
      </div>

      <div id="journey" className="scroll-mt-24">
        <TicketJourney ticket={ticket} />
      </div>

      {/* Rail waits for `xl`: at 1024px the timeline column was left ~290px. */}
      <div className="grid gap-14 xl:grid-cols-[minmax(0,1fr)_22rem] xl:gap-16">
        <div className="flex min-w-0 flex-col gap-12">
          <section id="activity" className="scroll-mt-24 border-t border-border pt-10">
            <SectionHeading
              label="Activity"
              title="Ticket history"
              description="Every state change, note and customer touch recorded against this ticket."
            />
            <ActivityTimeline activity={ticket.activity} />
          </section>

          <section className="border-t border-border pt-10">
            <CommunicationPanel ticket={ticket} />
          </section>

          <section className="border-t border-border pt-10">
            <AttachmentGallery ticket={ticket} />
          </section>

          <div id="resolution" className="scroll-mt-24">
            <ResolutionPanel ticket={ticket} />
          </div>
        </div>

        <aside className="flex min-w-0 flex-col gap-12">
          <TicketIssues ticket={ticket} />
          <VehicleDetail ticket={ticket} />
        </aside>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader className="border-b border-border px-6 py-6 text-left">
            <SheetTitle className="text-lg">Update ticket</SheetTitle>
            <SheetDescription className="text-[13px]">
              {ticket.id} · {ticket.subject}
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-6 px-6 py-6">
            <label className="flex flex-col gap-2">
              <span className="label-eyebrow">Status</span>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as TicketStatus)}
              >
                <SelectTrigger className="h-11 w-full rounded-xl border-border bg-card text-[14px] shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allowedStatuses(ticket.status).map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-[11px] text-muted-foreground">
                Only valid next steps are offered. The journey is appended to,
                never rewritten.
              </span>
            </label>

            <label className="flex flex-col gap-2">
              <span className="label-eyebrow">Priority</span>
              <Select
                value={priority}
                onValueChange={(value) => setPriority(value as TicketPriority)}
              >
                <SelectTrigger className="h-11 w-full rounded-xl border-border bg-card text-[14px] shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="label-eyebrow">Service engineer</span>
              <Select value={executive} onValueChange={setExecutive}>
                <SelectTrigger className="h-11 w-full rounded-xl border-border bg-card text-[14px] shadow-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXECUTIVES.map((person) => (
                    <SelectItem key={person.code} value={person.name}>
                      {person.name} · {person.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="label-eyebrow">Update note</span>
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={4}
                placeholder="What changed on this ticket?"
                className="resize-none rounded-xl border-border bg-card text-[14px] shadow-none"
              />
            </label>
          </div>

          <SheetFooter className="border-t border-border px-6 py-5">
            <Button
              type="button"
              onClick={save}
              className="h-11 w-full rounded-full"
            >
              Save update
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSheetOpen(false)}
              className="h-10 w-full rounded-full text-muted-foreground"
            >
              Cancel
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
