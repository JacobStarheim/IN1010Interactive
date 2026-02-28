import cropsByAsset from "@/data/page-crops.json";
import type { Rect } from "@/lib/exam-types";

type CropEntry = {
  width: number;
  height: number;
  bottom: number;
};

const FALLBACK_CROP: CropEntry = {
  width: 1189,
  height: 1683,
  bottom: 1,
};

const cropMap = cropsByAsset as Record<string, CropEntry>;

function clampBottom(bottom: number) {
  if (!Number.isFinite(bottom)) return 1;
  if (bottom < 0.2) return 0.2;
  if (bottom > 1) return 1;
  return bottom;
}

export function getPageCrop(assetPath: string): CropEntry {
  const entry = cropMap[assetPath];
  if (!entry) return FALLBACK_CROP;
  return {
    width: entry.width || FALLBACK_CROP.width,
    height: entry.height || FALLBACK_CROP.height,
    bottom: clampBottom(entry.bottom),
  };
}

export function getEffectivePageBottom(assetPath: string, requiredBottom = 0): number {
  const base = getPageCrop(assetPath).bottom;
  const minRequired = Math.max(0, Math.min(1, requiredBottom));
  return clampBottom(Math.max(base, minRequired));
}

export function mapRectToCroppedPage(rect: Rect, pageBottom: number): Rect {
  const bottom = clampBottom(pageBottom);
  return {
    x: rect.x,
    y: rect.y / bottom,
    w: rect.w,
    h: rect.h / bottom,
  };
}
