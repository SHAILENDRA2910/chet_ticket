import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/chetak/format";
import type { JourneyStage, Ticket } from "@/lib/chetak/types";
import { SectionHeading } from "./primitives";

type StepState = "complete" | "current" | "upcoming";

interface Step {
  stage: JourneyStage;
  state: StepState;
  at?: number;
  actor?: string;
  note?: string;
}

/**
 * The journey is an append-only log of events. The stepper is built from those
 * actual events — never from the ticket's current status, so reopening a ticket
 * shows the historic stages and the new `Reopened` event side by side.
 */
function buildSteps(ticket: Ticket): Step[] {
  if (!ticket.journey.length) {
    return [{ stage: "Created", state: "current" }];
  }

  return ticket.journey.map((entry, index) => ({
    stage: entry.stage,
    state: index === ticket.journey.length - 1 ? "current" : "complete",
    at: entry.at,
    actor: entry.actor,
    note: entry.note,
  }));
}

const NODE_TONE: Record<StepState, string> = {
  complete: "bg-ink/25 ring-transparent",
  current: "bg-teal ring-teal/15",
  upcoming: "bg-card ring-0 border border-border",
};

const LABEL_TONE: Record<StepState, string> = {
  complete: "text-ink/70",
  current: "text-ink",
  upcoming: "text-muted-foreground/70",
};

export function JourneyStep({
  step,
  isLast,
  orientation,
  connectorActive,
}: {
  step: Step;
  isLast: boolean;
  orientation: "horizontal" | "vertical";
  connectorActive: boolean;
}) {
  const node = (
    <span
      className={cn(
        "relative z-10 shrink-0 rounded-full transition-all",
        step.state === "current" ? "size-3 ring-4" : "size-2 ring-4",
        NODE_TONE[step.state],
      )}
    />
  );

  const body = (
    <>
      <p
        className={cn(
          "text-[11px] font-semibold uppercase tracking-[0.14em]",
          LABEL_TONE[step.state],
        )}
      >
        {step.stage}
      </p>
      <p className="mt-1.5 text-[11px] tabular-nums text-muted-foreground">
        {step.at ? formatDateTime(step.at) : "Awaiting"}
      </p>
      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
        {step.actor ?? "—"}
      </p>
      {step.note && step.state === "current" ? (
        <p className="mt-2.5 inline-block rounded-lg bg-teal-soft px-2.5 py-1.5 text-[11px] leading-snug text-teal">
          {step.note}
        </p>
      ) : null}
    </>
  );

  if (orientation === "vertical") {
    return (
      <li className="relative flex gap-4 pb-7 last:pb-0">
        {!isLast ? (
          <span
            className={cn(
              "absolute left-[5px] top-5 bottom-0 w-px",
              connectorActive ? "bg-ink/15" : "bg-border",
            )}
          />
        ) : null}
        <span className="mt-1">{node}</span>
        <div className="min-w-0">{body}</div>
      </li>
    );
  }

  return (
    <li className="flex min-w-[8.5rem] flex-1 flex-col">
      <div className="flex items-center">
        {node}
        {!isLast ? (
          <span
            className={cn(
              "h-px flex-1",
              connectorActive ? "bg-ink/15" : "bg-border",
            )}
          />
        ) : null}
      </div>
      <div className="pr-6">{body}</div>
    </li>
  );
}

export function TicketJourney({ ticket }: { ticket: Ticket }) {
  const steps = buildSteps(ticket);

  return (
    <section className="border-t border-border pt-10">
      <SectionHeading
        label="Ticket journey"
        title="Where this request stands"
        description="Every stage this ticket has actually moved through, oldest first."
      />

      <ol className="no-scrollbar mt-10 hidden overflow-x-auto lg:flex">
        {steps.map((step, index) => (
          <JourneyStep
            key={`${step.stage}-${index}`}
            step={step}
            orientation="horizontal"
            isLast={index === steps.length - 1}
            connectorActive={index < steps.length - 1}
          />
        ))}
      </ol>

      <ol className="mt-8 lg:hidden">
        {steps.map((step, index) => (
          <JourneyStep
            key={`${step.stage}-${index}`}
            step={step}
            orientation="vertical"
            isLast={index === steps.length - 1}
            connectorActive={index < steps.length - 1}
          />
        ))}
      </ol>
    </section>
  );
}
