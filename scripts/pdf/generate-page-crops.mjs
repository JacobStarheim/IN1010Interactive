import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PNG } from "pngjs";

const PUBLIC_ASSETS_DIR = "/Users/jacob/IN1010-web/public/assets/exams";
const OUTPUT_PATH = "/Users/jacob/IN1010-web/src/data/page-crops.json";

function normalizeAssetPath(fullPath) {
  return `/${fullPath
    .replace("/Users/jacob/IN1010-web/public/", "")
    .replace(/\\/g, "/")}`;
}

async function collectPngFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectPngFiles(full)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".png")) {
      files.push(full);
    }
  }
  return files;
}

function detectBottomContentRatio(png) {
  const { width, height, data } = png;
  const darkThreshold = 232;
  const rightIgnoreX = Math.floor(width * 0.9); // Ignore page-number area at far right.
  const minDarkPixelsOnRow = Math.max(5, Math.floor(width * 0.0025));
  const safetyMarginPx = 20;
  let lastRowWithContent = -1;

  for (let y = 0; y < height; y += 1) {
    let darkCount = 0;
    for (let x = 0; x < rightIgnoreX; x += 1) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];
      if (a < 200) continue;
      if (r < darkThreshold || g < darkThreshold || b < darkThreshold) {
        darkCount += 1;
      }
    }
    if (darkCount >= minDarkPixelsOnRow) {
      lastRowWithContent = y;
    }
  }

  if (lastRowWithContent < 0) {
    return 1;
  }

  let ratio = (lastRowWithContent + safetyMarginPx + 1) / height;
  if (ratio > 0.995) ratio = 1;
  if (ratio < 0.2) ratio = 0.2;
  if (ratio > 1) ratio = 1;
  return Number(ratio.toFixed(4));
}

async function main() {
  const files = await collectPngFiles(PUBLIC_ASSETS_DIR);
  const crops = {};

  for (const filePath of files) {
    const raw = await readFile(filePath);
    const png = PNG.sync.read(raw);
    const assetPath = normalizeAssetPath(filePath);
    crops[assetPath] = {
      width: png.width,
      height: png.height,
      bottom: detectBottomContentRatio(png),
    };
  }

  await writeFile(OUTPUT_PATH, `${JSON.stringify(crops, null, 2)}\n`, "utf8");
  console.log(`Wrote ${OUTPUT_PATH} (${Object.keys(crops).length} entries)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
