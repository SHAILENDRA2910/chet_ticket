import { cn } from "@/lib/utils";
import { CHETAK_LINEUP } from "@/lib/chetak/data";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { SpeedArc } from "./Art";
import { ChetakLogo } from "./primitives";
import { PRODUCT_IMAGE, VehicleImage } from "./VehicleImage";

/** How long each model stays on the stage. */
const ROTATION_MS = 5000;

const EASE = [0.22, 1, 0.36, 1] as const;

/** Headline spread across the lineup — used by the hero, which has no model. */
const LINEUP_SPREAD = {
  battery: `${Math.min(...CHETAK_LINEUP.map((m) => m.batteryKwh)).toFixed(1)}–${Math.max(
    ...CHETAK_LINEUP.map((m) => m.batteryKwh),
  ).toFixed(1)} kWh`,
  range: `${Math.min(...CHETAK_LINEUP.map((m) => m.rangeKm))}–${Math.max(
    ...CHETAK_LINEUP.map((m) => m.rangeKm),
  )} km`,
  speed: `${Math.max(...CHETAK_LINEUP.map((m) => m.topSpeedKmph))} km/h`,
};

interface StageSkin {
  stage: string;
  arcs: string;
  pool: string;
  vehicle: string;
  plate: string;
  plateRule: string;
  plateText: string;
  specValue: string;
  specLabel: string;
  specSeparator: string;
  railIdle: string;
  railActive: string;
  railRing: string;
}

/** The stage renders on two very different surfaces, so every accent is skinned. */
const SKINS: Record<"dark" | "light", StageSkin> = {
  dark: {
    stage: "border-white/10 bg-white/[0.045]",
    arcs: "text-ivory/10",
    pool: "bg-aqua/20",
    vehicle: "drop-shadow-[0_30px_48px_rgba(9,6,26,0.7)]",
    plate: "bg-ivory shadow-[0_20px_44px_-24px_rgba(6,4,20,0.95)]",
    plateRule: "bg-ink/15",
    plateText: "text-ink/80",
    specValue: "text-ivory/80",
    specLabel: "text-ivory/45",
    specSeparator: "text-ivory/25",
    railIdle: "bg-ivory/25 hover:bg-ivory/50",
    railActive: "bg-aqua",
    railRing: "focus-visible:ring-aqua/60",
  },
  light: {
    stage:
      "border-border bg-card shadow-[0_44px_88px_-58px_rgba(30,24,57,0.5)]",
    arcs: "text-brand/10",
    pool: "bg-teal/10",
    vehicle: "drop-shadow-[0_26px_40px_rgba(30,24,57,0.3)]",
    plate:
      "border border-border bg-ivory shadow-[0_18px_36px_-24px_rgba(30,24,57,0.4)]",
    plateRule: "bg-ink/15",
    plateText: "text-ink/80",
    specValue: "text-ink",
    specLabel: "text-muted-foreground",
    specSeparator: "text-ink/25",
    railIdle: "bg-ink/20 hover:bg-ink/40",
    railActive: "bg-teal",
    railRing: "focus-visible:ring-teal/50",
  },
};

function Spec({
  value,
  label,
  skin,
}: {
  value: string;
  label: string;
  skin: StageSkin;
}) {
  return (
    <span className="whitespace-nowrap text-[11.5px]">
      <span className={cn("font-semibold tabular-nums", skin.specValue)}>
        {value}
      </span>{" "}
      <span className={skin.specLabel}>{label}</span>
    </span>
  );
}

/** The vehicle's nameplate: script wordmark plus whatever identifies the model. */
function Plate({
  skin,
  compact = false,
  children,
}: {
  skin: StageSkin;
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-2xl",
        compact ? "gap-2.5 px-3 py-1.5" : "gap-3 px-4 py-2",
        skin.plate,
      )}
    >
      <ChetakLogo surface="light" className={compact ? "w-14" : "w-20"} />
      <span
        className={cn(compact ? "h-3.5" : "h-4", "w-px", skin.plateRule)}
      />
      {children}
    </span>
  );
}

/**
 * The Chetak stage. Three shapes, one composition:
 * - `mode="lineup"` rotates the model cutouts with a rail and per-model specs;
 * - `mode="hero"` is the tall flagship shot, for pages with room to show it
 *   large and sharp (it sits at its native resolution up to ~26rem);
 * - `compact` is the phone-sized strip: nameplate and rail on one row;
 * - `bare` drops the stage chrome so the product floats inside another
 *   surface, which is how it appears in empty states.
 */
export function LineupStage({
  tone = "dark",
  mode = "lineup",
  compact = false,
  bare = false,
  className,
}: {
  /** Surface the stage sits on: `dark` for the indigo panel, `light` for ivory. */
  tone?: "dark" | "light";
  mode?: "lineup" | "hero";
  /** Tighter composition for narrow screens. */
  compact?: boolean;
  /** No border, background or shadow — the product floats on the host surface. */
  bare?: boolean;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const model = CHETAK_LINEUP[index];
  const skin = SKINS[tone];
  const hero = mode === "hero";

  useEffect(() => {
    // The hero is a single shot, so there is nothing to rotate.
    if (hero) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const timer = window.setInterval(
      () => setIndex((current) => (current + 1) % CHETAK_LINEUP.length),
      ROTATION_MS,
    );
    // Re-arms on every change, so picking a model also restarts the dwell.
    return () => window.clearInterval(timer);
  }, [hero, index]);

  const rail = (
    <div
      className={cn(
        "flex items-center gap-1.5",
        compact ? "shrink-0" : "relative mt-3 w-full shrink-0 justify-center",
      )}
      role="group"
      aria-label="Chetak lineup"
    >
      {CHETAK_LINEUP.map((entry, entryIndex) => (
        <button
          key={entry.name}
          type="button"
          onClick={() => setIndex(entryIndex)}
          aria-label={`Show ${entry.name}`}
          aria-current={entryIndex === index}
          className={cn(
            "grid size-4 place-items-center rounded-full focus-visible:ring-2 focus-visible:outline-none",
            skin.railRing,
          )}
        >
          <span
            className={cn(
              "block rounded-full transition-all duration-300",
              entryIndex === index
                ? cn("size-2", skin.railActive)
                : cn("size-1.5", skin.railIdle),
            )}
          />
        </button>
      ))}
    </div>
  );

  return (
    <div
      className={cn(
        "relative flex min-h-0 flex-col",
        bare
          ? "px-0 pb-0 pt-0"
          : cn(
              "rounded-[32px] border",
              compact ? "px-5 pb-4 pt-3" : "px-8 pb-5 pt-4",
              skin.stage,
            ),
        className,
      )}
    >
      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        <SpeedArc
          className={cn(
            "pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
            bare
              ? "size-[13rem]"
              : compact
                ? "size-[16rem]"
                : "size-[24rem]",
            skin.arcs,
          )}
        />
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute bottom-[10%] left-1/2 h-10 w-[62%] -translate-x-1/2 rounded-[100%] blur-2xl",
            skin.pool,
          )}
        />
        {/*
          The product shots are 290x220, so the lineup cap sits just above native
          (~1.2x). The hero shot is 361x464 and is only worth staging when the
          box is tall enough to beat that — around 20rem and up.
        */}
        <div
          className={cn(
            "relative h-full w-full",
            hero
              ? "max-h-[min(52vh,26rem)]"
              : compact
                ? "max-h-[min(30vh,12rem)]"
                : "max-h-[min(34vh,19rem)]",
          )}
        >
          <AnimatePresence initial={false}>
            <motion.div
              key={hero ? "hero" : model.name}
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0, x: 26 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -26 }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              <VehicleImage
                model={hero ? "Chetak" : model.name}
                src={hero ? PRODUCT_IMAGE : undefined}
                className="h-full w-full"
                imageClassName={skin.vehicle}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {compact ? (
        /* One bottom row: identity on the left, the rail on the right. */
        <div className="relative mt-3 flex shrink-0 items-center justify-between gap-3">
          <Plate skin={skin} compact>
            <span
              className={cn(
                "text-[12px] font-semibold tabular-nums",
                skin.plateText,
              )}
            >
              {model.designation}
            </span>
          </Plate>
          {rail}
        </div>
      ) : (
        <>
          <div className="relative mt-3 flex shrink-0 justify-center">
            <Plate skin={skin}>
              {hero ? (
                <span
                  className={cn(
                    "flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.22em]",
                    skin.plateText,
                  )}
                >
                  <span className={cn("size-1.5 rounded-full", skin.railActive)} />
                  Service
                </span>
              ) : (
                <span
                  className={cn(
                    "text-[13px] font-semibold tabular-nums",
                    skin.plateText,
                  )}
                >
                  {model.designation}
                </span>
              )}
            </Plate>
          </div>

          {/* min-height keeps the rail steady while the spec line swaps out. */}
          <div className="relative mt-2.5 flex min-h-[1.125rem] shrink-0 flex-wrap items-center justify-center gap-x-3 gap-y-1">
            {hero ? (
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                <Spec
                  value={LINEUP_SPREAD.battery}
                  label="packs"
                  skin={skin}
                />
                <span aria-hidden className={skin.specSeparator}>
                  ·
                </span>
                <Spec value={LINEUP_SPREAD.range} label="range" skin={skin} />
                <span aria-hidden className={skin.specSeparator}>
                  ·
                </span>
                <Spec
                  value={LINEUP_SPREAD.speed}
                  label="top speed"
                  skin={skin}
                />
              </div>
            ) : (
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={model.name}
                  className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: EASE }}
                >
                  <Spec
                    value={`${model.batteryKwh.toFixed(1)} kWh`}
                    label="battery"
                    skin={skin}
                  />
                  <span aria-hidden className={skin.specSeparator}>
                    ·
                  </span>
                  <Spec value={`${model.rangeKm} km`} label="range" skin={skin} />
                  <span aria-hidden className={skin.specSeparator}>
                    ·
                  </span>
                  <Spec
                    value={`${model.topSpeedKmph} km/h`}
                    label="top speed"
                    skin={skin}
                  />
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          {!hero ? rail : null}
        </>
      )}
    </div>
  );
}
