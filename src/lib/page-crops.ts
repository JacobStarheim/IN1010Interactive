import cropsByAsset from "@/data/page-crops.json";
import type { Rect } from "@/lib/exam-types";

type CropEntry = {
  width: number;
  height: number;
  top?: number;
  bottom: number;
};

type ResolvedCropEntry = {
  width: number;
  height: number;
  top: number;
  bottom: number;
};

const FALLBACK_CROP: ResolvedCropEntry = {
  width: 1189,
  height: 1683,
  top: 0,
  bottom: 1,
};

const cropMap = cropsByAsset as Record<string, CropEntry>;

function clampTop(top: number) {
  if (!Number.isFinite(top)) return 0;
  if (top < 0) return 0;
  if (top > 0.8) return 0.8;
  return top;
}

function clampBottom(bottom: number) {
  if (!Number.isFinite(bottom)) return 1;
  if (bottom < 0.2) return 0.2;
  if (bottom > 1) return 1;
  return bottom;
}

export function getPageCrop(assetPath: string): ResolvedCropEntry {
  const entry = cropMap[assetPath];
  if (!entry) return FALLBACK_CROP;
  const top = clampTop(entry.top ?? 0);
  const bottom = clampBottom(entry.bottom);
  return {
    width: entry.width || FALLBACK_CROP.width,
    height: entry.height || FALLBACK_CROP.height,
    top: Math.min(top, bottom - 0.05),
    bottom,
  };
}

export function getEffectivePageCrop(
  assetPath: string,
  requiredTop = 1,
  requiredBottom = 0
): ResolvedCropEntry {
  const base = getPageCrop(assetPath);
  const maxAllowedTop = clampTop(requiredTop);
  const minRequiredBottom = Math.max(0, Math.min(1, requiredBottom));
  const top = Math.min(base.top, maxAllowedTop);
  const bottom = clampBottom(Math.max(base.bottom, minRequiredBottom));

  return {
    ...base,
    top: Math.min(top, bottom - 0.05),
    bottom,
  };
}

export function getEffectivePageBottom(assetPath: string, requiredBottom = 0): number {
  return getEffectivePageCrop(assetPath, 1, requiredBottom).bottom;
}

export function mapRectToCroppedPage(rect: Rect, pageTop: number, pageBottom: number): Rect {
  const top = clampTop(pageTop);
  const bottom = clampBottom(pageBottom);
  const visibleHeight = Math.max(0.05, bottom - top);
  return {
    x: rect.x,
    y: (rect.y - top) / visibleHeight,
    w: rect.w,
    h: rect.h / visibleHeight,
  };
}
