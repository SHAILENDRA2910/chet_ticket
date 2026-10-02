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
import type {
  Channel,
  IssueCategory,
  NewTicketInput,
  TicketPriority,
} from "@/lib/chetak/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Upload, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";

/* -------------------------------------------------------------------------- */
/* CSV parsing                                                                 */
/* -------------------------------------------------------------------------- */

/** Split one CSV line, honouring double-quoted fields. */
function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quoted) {
      if (char === '"') {
        if (line[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      cells.push(cell);
      cell = "";
    } else {
      cell += char;
    }
  }
  cells.push(cell);
  return cells.map((value) => value.trim());
}

const COLUMN_ALIASES: Record<string, string> = {
  customer: "customerName",
  customername: "customerName",
  name: "customerName",
  mobile: "mobile",
  phone: "mobile",
  email: "email",
  city: "city",
  model: "model",
  registrationno: "registrationNo",
  registration: "registrationNo",
  regno: "registrationNo",
  vehicle: "registrationNo",
  vin: "vin",
  batterynumber: "batteryNumber",
  battery: "batteryNumber",
  kms: "kms",
  purchasdate: "purchaseDate",
  purchasedate: "purchaseDate",
  subject: "subject",
  issue: "subject",
  category: "category",
  channel: "channel",
  source: "channel",
  priority: "priority",
  description: "description",
  details: "description",
  executive: "executive",
  engineer: "executive",
  dealer: "dealerCode",
  dealercode: "dealerCode",
};

interface ParsedRow {
  rowNumber: number;
  values: Record<string, string>;
  reason?: string;
}

interface PreviewCounts {
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
}

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z]/g, "");
}

const PRIORITIES: TicketPriority[] = ["Low", "Medium", "High", "Critical"];

export function ImportTickets({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { tickets, importTickets, currentExecutive } = useTicketStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [reading, setReading] = useState(false);
  const importingRef = useRef(false);

  // Release the double-submit guard when the dialog closes.
  useEffect(() => {
    if (!open) importingRef.current = false;
  }, [open]);

  const reset = () => {
    setFileName(null);
    setRows([]);
    setReading(false);
  };

  const parseFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!/\.csv$/i.test(file.name)) {
      toast.error(
        `${file.name} is not a CSV. Export the sheet as CSV and choose it again.`,
      );
      return;
    }

    setReading(true);
    const reader = new FileReader();
    reader.onerror = () => {
      setReading(false);
      toast.error("That file could not be read. Check the file and try again.");
    };
    reader.onload = () => {
      setReading(false);
      const text = String(reader.result ?? "");
      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      if (!lines.length) {
        toast.error("That CSV file is empty.");
        return;
      }

      const headers = splitCsvLine(lines[0]).map(
        (header) => COLUMN_ALIASES[normalizeKey(header)] ?? header,
      );

      const parsed: ParsedRow[] = lines.slice(1).map((line, index) => {
        const cells = splitCsvLine(line);
        const values: Record<string, string> = {};
        headers.forEach((header, position) => {
          values[header] = cells[position] ?? "";
        });

        const customerName = values.customerName?.trim();
        const subject = values.subject?.trim();
        if (!customerName || !subject) {
          return {
            rowNumber: index + 2,
            values,
            reason: !customerName ? "missing customer" : "missing issue",
          };
        }
        if (values.priority && !PRIORITIES.includes(values.priority as TicketPriority)) {
          return { rowNumber: index + 2, values, reason: "unknown priority" };
        }
        if (values.channel && !CHANNELS.includes(values.channel as Channel)) {
          return { rowNumber: index + 2, values, reason: "unknown channel" };
        }
        if (
          values.category &&
          !ISSUE_CATEGORIES.includes(values.category as IssueCategory)
        ) {
          return { rowNumber: index + 2, values, reason: "unknown category" };
        }
        return { rowNumber: index + 2, values };
      });

      setFileName(file.name);
      setRows(parsed);
    };
    reader.readAsText(file);
  };

  const duplicateKey = (values: Record<string, string>) =>
    `${(values.registrationNo ?? "").toLowerCase()}|${(values.subject ?? "").toLowerCase()}`;

  const existingKeys = useMemo(
    () =>
      new Set(
        tickets
          .filter((ticket) => ticket.vehicle.registrationNo !== "—")
          .map(
            (ticket) =>
              `${ticket.vehicle.registrationNo.toLowerCase()}|${ticket.subject.toLowerCase()}`,
          ),
      ),
    [tickets],
  );

  type RowStatus = "valid" | "invalid" | "duplicate";

  const { counts, validRows, classified } = useMemo(() => {
    const seen = new Set<string>();
    const valid: ParsedRow[] = [];
    const all: Array<{ row: ParsedRow; status: RowStatus }> = [];
    let invalid = 0;
    let duplicates = 0;
    for (const row of rows) {
      if (row.reason) {
        invalid += 1;
        all.push({ row, status: "invalid" });
        continue;
      }
      const key = duplicateKey(row.values);
      if (existingKeys.has(key) || seen.has(key)) {
        duplicates += 1;
        all.push({ row, status: "duplicate" });
        continue;
      }
      seen.add(key);
      valid.push(row);
      all.push({ row, status: "valid" });
    }
    const preview: PreviewCounts = {
      total: rows.length,
      valid: valid.length,
      invalid,
      duplicates,
    };
    return { counts: preview, validRows: valid, classified: all };
  }, [rows, existingKeys]);

  const toInput = (values: Record<string, string>): NewTicketInput => {
    const model = CHETAK_MODELS.includes(values.model)
      ? values.model
      : CHETAK_MODELS[0];
    const priority = PRIORITIES.includes(values.priority as TicketPriority)
      ? (values.priority as TicketPriority)
      : "Medium";
    const channel = CHANNELS.includes(values.channel as Channel)
      ? (values.channel as Channel)
      : "Dealer";
    const category = ISSUE_CATEGORIES.includes(values.category as IssueCategory)
      ? (values.category as IssueCategory)
      : "Other";
    const executive =
      EXECUTIVES.find((person) => person.name === values.executive) ??
      currentExecutive;
    const dealer =
      DEALERS.find(
        (item) =>
          item.code === values.dealerCode ||
          item.name.toLowerCase() === (values.dealerCode ?? "").toLowerCase(),
      ) ?? DEALERS[0];

    return {
      customer: {
        name: values.customerName.trim(),
        mobile: values.mobile?.trim() || "—",
        email: values.email?.trim() || "not-provided@example.com",
        city: values.city?.trim() || "—",
      },
      vehicle: {
        model,
        registrationNo: (values.registrationNo ?? "").trim().toUpperCase() || "—",
        vin: (values.vin ?? "").trim().toUpperCase() || "—",
        batteryNumber: (values.batteryNumber ?? "").trim() || "—",
        purchaseDate: values.purchaseDate?.trim() || "—",
        kms: Number(values.kms) || 0,
        minCellVoltage: 12,
        maxCellVoltage: 48,
        ecuList: ["VCU 2.1.4", "BMS 1.8.2", "Motor Controller 3.0.1", "Charger 1.4.0"],
      },
      dealer,
      executive,
      asm: ASMS[0],
      channel,
      priority,
      category,
      subject: values.subject.trim(),
      description: values.description?.trim() || values.subject.trim(),
      attachments: [],
      imported: true,
    };
  };

  const runImport = () => {
    if (!validRows.length || importingRef.current) return;
    importingRef.current = true;
    const created = importTickets(validRows.map((row) => toInput(row.values)));
    toast.success(
      `${created.length} ticket${created.length === 1 ? "" : "s"} imported.`,
    );
    onOpenChange(false);
    reset();
  };

  const stats = [
    { label: "Total rows", value: counts.total, tone: "text-ink" },
    { label: "Valid", value: counts.valid, tone: "text-success" },
    { label: "Invalid", value: counts.invalid, tone: "text-critical" },
    { label: "Duplicates", value: counts.duplicates, tone: "text-warning" },
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="text-left">
          <DialogTitle>Import tickets</DialogTitle>
          <DialogDescription className="text-[13px]">
            Upload a CSV of service tickets. Required columns: customer and
            issue. Optional: mobile, email, city, model, registration, VIN,
            battery, kms, category, channel, priority, dealer, executive.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={parseFile}
          />

          {!fileName ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={reading}
              className="grid min-h-[10rem] place-items-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-10 text-center transition-colors hover:border-ink/25 hover:bg-card disabled:cursor-progress disabled:opacity-70"
            >
              <span className="flex flex-col items-center gap-3">
                <span className="grid size-11 place-items-center rounded-full bg-sand text-steel">
                  <Upload className="size-5" />
                </span>
                <span className="text-[13px] font-medium text-ink">
                  {reading ? "Reading file…" : "Choose CSV file"}
                </span>
                <span className="text-[12px] text-muted-foreground">
                  The file is parsed in your browser — nothing is uploaded.
                </span>
              </span>
            </button>
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-sand/40 px-4 py-3">
              <span className="flex min-w-0 items-center gap-2 text-[13px] font-medium text-ink">
                <FileText className="size-4 shrink-0 text-steel" />
                <span className="truncate">{fileName}</span>
              </span>
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-ink"
              >
                <X className="size-3.5" />
                Remove
              </button>
            </div>
          )}

          {fileName ? (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl border border-border bg-card px-4 py-3"
                  >
                    <p className="label-eyebrow">{stat.label}</p>
                    <p
                      className={`mt-1.5 text-2xl font-semibold tabular-nums ${stat.tone}`}
                    >
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="max-h-56 overflow-y-auto rounded-xl border border-border">
                <table className="w-full border-collapse text-left text-[12px]">
                  <thead className="sticky top-0 bg-sand/70">
                    <tr>
                      {["Row", "Customer", "Issue", "Registration", "Status"].map(
                        (heading) => (
                          <th
                            key={heading}
                            className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                          >
                            {heading}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {classified.slice(0, 50).map(({ row, status }) => (
                      <tr
                        key={row.rowNumber}
                        className="border-t border-border/70"
                      >
                        <td className="px-3 py-2 tabular-nums text-muted-foreground">
                          {row.rowNumber}
                        </td>
                        <td className="px-3 py-2 text-ink">
                          {row.values.customerName || "—"}
                        </td>
                        <td className="max-w-[16rem] truncate px-3 py-2 text-ink">
                          {row.values.subject || "—"}
                        </td>
                        <td className="px-3 py-2 tabular-nums text-muted-foreground">
                          {row.values.registrationNo || "—"}
                        </td>
                        <td className="px-3 py-2">
                          {status === "invalid" ? (
                            <span className="text-critical">
                              Invalid{row.reason ? ` · ${row.reason}` : ""}
                            </span>
                          ) : status === "duplicate" ? (
                            <span className="text-warning">Duplicate</span>
                          ) : (
                            <span className="text-success">Valid</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {counts.valid} of {counts.total} rows can be imported. Invalid
                and duplicate rows are skipped. SLA windows follow the priority
                in each row (Medium by default).
              </p>
            </>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              onOpenChange(false);
              reset();
            }}
            className="h-10 rounded-full text-muted-foreground"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={runImport}
            disabled={!counts.valid || reading}
            className="h-10 rounded-full px-5"
          >
            <Upload className="size-3.5" />
            Import Valid Tickets
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
