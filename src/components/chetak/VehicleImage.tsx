import { cn } from "@/lib/utils";
import { ScooterArt } from "./Art";

/**
 * Official Chetak product photography, mirrored into `/public/chetak` so the
 * workspace never depends on an external CDN at runtime.
 */
export const HERO_IMAGE = "/chetak/hero.webp";
export const LIFESTYLE_IMAGE = "/chetak/lifestyle.webp";
export const PRODUCT_IMAGE = "/chetak/product-tall.webp";

const MODEL_IMAGES: Array<{ match: string; src: string }> = [
  { match: "3503", src: "/chetak/model-3503.webp" },
  { match: "3502", src: "/chetak/model-3502.webp" },
  { match: "3501", src: "/chetak/model-3501.webp" },
  { match: "3001", src: "/chetak/model-3001.webp" },
  { match: "2501", src: "/chetak/model-2501.webp" },
];

/** Product shot for a model name, or `undefined` when we have no asset. */
export function vehicleImageFor(model: string): string | undefined {
  const key = model.toLowerCase();
  return MODEL_IMAGES.find((entry) => key.includes(entry.match))?.src;
}

/** Photos used for customer/workshop attachments, picked deterministically. */
const PHOTO_POOL = [
  HERO_IMAGE,
  LIFESTYLE_IMAGE,
  PRODUCT_IMAGE,
  "/chetak/model-3503.webp",
  "/chetak/model-3501.webp",
  "/chetak/model-3001.webp",
];

export function photoFor(name: string): string {
  let hash = 7;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) % 9973;
  }
  return PHOTO_POOL[hash % PHOTO_POOL.length];
}

/**
 * Renders the real product shot for a vehicle. Falls back to the line-art
 * illustration when the model has no official asset.
 */
export function VehicleImage({
  model,
  src: srcOverride,
  className,
  imageClassName,
  fit = "contain",
}: {
  model: string;
  /** Explicit asset, for shots that are not tied to a model lookup. */
  src?: string;
  className?: string;
  imageClassName?: string;
  fit?: "contain" | "cover";
}) {
  const src = srcOverride ?? vehicleImageFor(model);

  if (!src) {
    return (
      <span className={cn("grid place-items-center", className)}>
        <ScooterArt className={cn("h-auto w-[70%] text-ink/25", imageClassName)} />
      </span>
    );
  }

  return (
    <span className={cn("block overflow-hidden", className)}>
      <img
        src={src}
        alt={model}
        loading="lazy"
        decoding="async"
        className={cn(
          "h-full w-full",
          fit === "cover" ? "object-cover" : "object-contain",
          imageClassName,
        )}
      />
    </span>
  );
}
