import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PNG } from "pngjs";

const ROOT = "/Users/jacob/IN1010-web";
const DATA_DIR = path.join(ROOT, "src/data/exams");
const PUBLIC_DIR = path.join(ROOT, "public");

const MANIFEST_FILES = [
  "v24-midtveis.json",
  "v24-konte.json",
  "v24-prove.json",
  "v25-midtveis.json",
  "v25-konte.json",
];

const TABLE_SPECS = {
  "v24-prove:q02": {
    pageIndex: 0,
    rows: 9,
    cols: 2,
    minX: 0.5,
    correctColumnsByRow: [2, 2, 1, 1, 1, 2, 1, 2, 2],
    instructions: "Klikk i tabellen for hver rad og trykk Sjekk svar.",
  },
  "v24-midtveis:q02": {
    pageIndex: 0,
    rows: 10,
    cols: 2,
    minX: 0.47,
    correctColumnsByRow: [2, 1, 2, 2, 1, 1, 2, 1, 1, 1],
    instructions: "Klikk i tabellen for hver rad og trykk Sjekk svar.",
  },
  "v24-midtveis:q05": {
    pageIndex: 1,
    rows: 3,
    cols: 3,
    minX: 0.34,
    correctColumnsByRow: [1, 1, 2],
    instructions: "Marker riktig navn for hver rad og trykk Sjekk svar.",
  },
  "v24-midtveis:q10": {
    pageIndex: 1,
    rows: 10,
    cols: 2,
    minX: 0.5,
    correctColumnsByRow: [1, 1, 1, 1, 1, 2, 1, 1, 2, 2],
    instructions: "Marker OK eller Feil per linje og trykk Sjekk svar.",
  },
  "v24-konte:q11": {
    pageIndex: 1,
    rows: 15,
    cols: 2,
    minX: 0.5,
    correctColumnsByRow: [1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 2, 1, 1, 1, 2],
    instructions: "Marker OK eller Feil per linje og trykk Sjekk svar.",
  },
  "v25-midtveis:q02": {
    pageIndex: 0,
    rows: 10,
    cols: 2,
    minX: 0.5,
    correctColumnsByRow: [2, 2, 1, 1, 2, 2, 2, 2, 2, 1],
    instructions: "Klikk i tabellen for hver rad og trykk Sjekk svar.",
  },
  "v25-midtveis:q10": {
    pageIndex: 0,
    rows: 11,
    cols: 2,
    minX: 0.46,
    correctColumnsByRow: [1, 1, 1, 2, 2, 2, 1, 1, 1, 2, 1],
    instructions: "Marker om linjen er lovlig eller ikke og trykk Sjekk svar.",
  },
  "v25-konte:q04": {
    pageIndex: 0,
    rows: 10,
    cols: 3,
    minX: 0.47,
    minY: 0.4,
    correctColumnsByRow: [2, 3, 3, 2, 1, 1, 1, 3, 1, 3],
    instructions: "Marker riktig kolonne for hver kodelinje og trykk Sjekk svar.",
  },
  "v25-konte:q08": {
    pageIndex: 0,
    rows: 15,
    cols: 2,
    minX: 0.5,
    correctColumnsByRow: [1, 1, 2, 1, 1, 1, 2, 1, 2, 2, 1, 2, 2, 1, 1],
    instructions: "Marker OK eller Vil gi feil per linje og trykk Sjekk svar.",
  },
  "v25-konte:q10": {
    pageIndex: 0,
    rows: 10,
    cols: 2,
    minX: 0.5,
    correctColumnsByRow: [1, 2, 1, 1, 1, 2, 2, 1, 2, 2],
    instructions: "Klikk i tabellen for hver rad og trykk Sjekk svar.",
  },
};

const CHECKBOX_SPECS = {
  "v25-midtveis:q06": {
    pageIndex: 0,
    rows: 15,
    maxX: 0.18,
    correctRows: [2, 6, 11, 13],
    instructions: "Marker linjene som inneholder feil og trykk Sjekk svar.",
  },
};

const TEXT_SPECS = {
  "v24-midtveis:q04": {
    answers: ["7", "8", "10", "6"],
    regions: [{ pageIndex: 0, minY: 0.62 }],
    instructions: "Skriv svarene i feltene og trykk Sjekk svar.",
  },
  "v24-midtveis:q06": {
    answers: ["3320", "4210", "5400"],
    regions: [{ pageIndex: 2, minY: 0.1 }],
    instructions: "Skriv tallverdiene i feltene og trykk Sjekk svar.",
  },
  "v24-midtveis:q07": {
    answers: ["1", "2", "4", "3"],
    regions: [{ pageIndex: 0, minY: 0.62 }],
    instructions: "Skriv tallverdiene i feltene og trykk Sjekk svar.",
  },
  "v24-midtveis:q09": {
    answers: ["6", "3", "7", "7", "6", "12", "40", "20"],
    regions: [{ pageIndex: 1, minY: 0.05 }],
    instructions: "Skriv de åtte verdiene i feltene og trykk Sjekk svar.",
  },
  "v24-konte:q08": {
    answers: ["19", "24", "32", "13", "17"],
    regions: [{ pageIndex: 0, minY: 0.62 }],
    instructions: "Skriv tallene i feltene og trykk Sjekk svar.",
  },
  "v24-konte:q10": {
    answers: ["1000", "320", "480", "2000", "180"],
    regions: [
      { pageIndex: 0, minY: 0.75 },
      { pageIndex: 1, minY: 0 },
    ],
    instructions: "Skriv internprisene i feltene og trykk Sjekk svar.",
  },
  "v25-konte:q03": {
    answers: ["2", "5", "6", "6", "5", "10", "25", "15"],
    regions: [{ pageIndex: 0, minY: 0.1 }],
    instructions: "Skriv de åtte utskriftene i feltene og trykk Sjekk svar.",
  },
  "v25-midtveis:q01": {
    answers: ["0", "1", "1", "2", "3", "5", "8", "13"],
    regions: [{ pageIndex: 0, minY: 0.56 }],
    instructions: "Skriv de åtte tallene i feltene og trykk Sjekk svar.",
  },
  "v25-midtveis:q08": {
    answers: ["3", "1", "3", "2", "3", "2", "2", "2"],
    regions: [{ pageIndex: 0, minY: 0.1 }],
    instructions: "Skriv verdiene i feltene og trykk Sjekk svar.",
  },
  "v25-midtveis:q11": {
    answers: ["8000", "2500", "3200", "100", "1100", "10", "20", "0"],
    regions: [{ pageIndex: 0, minY: 0.1 }],
    instructions: "Skriv pris/lengde-verdiene i feltene og trykk Sjekk svar.",
  },
};

const DRAG_SPECS = {
  "v24-konte:q01": {
    allowItemReuse: false,
    instructions: "Dra riktig kodelinje inn i hvert tomrom og trykk Sjekk svar.",
    draggableItems: [
      { id: "q01_tv_pos", label: "taVare = pos;" },
      { id: "q01_return_tv", label: "return taVare;" },
      { id: "q01_tallpos_tv", label: "tall[pos] = taVare;" },
      { id: "q01_tallny_tv", label: "tall[ny] = taVare;" },
      { id: "q01_tv_ny", label: "taVare = ny;" },
      { id: "q01_int_tv_tall", label: "int taVare = tall;" },
      { id: "q01_return_pos", label: "return pos;" },
      { id: "q01_return_ny", label: "return ny;" },
      { id: "q01_int_tv_tallpos", label: "int taVare = tall[pos];" },
      { id: "q01_int_tv_pos", label: "int taVare = pos;" },
      { id: "q01_int_tv", label: "int taVare;" },
      { id: "q01_return_tallpos", label: "return tall[pos];" },
      { id: "q01_tallpos_ny", label: "tall[pos] = ny;" },
    ],
    dropZones: [
      { id: "q01_slot_1", label: "Plass 1", accepts: ["q01_int_tv_tallpos"] },
      { id: "q01_slot_2", label: "Plass 2", accepts: ["q01_tallpos_ny"] },
      { id: "q01_slot_3", label: "Plass 3", accepts: ["q01_return_tv"] },
    ],
  },
  "v25-konte:q01": {
    allowItemReuse: false,
    instructions: "Dra riktig kodelinje inn i hvert tomrom og trykk Sjekk svar.",
    draggableItems: [
      { id: "q01_return_tallpos", label: "return tall[pos];" },
      { id: "q01_int_tv_tall", label: "int taVare = tall;" },
      { id: "q01_return_pos", label: "return pos;" },
      { id: "q01_int_tv", label: "int taVare;" },
      { id: "q01_tallpos_tv", label: "tall[pos] = taVare;" },
      { id: "q01_int_tv_tallpos", label: "int taVare = tall[pos];" },
      { id: "q01_tallny_tv", label: "tall[ny] = taVare;" },
      { id: "q01_return_tv", label: "return taVare;" },
      { id: "q01_return_ny", label: "return ny;" },
      { id: "q01_tv_pos", label: "taVare = pos;" },
      { id: "q01_int_tv_pos", label: "int taVare = pos;" },
      { id: "q01_tv_ny", label: "taVare = ny;" },
      { id: "q01_tallpos_ny", label: "tall[pos] = ny;" },
    ],
    dropZones: [
      { id: "q01_slot_1", label: "Plass 1", accepts: ["q01_int_tv_tallpos"] },
      { id: "q01_slot_2", label: "Plass 2", accepts: ["q01_tallpos_ny"] },
      { id: "q01_slot_3", label: "Plass 3", accepts: ["q01_return_tv"] },
    ],
  },
  "v24-konte:q04": {
    allowItemReuse: true,
    instructions: "Dra hestenavnene inn i feltene og trykk Sjekk svar.",
    draggableItems: [
      { id: "h_trofast", label: "Trofast" },
      { id: "h_slitern", label: "Slitern" },
      { id: "h_svarten", label: "Svarten" },
      { id: "h_blakken", label: "Blakken" },
    ],
    dropZones: [
      { id: "q04_slot_1", label: "Ole", accepts: ["h_slitern"] },
      { id: "q04_slot_2", label: "Per", accepts: ["h_svarten"] },
      { id: "q04_slot_3", label: "Anne", accepts: ["h_blakken"] },
      { id: "q04_slot_4", label: "Linda", accepts: ["h_svarten"] },
      { id: "q04_slot_5", label: "Trine", accepts: ["h_trofast"] },
    ],
  },
  "v25-midtveis:q05": {
    allowItemReuse: true,
    instructions: "Dra registreringsnumrene inn i feltene og trykk Sjekk svar.",
    draggableItems: [
      { id: "reg_el", label: "EL66654" },
      { id: "reg_eb", label: "EB65432" },
      { id: "reg_ek", label: "EK34561" },
      { id: "reg_dl", label: "DL23145" },
    ],
    dropZones: [
      { id: "q05_slot_1", label: "Ole", accepts: ["reg_el"] },
      { id: "q05_slot_2", label: "Per", accepts: ["reg_dl"] },
      { id: "q05_slot_3", label: "Anne", accepts: ["reg_ek"] },
      { id: "q05_slot_4", label: "Linda", accepts: ["reg_dl"] },
      { id: "q05_slot_5", label: "Trine", accepts: ["reg_eb"] },
    ],
  },
  "v25-midtveis:q07": {
    allowItemReuse: true,
    instructions: "Dra navnene inn i feltene og trykk Sjekk svar.",
    draggableItems: [
      { id: "name_carsten", label: "Carsten" },
      { id: "name_puck", label: "Puck" },
      { id: "name_anne", label: "Anne" },
      { id: "name_kine", label: "Kine" },
      { id: "name_jabben", label: "Jabben" },
      { id: "name_eva", label: "Eva" },
      { id: "name_kalle", label: "Kalle" },
    ],
    dropZones: [
      { id: "q07_slot_1", label: "Kanin 7", accepts: ["name_kalle"] },
      { id: "q07_slot_2", label: "Kanin 8", accepts: ["name_carsten"] },
      { id: "q07_slot_3", label: "Kanin 9", accepts: ["name_kine"] },
      { id: "q07_slot_4", label: "Kanin 10", accepts: ["name_carsten"] },
      { id: "q07_slot_5", label: "Kanin 11", accepts: ["name_jabben"] },
      { id: "q07_slot_6", label: "Kanin 12", accepts: ["name_eva"] },
    ],
  },
};

async function loadPng(assetPath) {
  const fullPath = path.join(PUBLIC_DIR, assetPath.replace(/^\//, ""));
  const raw = await readFile(fullPath);
  return PNG.sync.read(raw);
}

function clamp(value, min, max) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function normalizeRect(xPx, yPx, wPx, hPx, width, height) {
  const x = clamp(xPx, 0, width - 1);
  const y = clamp(yPx, 0, height - 1);
  const w = clamp(wPx, 1, width - x);
  const h = clamp(hPx, 1, height - y);

  return {
    x: Number((x / width).toFixed(4)),
    y: Number((y / height).toFixed(4)),
    w: Number((w / width).toFixed(4)),
    h: Number((h / height).toFixed(4)),
  };
}

function connectedComponents(png, isPixelMatch) {
  const { width, height, data } = png;
  const visited = new Uint8Array(width * height);
  const components = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const start = y * width + x;
      if (visited[start]) continue;

      const startOffset = start * 4;
      if (
        !isPixelMatch(
          data[startOffset],
          data[startOffset + 1],
          data[startOffset + 2],
          data[startOffset + 3]
        )
      ) {
        visited[start] = 1;
        continue;
      }

      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let count = 0;
      const queue = [start];
      visited[start] = 1;

      while (queue.length > 0) {
        const idx = queue.pop();
        count += 1;

        const cy = Math.floor(idx / width);
        const cx = idx - cy * width;

        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        const neighbors = [idx - 1, idx + 1, idx - width, idx + width];
        for (const next of neighbors) {
          if (next < 0 || next >= width * height || visited[next]) continue;

          const ny = Math.floor(next / width);
          const nx = next - ny * width;
          if (Math.abs(nx - cx) + Math.abs(ny - cy) !== 1) continue;

          visited[next] = 1;
          const offset = next * 4;
          if (
            isPixelMatch(
              data[offset],
              data[offset + 1],
              data[offset + 2],
              data[offset + 3]
            )
          ) {
            queue.push(next);
          }
        }
      }

      const w = maxX - minX + 1;
      const h = maxY - minY + 1;
      components.push({ minX, minY, maxX, maxY, w, h, count });
    }
  }

  return components;
}

function dedupeByCenter(components, tolerance = 4) {
  const sorted = [...components].sort((a, b) => a.cy - b.cy || a.cx - b.cx);
  const deduped = [];

  for (const comp of sorted) {
    const existing = deduped.find(
      (entry) =>
        Math.abs(entry.cx - comp.cx) <= tolerance && Math.abs(entry.cy - comp.cy) <= tolerance
    );

    if (!existing) {
      deduped.push(comp);
    }
  }

  return deduped;
}

function isCircleStroke(r, g, b, a) {
  if (a < 120) return false;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max - min > 24) return false;
  return r >= 130 && r <= 240;
}

function detectCircles(png) {
  const circles = connectedComponents(png, isCircleStroke)
    .filter((comp) => {
      const fill = comp.count / (comp.w * comp.h);
      return (
        comp.w >= 10 &&
        comp.w <= 36 &&
        comp.h >= 10 &&
        comp.h <= 36 &&
        Math.abs(comp.w - comp.h) <= 8 &&
        comp.count >= 22 &&
        comp.count <= 700 &&
        fill > 0.08 &&
        fill < 0.6
      );
    })
    .map((comp) => ({
      ...comp,
      cx: (comp.minX + comp.maxX) / 2,
      cy: (comp.minY + comp.maxY) / 2,
    }));

  return dedupeByCenter(circles);
}

function isNeutralGray(r, g, b, a) {
  if (a < 110) return false;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max - min > 18) return false;
  return r >= 130 && r <= 235;
}

function detectSmallSquares(png) {
  const boxes = connectedComponents(png, isNeutralGray)
    .filter((comp) => {
      const fill = comp.count / (comp.w * comp.h);
      return (
        comp.w >= 12 &&
        comp.w <= 30 &&
        comp.h >= 12 &&
        comp.h <= 30 &&
        Math.abs(comp.w - comp.h) <= 4 &&
        comp.count >= 20 &&
        fill > 0.12 &&
        fill < 0.55
      );
    })
    .map((comp) => ({
      ...comp,
      cx: (comp.minX + comp.maxX) / 2,
      cy: (comp.minY + comp.maxY) / 2,
    }));

  return dedupeByCenter(boxes);
}

function isGreen(r, g, b, a) {
  return a > 90 && g > 80 && g > r + 8 && g > b + 8;
}

function detectGreenTextTokens(png) {
  const components = connectedComponents(png, isGreen)
    .filter((comp) => comp.count >= 6 && comp.w >= 2 && comp.h >= 4 && comp.w <= 220 && comp.h <= 60)
    .map((comp) => ({
      ...comp,
      cx: (comp.minX + comp.maxX) / 2,
      cy: (comp.minY + comp.maxY) / 2,
    }))
    .sort((a, b) => a.cy - b.cy || a.cx - b.cx);

  const lines = [];
  for (const comp of components) {
    const line = lines.find((entry) => Math.abs(entry.cy - comp.cy) <= 12);
    if (!line) {
      lines.push({ cy: comp.cy, items: [comp] });
      continue;
    }
    line.items.push(comp);
    line.cy =
      line.items.reduce((sum, item) => sum + item.cy, 0) /
      line.items.length;
  }

  const merged = [];

  lines
    .sort((a, b) => a.cy - b.cy)
    .forEach((line) => {
      const sorted = line.items.sort((a, b) => a.minX - b.minX);
      let current = null;

      for (const comp of sorted) {
        if (!current) {
          current = { ...comp };
          continue;
        }

        if (comp.minX - current.maxX <= 12) {
          current.minX = Math.min(current.minX, comp.minX);
          current.maxX = Math.max(current.maxX, comp.maxX);
          current.minY = Math.min(current.minY, comp.minY);
          current.maxY = Math.max(current.maxY, comp.maxY);
          current.w = current.maxX - current.minX + 1;
          current.h = current.maxY - current.minY + 1;
          current.count += comp.count;
          current.cx = (current.minX + current.maxX) / 2;
          current.cy = (current.minY + current.maxY) / 2;
        } else {
          merged.push(current);
          current = { ...comp };
        }
      }

      if (current) {
        merged.push(current);
      }
    });

  return merged
    .filter((token) => token.w >= 8 && token.h >= 8)
    .sort((a, b) => a.cy - b.cy || a.minX - b.minX);
}

function groupRowsByY(items, threshold = 20) {
  const rows = [];

  for (const item of [...items].sort((a, b) => a.cy - b.cy || a.cx - b.cx)) {
    const existing = rows.find((row) => Math.abs(row.avgY - item.cy) <= threshold);
    if (!existing) {
      rows.push({ avgY: item.cy, items: [item] });
      continue;
    }

    existing.items.push(item);
    existing.avgY =
      existing.items.reduce((sum, entry) => sum + entry.cy, 0) /
      existing.items.length;
  }

  return rows
    .sort((a, b) => a.avgY - b.avgY)
    .map((row) => row.items.sort((a, b) => a.cx - b.cx));
}

function inflateRectFromShape(shape, width, height, scaleX = 2.6, scaleY = 2.6) {
  const w = shape.w * scaleX;
  const h = shape.h * scaleY;
  const x = shape.cx - w / 2;
  const y = shape.cy - h / 2;
  return normalizeRect(x, y, w, h, width, height);
}

function buildCircleTableZones(question, spec) {
  const asset = question.promptPages[spec.pageIndex];
  if (!asset) {
    throw new Error(`${question.id}: missing prompt page ${spec.pageIndex}`);
  }

  return loadPng(asset).then((png) => {
    const circles = detectCircles(png).filter(
      (circle) =>
        circle.cx >= png.width * spec.minX &&
        circle.cy >= png.height * (spec.minY ?? 0)
    );
    const rows = groupRowsByY(circles, 20)
      .filter((row) => row.length >= spec.cols)
      .slice(0, spec.rows)
      .map((row) => row.slice(0, spec.cols));

    if (rows.length !== spec.rows) {
      throw new Error(
        `${question.id}: expected ${spec.rows} rows with ${spec.cols} columns, got ${rows.length}`
      );
    }

    return rows.flatMap((row, rowIndex) => {
      const expectedCol = spec.correctColumnsByRow[rowIndex];
      if (!expectedCol) {
        throw new Error(`${question.id}: missing fasit column for row ${rowIndex + 1}`);
      }

      return row.map((circle, colIndex) => {
        return {
          id: `${question.id}-r${rowIndex + 1}-c${colIndex + 1}`,
          kind: "circle",
          group: `${question.id}-r${rowIndex + 1}`,
          pageIndex: spec.pageIndex,
          rect: inflateRectFromShape(circle, png.width, png.height, 2.9, 2.9),
          correct: expectedCol === colIndex + 1,
        };
      });
    });
  });
}

function buildCheckboxZones(question, spec) {
  const asset = question.promptPages[spec.pageIndex];
  if (!asset) {
    throw new Error(`${question.id}: missing prompt page ${spec.pageIndex}`);
  }

  return loadPng(asset).then((png) => {
    const squares = detectSmallSquares(png)
      .filter((square) => square.cx <= png.width * spec.maxX)
      .sort((a, b) => a.cy - b.cy || a.cx - b.cx)
      .slice(0, spec.rows);

    if (squares.length !== spec.rows) {
      throw new Error(`${question.id}: expected ${spec.rows} checkboxes, got ${squares.length}`);
    }

    const correctRows = new Set(spec.correctRows);
    return squares.map((square, index) => ({
      id: `${question.id}-box-${index + 1}`,
      kind: "box",
      pageIndex: spec.pageIndex,
      rect: inflateRectFromShape(square, png.width, png.height, 2.2, 2.2),
      correct: correctRows.has(index + 1),
    }));
  });
}

function inferTextRectFromToken(token, width, height) {
  const tokenW = token.maxX - token.minX + 1;
  const tokenH = token.maxY - token.minY + 1;
  const boxW = clamp(Math.max(tokenW * 1.25, tokenH * 2.1), 44, 125);
  const boxH = clamp(tokenH * 1.85, 22, 40);
  const x = token.minX - boxW - 8;
  const y = token.cy - boxH / 2;

  return normalizeRect(x, y, boxW, boxH, width, height);
}

async function buildTextZones(question, spec) {
  const tokens = [];

  for (const region of spec.regions) {
    const asset = question.solutionPages[region.pageIndex];
    if (!asset) {
      throw new Error(`${question.id}: missing solution page ${region.pageIndex}`);
    }

    const png = await loadPng(asset);
    const pageTokens = detectGreenTextTokens(png)
      .filter((token) => token.cy >= png.height * region.minY)
      .filter((token) => (region.maxY ? token.cy <= png.height * region.maxY : true))
      .map((token) => ({
        pageIndex: region.pageIndex,
        rect: inferTextRectFromToken(token, png.width, png.height),
        sortY: token.cy,
        sortX: token.minX,
      }));

    tokens.push(...pageTokens);
  }

  const ordered = tokens.sort(
    (a, b) => a.pageIndex - b.pageIndex || a.sortY - b.sortY || a.sortX - b.sortX
  );

  if (ordered.length !== spec.answers.length) {
    throw new Error(
      `${question.id}: expected ${spec.answers.length} answer tokens, found ${ordered.length}`
    );
  }

  return ordered.map((entry, index) => ({
    id: `${question.id}-text-${index + 1}`,
    kind: "text",
    pageIndex: entry.pageIndex,
    rect: entry.rect,
    answer: spec.answers[index],
  }));
}

function getQuestion(manifest, questionId) {
  const question = manifest.questions.find((entry) => entry.id === questionId);
  if (!question) {
    throw new Error(`${manifest.id}: missing question ${questionId}`);
  }
  return question;
}

function applyDragSpec(manifest, questionId, spec) {
  const question = getQuestion(manifest, questionId);
  question.type = "drag-drop";
  question.interaction = {
    checkMode: "auto",
    instructions: spec.instructions,
    allowItemReuse: spec.allowItemReuse,
    draggableItems: spec.draggableItems,
    dropZones: spec.dropZones,
  };
}

async function applyTableSpec(manifest, questionId, spec) {
  const question = getQuestion(manifest, questionId);
  const zones = await buildCircleTableZones(question, spec);
  question.type = "choice-grid";
  question.interaction = {
    checkMode: "auto",
    instructions: spec.instructions,
    choiceZones: zones,
  };
}

async function applyCheckboxSpec(manifest, questionId, spec) {
  const question = getQuestion(manifest, questionId);
  const zones = await buildCheckboxZones(question, spec);
  question.type = "choice-grid";
  question.interaction = {
    checkMode: "auto",
    instructions: spec.instructions,
    choiceZones: zones,
  };
}

async function applyTextSpec(manifest, questionId, spec) {
  const question = getQuestion(manifest, questionId);
  const zones = await buildTextZones(question, spec);
  question.type = "choice-grid";
  question.interaction = {
    checkMode: "auto",
    instructions: spec.instructions,
    choiceZones: zones,
  };
}

async function main() {
  for (const fileName of MANIFEST_FILES) {
    const fullPath = path.join(DATA_DIR, fileName);
    const manifest = JSON.parse(await readFile(fullPath, "utf8"));

    for (const [key, spec] of Object.entries(DRAG_SPECS)) {
      const [examId, questionId] = key.split(":");
      if (examId !== manifest.id) continue;
      applyDragSpec(manifest, questionId, spec);
    }

    for (const [key, spec] of Object.entries(TABLE_SPECS)) {
      const [examId, questionId] = key.split(":");
      if (examId !== manifest.id) continue;
      await applyTableSpec(manifest, questionId, spec);
    }

    for (const [key, spec] of Object.entries(CHECKBOX_SPECS)) {
      const [examId, questionId] = key.split(":");
      if (examId !== manifest.id) continue;
      await applyCheckboxSpec(manifest, questionId, spec);
    }

    for (const [key, spec] of Object.entries(TEXT_SPECS)) {
      const [examId, questionId] = key.split(":");
      if (examId !== manifest.id) continue;
      await applyTextSpec(manifest, questionId, spec);
    }

    await writeFile(fullPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
    console.log(`Updated ${fullPath}`);
  }

  console.log("Applied interactivity updates to all manifests.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
