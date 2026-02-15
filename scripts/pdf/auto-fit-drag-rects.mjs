import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PNG } from "pngjs";

const DATA_DIR = "/Users/jacob/IN1010-web/src/data/exams";
const PUBLIC_DIR = "/Users/jacob/IN1010-web/public";

const manifestFiles = [
  "v24-midtveis.json",
  "v24-konte.json",
  "v24-prove.json",
  "v25-midtveis.json",
  "v25-konte.json",
];

function isGreen(r, g, b) {
  // Border green used in Inspera fasit boxes.
  return g > 110 && g > r + 20 && g > b + 20 && r < 170 && b < 170;
}

function findConnectedBoxes(png) {
  const { width, height, data } = png;
  const visited = new Uint8Array(width * height);

  const idx = (x, y) => y * width + x;

  const boxes = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const p = idx(x, y);
      if (visited[p]) continue;

      const off = p * 4;
      const r = data[off];
      const g = data[off + 1];
      const b = data[off + 2];

      if (!isGreen(r, g, b)) {
        visited[p] = 1;
        continue;
      }

      // Flood fill this green component.
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let count = 0;
      const queue = [p];
      visited[p] = 1;

      while (queue.length > 0) {
        const cur = queue.pop();
        count += 1;
        const cy = Math.floor(cur / width);
        const cx = cur - cy * width;

        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        const neigh = [
          cur - 1,
          cur + 1,
          cur - width,
          cur + width,
        ];

        for (const n of neigh) {
          if (n < 0 || n >= width * height) continue;
          const ny = Math.floor(n / width);
          const nx = n - ny * width;
          if (Math.abs(nx - cx) + Math.abs(ny - cy) !== 1) continue;
          if (visited[n]) continue;
          visited[n] = 1;
          const noff = n * 4;
          const nr = data[noff];
          const ng = data[noff + 1];
          const nb = data[noff + 2];
          if (isGreen(nr, ng, nb)) {
            queue.push(n);
          }
        }
      }

      const w = maxX - minX + 1;
      const h = maxY - minY + 1;

      // Filter out checkmarks/noise; keep rectangular border components.
      if (count > 120 && w > 45 && h > 16 && w < width * 0.8 && h < 80) {
        boxes.push({ minX, minY, maxX, maxY, w, h, count });
      }
    }
  }

  // Merge near-duplicate components for same rectangle (if border got split)
  const merged = [];
  for (const box of boxes.sort((a, b) => a.minY - b.minY || a.minX - b.minX)) {
    const target = merged.find(
      (m) =>
        Math.abs(m.minX - box.minX) <= 3 &&
        Math.abs(m.minY - box.minY) <= 3 &&
        Math.abs(m.maxX - box.maxX) <= 3 &&
        Math.abs(m.maxY - box.maxY) <= 3
    );
    if (!target) {
      merged.push({ ...box });
    } else {
      target.minX = Math.min(target.minX, box.minX);
      target.minY = Math.min(target.minY, box.minY);
      target.maxX = Math.max(target.maxX, box.maxX);
      target.maxY = Math.max(target.maxY, box.maxY);
      target.w = target.maxX - target.minX + 1;
      target.h = target.maxY - target.minY + 1;
      target.count += box.count;
    }
  }

  return merged.sort((a, b) => a.minY - b.minY || a.minX - b.minX);
}

function normalizeBox(box, width, height) {
  return {
    x: Number((box.minX / width).toFixed(4)),
    y: Number((box.minY / height).toFixed(4)),
    w: Number((box.w / width).toFixed(4)),
    h: Number((box.h / height).toFixed(4)),
  };
}

async function loadPng(filePath) {
  const buf = await readFile(filePath);
  return PNG.sync.read(buf);
}

function chooseBoxesForQuestion(allBoxes, needed) {
  if (allBoxes.length === needed) return allBoxes;

  // Keep largest wide boxes first if too many (checkmarks and tiny artifacts filtered earlier).
  const ranked = [...allBoxes].sort((a, b) => {
    const sa = a.w * a.h;
    const sb = b.w * b.h;
    return sb - sa;
  });

  const picked = ranked.slice(0, needed).sort((a, b) => a.minY - b.minY || a.minX - b.minX);
  return picked;
}

async function fitManifest(fileName) {
  const full = path.join(DATA_DIR, fileName);
  const manifest = JSON.parse(await readFile(full, "utf8"));

  let changed = 0;

  for (const question of manifest.questions) {
    if (question.type !== "drag-drop") continue;
    const zones = question.interaction?.dropZones;
    if (!zones || zones.length === 0) continue;

    const pages = question.solutionPages;
    if (!pages || pages.length === 0) continue;

    // Most tasks are on first page of question. We'll detect from every page and assign in order.
    const pageBoxes = [];
    for (let pageOffset = 0; pageOffset < pages.length; pageOffset += 1) {
      const asset = pages[pageOffset];
      const filePath = path.join(PUBLIC_DIR, asset.replace(/^\//, ""));
      const png = await loadPng(filePath);
      const boxes = findConnectedBoxes(png)
        .filter((b) => b.minY < png.height * 0.88) // ignore very low area near footer
        .map((b) => ({ ...b, pageOffset, width: png.width, height: png.height }));
      for (const box of boxes) {
        pageBoxes.push(box);
      }
    }

    if (pageBoxes.length === 0) {
      // Keep existing values if detection fails.
      continue;
    }

    // Sort by page then top-to-bottom left-to-right.
    pageBoxes.sort((a, b) => a.pageOffset - b.pageOffset || a.minY - b.minY || a.minX - b.minX);

    const chosen = chooseBoxesForQuestion(pageBoxes, zones.length);
    if (chosen.length !== zones.length) {
      // fallback: leave as-is if mismatch
      continue;
    }

    zones.forEach((zone, i) => {
      const box = chosen[i];
      zone.pageIndex = box.pageOffset;
      zone.rect = normalizeBox(box, box.width, box.height);
      changed += 1;
    });
  }

  await writeFile(full, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  return changed;
}

async function main() {
  let total = 0;
  for (const fileName of manifestFiles) {
    const changed = await fitManifest(fileName);
    total += changed;
    console.log(`Updated ${changed} slots in ${fileName}`);
  }
  console.log(`Done. Updated ${total} slots total.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
