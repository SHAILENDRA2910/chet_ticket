import type {
  ActivityEntry,
  ActivityKind,
  ActorRole,
  Attachment,
  AttachmentKind,
  Channel,
  Customer,
  Dealer,
  IssueCategory,
  IssueStatus,
  JourneyEntry,
  JourneyStage,
  Message,
  Person,
  Resolution,
  Ticket,
  TicketPriority,
  TicketStatus,
  Vehicle,
} from "./types";
import { stagesForStatus } from "./workflow";

const MIN = 60_000;
const HOUR = 60 * MIN;

/** Demo data is anchored to load time so the workspace always looks live. */
export const SEED_NOW = Date.now();
const ago = (minutes: number) => SEED_NOW - minutes * MIN;

/** Service levels applied by the existing business process. */
export const SLA_WINDOW: Record<TicketPriority, number> = {
  Critical: 4 * HOUR,
  High: 8 * HOUR,
  Medium: 24 * HOUR,
  Low: 48 * HOUR,
};

let counter = 400;
const uid = (prefix: string) => `${prefix}-${(counter += 1)}`;

/* -------------------------------------------------------------------------- */
/* People and dealers                                                          */
/* -------------------------------------------------------------------------- */

export const EXECUTIVES: Person[] = [
  { name: "Aarav Mehta", code: "d13250", role: "Executive" },
  { name: "Nisha Rao", code: "d12084", role: "Executive" },
  { name: "Kabir Shah", code: "d11902", role: "Executive" },
  { name: "Zoya Khan", code: "d14118", role: "Executive" },
];

/**
 * The demo sign-in. The account is the person whose queue the workspace shows,
 * so the session, the sidebar profile and the dashboard greeting all agree.
 */
export const DEMO_SESSION = {
  email: "aarav.mehta@chetak-service.in",
  password: "Chetak@2026",
  executive: EXECUTIVES[0],
  dealer: "Konkan EV Motors · Pune",
};

export const ASMS: Person[] = [
  { name: "Devang Bhatt", code: "asm-2210", role: "ASM" },
  { name: "Ritika Sen", code: "asm-2194", role: "ASM" },
  { name: "Arjun Pillai", code: "asm-2207", role: "ASM" },
];

export const DEALERS: Dealer[] = [
  {
    name: "Konkan EV Motors Private Limited",
    code: "13250",
    mobile: "+91 90000 13250",
    email: "konkan.13250@chetak-service.in",
    region: "West · Pune",
  },
  {
    name: "Sahyadri Auto Wheels",
    code: "14022",
    mobile: "+91 90000 14022",
    email: "sahyadri.14022@chetak-service.in",
    region: "West · Mumbai",
  },
  {
    name: "Nandi Green Motors",
    code: "15091",
    mobile: "+91 90000 15091",
    email: "nandi.15091@chetak-service.in",
    region: "South · Bengaluru",
  },
  {
    name: "Yamuna EV Centre",
    code: "16110",
    mobile: "+91 90000 16110",
    email: "yamuna.16110@chetak-service.in",
    region: "North · Delhi NCR",
  },
];

/**
 * The public Chetak lineup, as shown on the sign-in stage and the 404 page.
 * Each model has an official product asset; the numbers are the headline specs
 * customers compare (the pack size is what the model number names).
 */
export interface LineupModel {
  /** Full model name — also what resolves the product shot to an asset. */
  name: string;
  /** Short form etched on the vehicle's nameplate, e.g. `3503`. */
  designation: string;
  batteryKwh: number;
  rangeKm: number;
  topSpeedKmph: number;
}

export const CHETAK_LINEUP: LineupModel[] = [
  {
    name: "Chetak 3503 Blue",
    designation: "3503",
    batteryKwh: 3.5,
    rangeKm: 137,
    topSpeedKmph: 73,
  },
  {
    name: "Chetak 3501",
    designation: "3501",
    batteryKwh: 3.5,
    rangeKm: 127,
    topSpeedKmph: 73,
  },
  {
    name: "Chetak 3502",
    designation: "3502",
    batteryKwh: 3.5,
    rangeKm: 132,
    topSpeedKmph: 73,
  },
  {
    name: "Chetak 3001",
    designation: "3001",
    batteryKwh: 3,
    rangeKm: 113,
    topSpeedKmph: 70,
  },
  {
    name: "Chetak C2501",
    designation: "C2501",
    batteryKwh: 2.5,
    rangeKm: 103,
    topSpeedKmph: 66,
  },
];

/** Models the seeded service tickets are written against. */
export const CHETAK_MODELS = CHETAK_LINEUP.map((model) => model.name);

export const CHANNELS: Channel[] = [
  "Dealer",
  "Customer App",
  "Call Centre",
  "Field Visit",
  "Email",
];

export const ISSUE_CATEGORIES: IssueCategory[] = [
  "Electrical",
  "Mechanical",
  "Battery",
  "Software",
  "Body & Paint",
  "Other",
];

const DEFAULT_ECUS = [
  "VCU 2.1.4",
  "BMS 1.8.2",
  "Motor Controller 3.0.1",
  "Charger 1.4.0",
];

/* -------------------------------------------------------------------------- */
/* Small builders                                                              */
/* -------------------------------------------------------------------------- */

const exec = (name: string) =>
  EXECUTIVES.find((person) => person.name === name) ?? EXECUTIVES[0];
const asm = (name: string) => ASMS.find((person) => person.name === name) ?? ASMS[0];
const dealer = (code: string) =>
  DEALERS.find((item) => item.code === code) ?? DEALERS[0];

function customer(name: string, mobile: string, email: string, city: string): Customer {
  return { name, mobile, email, city };
}

function vehicle(input: {
  model: string;
  registrationNo: string;
  vin: string;
  batteryNumber: string;
  purchaseDate: string;
  kms: number;
  minCellVoltage?: number;
  maxCellVoltage?: number;
  ecuList?: string[];
}): Vehicle {
  return {
    minCellVoltage: 12,
    maxCellVoltage: 48,
    ecuList: DEFAULT_ECUS,
    ...input,
  };
}

function message(
  at: number,
  author: string,
  role: ActorRole,
  body: string,
  attachmentName?: string,
): Message {
  return { id: uid("msg"), at, author, role, body, attachmentName };
}

function file(
  name: string,
  kind: AttachmentKind,
  sizeLabel: string,
  uploadedBy: string,
  uploadedAt: number,
): Attachment {
  return { id: uid("att"), name, kind, sizeLabel, uploadedBy, uploadedAt };
}

function activity(
  at: number,
  actor: string,
  role: ActorRole,
  kind: ActivityKind,
  action: string,
  detail?: string,
): ActivityEntry {
  return { id: uid("act"), at, actor, role, kind, action, detail };
}

const STAGE_KIND: Record<JourneyStage, ActivityKind> = {
  Created: "created",
  Assigned: "assigned",
  "In Progress": "diagnosis",
  "Customer Contacted": "contact",
  Resolved: "resolution",
  Closed: "status",
  Reopened: "status",
};

/* -------------------------------------------------------------------------- */
/* Seeds                                                                       */
/* -------------------------------------------------------------------------- */

interface IssueSeed {
  title: string;
  category: IssueCategory;
  status: IssueStatus;
  ago: number;
}

interface Seed {
  number: number;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  channel: Channel;
  awaiting?: string;
  createdAgo: number;
  updatedAgo: number;
  customer: Customer;
  vehicle: Vehicle;
  dealer: Dealer;
  executive: Person;
  asm: Person;
  issues: IssueSeed[];
  messages?: Message[];
  attachments?: Attachment[];
  notes?: Array<{
    at: number;
    actor: string;
    role: ActorRole;
    kind: ActivityKind;
    action: string;
    detail?: string;
  }>;
  resolution?: Resolution;
}

function buildJourney(seed: Seed, createdAt: number, updatedAt: number): JourneyEntry[] {
  // The seed journey is an append-only history of the stages the ticket has
  // moved through, built from its status at seed time.
  const stages = stagesForStatus(seed.status);
  const span = updatedAt - createdAt;
  const last = stages.length - 1;

  return stages.map((stage, position) => {
    const at =
      last === 0 ? createdAt : Math.round(createdAt + (span * position) / last);
    return {
      stage,
      at,
      actor: actorForStage(stage, seed),
      note: noteForStage(stage, seed),
    };
  });
}

function actorForStage(stage: JourneyStage, seed: Seed): string {
  switch (stage) {
    case "Created":
      return seed.customer.name;
    case "Assigned":
      return seed.asm.name;
    case "Closed":
      return "Service Desk";
    default:
      return seed.executive.name;
  }
}

function noteForStage(stage: JourneyStage, seed: Seed): string | undefined {
  if (stage === "Created") {
    return `Raised via ${seed.channel} · ${seed.dealer.name}`;
  }
  if (stage === "Assigned") {
    return `Routed to ${seed.executive.name} (${seed.executive.code})`;
  }
  if (stage === "In Progress" && seed.status === "Pending" && seed.awaiting) {
    return seed.awaiting;
  }
  if (stage === "Resolved") {
    return "Fix verified with the customer";
  }
  return undefined;
}

function buildActivity(seed: Seed, journey: JourneyEntry[]): ActivityEntry[] {
  const roleForStage = (stage: JourneyStage): ActorRole => {
    if (stage === "Created") return "Customer";
    if (stage === "Assigned") return "ASM";
    if (stage === "Closed") return "System";
    return "Executive";
  };

  const fromJourney = journey.map((entry) =>
    activity(
      entry.at,
      entry.actor,
      roleForStage(entry.stage),
      STAGE_KIND[entry.stage],
      entry.stage === "Created" ? "Ticket created" : entry.stage,
      entry.note,
    ),
  );

  const extras = (seed.notes ?? []).map((note) =>
    activity(note.at, note.actor, note.role, note.kind, note.action, note.detail),
  );

  return [...fromJourney, ...extras].sort((a, b) => b.at - a.at);
}

function fallbackMessages(seed: Seed, createdAt: number): Message[] {
  return [
    message(
      createdAt + 4 * MIN,
      seed.customer.name,
      "Customer",
      `Sharing the details for this — ${seed.subject.toLowerCase()}.`,
    ),
    message(
      createdAt + 38 * MIN,
      seed.executive.name,
      "Executive",
      "Noted, I have picked this up. I will run the diagnostics today and update you on the next step.",
    ),
  ];
}

function fallbackAttachments(seed: Seed, createdAt: number): Attachment[] {
  const name =
    seed.issues[0].category === "Battery"
      ? "battery-pack-label.jpg"
      : seed.issues[0].category === "Software"
        ? "fuel-dashboard-error.png"
        : "vehicle-photo.jpg";
  return [file(name, "image", "1.8 MB", seed.customer.name, createdAt + 6 * MIN)];
}

function build(seed: Seed): Ticket {
  const createdAt = ago(seed.createdAgo);
  const updatedAt = ago(seed.updatedAgo);
  const journey = buildJourney(seed, createdAt, updatedAt);
  const slaWindowMs = SLA_WINDOW[seed.priority];
  const resolvedAt = seed.resolution?.resolvedAt ?? updatedAt;

  return {
    id: `TKT-2026-${String(seed.number).padStart(5, "0")}`,
    subject: seed.subject,
    description: seed.description,
    status: seed.status,
    priority: seed.priority,
    channel: seed.channel,
    awaiting: seed.awaiting,
    customer: seed.customer,
    vehicle: seed.vehicle,
    dealer: seed.dealer,
    executive: seed.executive,
    asm: seed.asm,
    issues: seed.issues.map((issue) => ({
      id: uid("iss"),
      title: issue.title,
      category: issue.category,
      status: issue.status,
      raisedAt: ago(issue.ago),
      raisedBy: seed.customer.name,
    })),
    journey,
    activity: buildActivity(seed, journey),
    messages: seed.messages ?? fallbackMessages(seed, createdAt),
    attachments: seed.attachments ?? fallbackAttachments(seed, createdAt),
    resolution: seed.resolution
      ? { ...seed.resolution, resolvedAt }
      : undefined,
    createdAt,
    updatedAt,
    slaWindowMs,
    slaDueAt: createdAt + slaWindowMs,
  };
}

const SEEDS: Seed[] = [
  {
    number: 130,
    subject: "Instrument cluster flickers in direct daylight",
    description:
      "Customer reports the speed readout dims and flickers while riding between 11:00 and 15:00. No error codes stored.",
    status: "New",
    priority: "Medium",
    channel: "Customer App",
    createdAgo: 14,
    updatedAgo: 3,
    customer: customer(
      "Rohan Kadam",
      "+91 90000 41127",
      "rohan.kadam@example.com",
      "Mumbai",
    ),
    vehicle: vehicle({
      model: "Chetak 3502",
      registrationNo: "MH02EV5971",
      vin: "MD2C5920XSAK51024",
      batteryNumber: "512904",
      purchaseDate: "2026-03-14",
      kms: 1180,
    }),
    dealer: dealer("14022"),
    executive: exec("Nisha Rao"),
    asm: asm("Ritika Sen"),
    issues: [
      {
        title: "Instrument cluster flickers in daylight",
        category: "Electrical",
        status: "Pending",
        ago: 14,
      },
    ],
  },
  {
    number: 129,
    subject: "Motor noise while accelerating from standstill",
    description:
      "A low grinding noise is heard for the first two seconds of acceleration. Dealer has confirmed the noise on a road test.",
    status: "Assigned",
    priority: "High",
    channel: "Dealer",
    createdAgo: 52,
    updatedAgo: 21,
    customer: customer(
      "Sneha Bhosale",
      "+91 90000 33187",
      "sneha.bhosale@example.com",
      "Pune",
    ),
    vehicle: vehicle({
      model: "Chetak 3501",
      registrationNo: "MH14KT7712",
      vin: "MD2C5920XSAK48319",
      batteryNumber: "210778",
      purchaseDate: "2025-10-02",
      kms: 5240,
    }),
    dealer: dealer("13250"),
    executive: exec("Kabir Shah"),
    asm: asm("Devang Bhatt"),
    issues: [
      {
        title: "Motor noise while accelerating",
        category: "Mechanical",
        status: "In Progress",
        ago: 52,
      },
    ],
    attachments: [
      file("motor-noise-recording.mp4", "video", "12.4 MB", "Sneha Bhosale", ago(48)),
      file("road-test-report.pdf", "document", "240 KB", "Konkan EV Motors", ago(30)),
    ],
    notes: [
      {
        at: ago(24),
        actor: "Kabir Shah",
        role: "Executive",
        kind: "diagnosis",
        action: "Diagnosis started",
        detail: "Motor mount fasteners checked — no play found. Awaiting controller log pull.",
      },
    ],
  },
  {
    number: 128,
    subject: "Chetak 3501 not accepting charge after v4.2 software update",
    description:
      "Vehicle completed the v4.2 OTA update on 30 Sep. Since then the charger LED shows green within a minute and the battery does not gain charge beyond 34%.",
    status: "In Progress",
    priority: "High",
    channel: "Dealer",
    createdAgo: 378,
    updatedAgo: 6,
    customer: customer(
      "Vikram Menon",
      "+91 90000 11029",
      "vikram.menon@example.com",
      "Pune",
    ),
    vehicle: vehicle({
      model: "Chetak 3501",
      registrationNo: "MH14KT4417",
      vin: "MD2C5920XSAK27905",
      batteryNumber: "113882",
      purchaseDate: "2025-11-08",
      kms: 3410,
      minCellVoltage: 11,
      maxCellVoltage: 47,
    }),
    dealer: dealer("13250"),
    executive: exec("Aarav Mehta"),
    asm: asm("Devang Bhatt"),
    issues: [
      {
        title: "Charging stops after 34% (post v4.2 update)",
        category: "Battery",
        status: "In Progress",
        ago: 378,
      },
      {
        title: "Charge indicator LED turns green immediately",
        category: "Electrical",
        status: "Pending",
        ago: 320,
      },
    ],
    attachments: [
      file("charger-led-state.jpg", "image", "2.1 MB", "Vikram Menon", ago(370)),
      file("dashboard-error-codes.png", "image", "840 KB", "Konkan EV Motors", ago(300)),
      file("bms-diagnostic-log.txt", "document", "96 KB", "Aarav Mehta", ago(120)),
      file("cell-voltage-report.pdf", "document", "512 KB", "Aarav Mehta", ago(45)),
    ],
    messages: [
      message(
        ago(370),
        "Vikram Menon",
        "Customer",
        "Updated the software yesterday evening. Since then the scooter does not charge at all beyond one third.",
      ),
      message(
        ago(352),
        "Aarav Mehta",
        "Executive",
        "Thank you for reporting this. I have pulled the BMS logs. Can you confirm the charger LED colour at the start and end of the cycle?",
      ),
      message(
        ago(340),
        "Vikram Menon",
        "Customer",
        "It shows red for about a minute then turns green while the dashboard still says 34%.",
        "charger-led-state.jpg",
      ),
      message(
        ago(96),
        "Aarav Mehta",
        "Executive",
        "Confirmed — the BMS is tripping on cell 12 imbalance after the update. Escalating to the battery engineering cell for a calibration patch.",
      ),
      message(
        ago(40),
        "Devang Bhatt",
        "ASM",
        "Please keep the vehicle at the workshop until the patch lands. I will follow up with the engineering cell today.",
      ),
    ],
    notes: [
      {
        at: ago(120),
        actor: "Aarav Mehta",
        role: "Executive",
        kind: "note",
        action: "Diagnosis updated",
        detail: "Pack held at 34% SoC. Cell 12 imbalance of 148 mV observed on the BMS log.",
      },
      {
        at: ago(45),
        actor: "Aarav Mehta",
        role: "Executive",
        kind: "attachment",
        action: "Uploaded cell-voltage-report.pdf",
      },
    ],
  },
  {
    number: 127,
    subject: "Side stand switch not working · water entry in tail lamp",
    description:
      "Two concerns raised at the same visit: the side stand cut-off does not operate, and the tail lamp has visible water ingress after rain.",
    status: "Pending",
    priority: "High",
    channel: "Dealer",
    awaiting: "Awaiting dealer confirmation on the tail lamp replacement part",
    createdAgo: 462,
    updatedAgo: 35,
    customer: customer(
      "Sameer Qureshi",
      "+91 90000 09231",
      "sameer.qureshi@example.com",
      "Mumbai",
    ),
    vehicle: vehicle({
      model: "Chetak 3503 Blue",
      registrationNo: "MH02EV4716",
      vin: "MD2C5920XSAH31086",
      batteryNumber: "444123",
      purchaseDate: "2025-12-22",
      kms: 200,
    }),
    dealer: dealer("13250"),
    executive: exec("Aarav Mehta"),
    asm: asm("Devang Bhatt"),
    issues: [
      {
        title: "Side stand switch not working (Electrical)",
        category: "Electrical",
        status: "Pending",
        ago: 462,
      },
      {
        title: "Water entry in tail lamp (Mechanical)",
        category: "Mechanical",
        status: "Pending",
        ago: 430,
      },
    ],
    attachments: [
      file("side-stand-switch.jpg", "image", "1.9 MB", "Sameer Qureshi", ago(455)),
      file("tail-lamp-water-ingress.jpg", "image", "2.6 MB", "Sameer Qureshi", ago(452)),
      file("job-card-174943.pdf", "document", "310 KB", "Konkan EV Motors", ago(200)),
    ],
    messages: [
      message(
        ago(455),
        "Sameer Qureshi",
        "Customer",
        "The scooter still rolls when the side stand is down, and after the last rain there is water inside the tail lamp.",
        "side-stand-switch.jpg",
      ),
      message(
        ago(420),
        "Aarav Mehta",
        "Executive",
        "Thank you. Both concerns are recorded against this ticket. The side stand harness will be replaced free of cost under warranty.",
      ),
      message(
        ago(388),
        "Devang Bhatt",
        "ASM",
        "Tail lamp assembly will be replaced under goodwill. I have asked the dealer for stock confirmation before we schedule the visit.",
      ),
      message(
        ago(60),
        "Aarav Mehta",
        "Executive",
        "Waiting on the dealer to confirm the tail lamp part. Ticket kept pending so the SLA clock is paused for the customer.",
      ),
    ],
    notes: [
      {
        at: ago(400),
        actor: "Devang Bhatt",
        role: "ASM",
        kind: "note",
        action: "Approval recorded",
        detail: "Tail lamp replacement approved under goodwill. Side stand harness in warranty scope.",
      },
      {
        at: ago(60),
        actor: "Aarav Mehta",
        role: "Executive",
        kind: "status",
        action: "Marked as Pending",
        detail: "Waiting for the dealer part confirmation.",
      },
    ],
  },
  {
    number: 126,
    subject: "Battery range dropped below 60 km on a full charge",
    description:
      "Customer reports an achievable range of 58 km in Eco mode against an expected 95 km. Vehicle is 7 months old with 6,120 km on the odometer.",
    status: "In Progress",
    priority: "Critical",
    channel: "Call Centre",
    createdAgo: 312,
    updatedAgo: 48,
    customer: customer(
      "Alisha Fernandes",
      "+91 90000 77213",
      "alisha.fernandes@example.com",
      "Mumbai",
    ),
    vehicle: vehicle({
      model: "Chetak C2501",
      registrationNo: "MH01EV1824",
      vin: "MD2C5920XSAK63107",
      batteryNumber: "519665",
      purchaseDate: "2026-02-19",
      kms: 6120,
      minCellVoltage: 10,
      maxCellVoltage: 44,
    }),
    dealer: dealer("14022"),
    executive: exec("Nisha Rao"),
    asm: asm("Ritika Sen"),
    issues: [
      {
        title: "Range below 60 km on full charge",
        category: "Battery",
        status: "In Progress",
        ago: 312,
      },
    ],
    attachments: [
      file("range-log-export.pdf", "document", "420 KB", "Nisha Rao", ago(200)),
      file("pack-warranty-card.jpg", "image", "1.2 MB", "Alisha Fernandes", ago(305)),
    ],
    notes: [
      {
        at: ago(120),
        actor: "Nisha Rao",
        role: "Executive",
        kind: "diagnosis",
        action: "Capacity test scheduled",
        detail: "Discharge test booked at Sahyadri Auto Wheels. Pack is inside the 3-year / 50,000 km warranty.",
      },
    ],
  },
  {
    number: 125,
    subject: "Vehicle will not power on after 20 minutes of riding",
    description:
      "Intermittent shutdown while riding. Vehicle restarts only after the key is cycled twice.",
    status: "Assigned",
    priority: "Critical",
    channel: "Field Visit",
    createdAgo: 60,
    updatedAgo: 12,
    customer: customer(
      "Rehan Siddiqui",
      "+91 90000 55218",
      "rehan.siddiqui@example.com",
      "Delhi NCR",
    ),
    vehicle: vehicle({
      model: "Chetak 3001",
      registrationNo: "DL9CEV2210",
      vin: "MD2C5920XSAK85730",
      batteryNumber: "902451",
      purchaseDate: "2026-01-06",
      kms: 7890,
    }),
    dealer: dealer("16110"),
    executive: exec("Zoya Khan"),
    asm: asm("Arjun Pillai"),
    issues: [
      {
        title: "Intermittent power loss while riding",
        category: "Electrical",
        status: "In Progress",
        ago: 60,
      },
    ],
    attachments: [
      file("breakdown-photo.jpg", "image", "1.6 MB", "Rehan Siddiqui", ago(56)),
    ],
  },
  {
    number: 124,
    subject: "Charger adapter overheating during the charge cycle",
    description:
      "Charger body is too hot to hold after 90 minutes. Customer has been advised to stop using the unit.",
    status: "Pending",
    priority: "Critical",
    channel: "Call Centre",
    awaiting: "Awaiting a replacement charger unit from the dealer",
    createdAgo: 125,
    updatedAgo: 26,
    customer: customer(
      "Meenal Joshi",
      "+91 90000 88901",
      "meenal.joshi@example.com",
      "Bengaluru",
    ),
    vehicle: vehicle({
      model: "Chetak 3502",
      registrationNo: "KA05EV7120",
      vin: "MD2C5920XSAK15268",
      batteryNumber: "214330",
      purchaseDate: "2025-09-27",
      kms: 9920,
    }),
    dealer: dealer("15091"),
    executive: exec("Kabir Shah"),
    asm: asm("Ritika Sen"),
    issues: [
      {
        title: "Charger overheating in 90 minutes",
        category: "Electrical",
        status: "Pending",
        ago: 125,
      },
    ],
    attachments: [
      file("charger-serial-plate.jpg", "image", "1.1 MB", "Meenal Joshi", ago(120)),
    ],
    notes: [
      {
        at: ago(30),
        actor: "Kabir Shah",
        role: "Executive",
        kind: "status",
        action: "Marked as Pending",
        detail: "Customer advised not to charge. Replacement unit requested from Nandi Green Motors.",
      },
    ],
  },
  {
    number: 123,
    subject: "Ride history not syncing to the Chetak app",
    description:
      "Trips recorded on the vehicle are missing from the app since 24 Sep. Bluetooth pairing and account login both verified.",
    status: "In Progress",
    priority: "Medium",
    channel: "Customer App",
    createdAgo: 540,
    updatedAgo: 90,
    customer: customer(
      "Aditya Rane",
      "+91 90000 33217",
      "aditya.rane@example.com",
      "Pune",
    ),
    vehicle: vehicle({
      model: "Chetak 3503 Blue",
      registrationNo: "MH14KT9981",
      vin: "MD2C5920XSAK72043",
      batteryNumber: "771990",
      purchaseDate: "2026-04-11",
      kms: 2140,
    }),
    dealer: dealer("13250"),
    executive: exec("Aarav Mehta"),
    asm: asm("Devang Bhatt"),
    issues: [
      {
        title: "Ride history not syncing",
        category: "Software",
        status: "In Progress",
        ago: 540,
      },
    ],
    attachments: [
      file("app-sync-screenshot.png", "image", "720 KB", "Aditya Rane", ago(536)),
      file("telematics-device-id.txt", "document", "12 KB", "Aarav Mehta", ago(200)),
    ],
    messages: [
      message(
        ago(536),
        "Aditya Rane",
        "Customer",
        "Trips from the last four days are not showing in the app, though the scooter shows them on the dashboard.",
      ),
      message(
        ago(500),
        "Aarav Mehta",
        "Executive",
        "Thanks. The telematics device is reporting to our server, so this looks like an app-side mapping issue. I have raised it with the connected-car team.",
      ),
      message(
        ago(150),
        "Devang Bhatt",
        "ASM",
        "Back-fill for the missing trips has been approved. Expect it to reflect in the app within 48 hours.",
      ),
    ],
  },
  {
    number: 122,
    subject: "Front wheel alignment off after pothole impact",
    description:
      "Handlebar pulls to the left and the front tyre shows uneven wear after a pothole impact on 28 Sep.",
    status: "Assigned",
    priority: "Medium",
    channel: "Dealer",
    createdAgo: 660,
    updatedAgo: 210,
    customer: customer(
      "Ganesh Iyer",
      "+91 90000 71204",
      "ganesh.iyer@example.com",
      "Bengaluru",
    ),
    vehicle: vehicle({
      model: "Chetak 3501",
      registrationNo: "KA03EV5410",
      vin: "MD2C5920XSAK39051",
      batteryNumber: "045112",
      purchaseDate: "2025-08-30",
      kms: 12480,
    }),
    dealer: dealer("15091"),
    executive: exec("Zoya Khan"),
    asm: asm("Arjun Pillai"),
    issues: [
      {
        title: "Front wheel alignment off",
        category: "Mechanical",
        status: "In Progress",
        ago: 660,
      },
    ],
    attachments: [file("tyre-wear.jpg", "image", "2.2 MB", "Ganesh Iyer", ago(650))],
  },
  {
    number: 121,
    subject: "Front panel rattle above 40 km/h",
    description:
      "Plastic rattle from the front apron at speeds above 40 km/h on rough roads.",
    status: "Resolved",
    priority: "Medium",
    channel: "Dealer",
    createdAgo: 1800,
    updatedAgo: 1500,
    customer: customer(
      "Divya Pillai",
      "+91 90000 22019",
      "divya.pillai@example.com",
      "Mumbai",
    ),
    vehicle: vehicle({
      model: "Chetak C2501",
      registrationNo: "MH02EV3190",
      vin: "MD2C5920XSAK92468",
      batteryNumber: "417220",
      purchaseDate: "2026-05-22",
      kms: 860,
    }),
    dealer: dealer("14022"),
    executive: exec("Nisha Rao"),
    asm: asm("Ritika Sen"),
    issues: [
      {
        title: "Front panel rattle above 40 km/h",
        category: "Body & Paint",
        status: "Resolved",
        ago: 1800,
      },
    ],
    attachments: [
      file("panel-fix-before.jpg", "image", "1.4 MB", "Sahyadri Auto Wheels", ago(1700)),
      file("panel-fix-after.jpg", "image", "1.5 MB", "Sahyadri Auto Wheels", ago(1520)),
      file("gate-pass-121.pdf", "document", "180 KB", "Sahyadri Auto Wheels", ago(1500)),
    ],
    notes: [
      {
        at: ago(1560),
        actor: "Nisha Rao",
        role: "Executive",
        kind: "note",
        action: "Root cause identified",
        detail: "Two apron clips missing from the factory fitment. Replaced and road tested for 6 km.",
      },
    ],
    resolution: {
      rootCause: "Missing apron clips causing panel vibration at speed",
      actionTaken:
        "Refitted the front apron with new clips and added damping tape to the inner panel",
      remarks: "Road tested for 6 km. No rattle observed. Customer informed over call.",
      partsUsed: "Apron clip set (2 nos) · Damping tape 1 roll",
      resolvedBy: "Nisha Rao",
      resolvedAt: ago(1500),
    },
  },
  {
    number: 120,
    subject: "Brake lever feels loose and travels too far",
    description:
      "Front brake lever has excessive travel and the customer reports reduced braking confidence.",
    status: "Resolved",
    priority: "Low",
    channel: "Dealer",
    createdAgo: 4320,
    updatedAgo: 600,
    customer: customer(
      "Manav Kapoor",
      "+91 90000 47712",
      "manav.kapoor@example.com",
      "Delhi NCR",
    ),
    vehicle: vehicle({
      model: "Chetak 3502",
      registrationNo: "DL7CAV4402",
      vin: "MD2C5920XSAK18475",
      batteryNumber: "218440",
      purchaseDate: "2025-07-14",
      kms: 15840,
    }),
    dealer: dealer("16110"),
    executive: exec("Zoya Khan"),
    asm: asm("Arjun Pillai"),
    issues: [
      {
        title: "Brake lever excessive travel",
        category: "Mechanical",
        status: "Resolved",
        ago: 4320,
      },
    ],
    attachments: [file("brake-fluid-level.jpg", "image", "1.1 MB", "Yamuna EV Centre", ago(900))],
    notes: [
      {
        at: ago(700),
        actor: "Zoya Khan",
        role: "Executive",
        kind: "note",
        action: "Workshop delay recorded",
        detail: "Caliper seal kit was out of stock for two days, which pushed the closure past the SLA window.",
      },
    ],
    resolution: {
      rootCause: "Air in the front brake circuit due to a hardened caliper seal",
      actionTaken: "Replaced the caliper seal kit and bled the brake circuit",
      remarks: "Lever travel restored to specification. Customer advised a follow-up after 500 km.",
      partsUsed: "Caliper seal kit · DOT4 brake fluid 250 ml",
      resolvedBy: "Zoya Khan",
      resolvedAt: ago(600),
    },
  },
  {
    number: 119,
    subject: "Seat lock not engaging after service",
    description:
      "Seat cannot be locked with the key after the 5,000 km service. Dealer reopened the panel and adjusted the latch striker.",
    status: "Closed",
    priority: "Low",
    channel: "Dealer",
    createdAgo: 5760,
    updatedAgo: 5200,
    customer: customer(
      "Tanvi Shetty",
      "+91 90000 66120",
      "tanvi.shetty@example.com",
      "Bengaluru",
    ),
    vehicle: vehicle({
      model: "Chetak 3503 Blue",
      registrationNo: "KA01EV2216",
      vin: "MD2C5920XSAL52096",
      batteryNumber: "723008",
      purchaseDate: "2025-06-03",
      kms: 5120,
    }),
    dealer: dealer("15091"),
    executive: exec("Kabir Shah"),
    asm: asm("Ritika Sen"),
    issues: [
      {
        title: "Seat lock not engaging",
        category: "Mechanical",
        status: "Resolved",
        ago: 5760,
      },
    ],
    resolution: {
      rootCause: "Latch striker misaligned during the service refitment",
      actionTaken: "Realigned the striker and lubricated the latch assembly",
      remarks: "Verified with the customer at handover. No further complaints.",
      partsUsed: "None",
      resolvedBy: "Kabir Shah",
      resolvedAt: ago(5250),
    },
  },
  {
    number: 118,
    subject: "Battery pack label mismatch at delivery",
    description:
      "Battery number printed on the warranty card does not match the pack serial. Documentation correction requested.",
    status: "Closed",
    priority: "Low",
    channel: "Email",
    createdAgo: 8640,
    updatedAgo: 8100,
    customer: customer(
      "Nikhil Ahuja",
      "+91 90000 90012",
      "nikhil.ahuja@example.com",
      "Mumbai",
    ),
    vehicle: vehicle({
      model: "Chetak 3001",
      registrationNo: "MH01EV6351",
      vin: "MD2C5920XSAL36914",
      batteryNumber: "360117",
      purchaseDate: "2025-05-19",
      kms: 17650,
    }),
    dealer: dealer("14022"),
    executive: exec("Nisha Rao"),
    asm: asm("Ritika Sen"),
    issues: [
      {
        title: "Battery pack label mismatch on documents",
        category: "Other",
        status: "Resolved",
        ago: 8640,
      },
    ],
    attachments: [file("warranty-card-scan.pdf", "document", "640 KB", "Nikhil Ahuja", ago(8640))],
    resolution: {
      rootCause: "Warranty card was printed against the older pack serial",
      actionTaken: "Reissued the warranty card and updated the vehicle record in the DMS",
      remarks: "Corrected copy emailed to the customer and shared with the dealer.",
      partsUsed: "None",
      resolvedBy: "Nisha Rao",
      resolvedAt: ago(8150),
    },
  },
];

export const SEED_TICKETS: Ticket[] = SEEDS.map(build).sort(
  (a, b) => b.createdAt - a.createdAt,
);
