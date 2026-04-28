// ── Room Detector ─────────────────────────────────────────────────────────
// Pure canvas-based algorithm to detect enclosed rooms in a floor plan image.
// Steps:
//   1. Draw image to offscreen canvas
//   2. Convert to grayscale + threshold → binary (walls = black, rooms = white)
//   3. Flood-fill connected white regions → room blobs
//   4. Filter by min area, compute bounding polygon (convex hull)
//   5. Return Room objects with polygon coords normalised 0..1

export interface Room {
  id: string;
  label: string;
  area: number; // px²
  polygon: Array<{ x: number; y: number }>; // normalised 0..1
  color: string;
  centroid: { x: number; y: number };
}

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
  "#84cc16",
  "#06b6d4",
  "#a855f7",
  "#e11d48",
  "#0ea5e9",
  "#22c55e",
];

export async function detectRooms(
  dataUrl: string,
  onProgress?: (msg: string) => void
): Promise<Room[]> {
  const progress = (msg: string) => onProgress?.(msg);

  progress("Загрузка изображения…");
  const img = await loadImage(dataUrl);

  const W = img.naturalWidth;
  const H = img.naturalHeight;

  progress(`Размер: ${W}×${H}px. Конвертация в бинарное изображение…`);

  // ── Offscreen canvas ────────────────────────────────────────────────────
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, W, H);
  const data = imageData.data;

  // ── Grayscale + threshold ───────────────────────────────────────────────
  // Binary: 0 = wall/dark, 1 = open space/light
  const binary = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    binary[i] = gray > 180 ? 1 : 0;
  }

  // ── Flood fill to find connected regions ────────────────────────────────
  progress("Поиск замкнутых помещений (flood-fill)…");

  const visited = new Uint8Array(W * H);
  const rooms: Room[] = [];
  const MIN_AREA = (W * H) / 2000; // ignore tiny specks
  const MAX_AREA = (W * H) * 0.85; // ignore background

  let roomIndex = 0;

  for (let startY = 1; startY < H - 1; startY += 2) {
    for (let startX = 1; startX < W - 1; startX += 2) {
      const idx = startY * W + startX;
      if (binary[idx] !== 1 || visited[idx]) continue;

      // BFS flood fill
      const pixels: number[] = [];
      const queue: number[] = [idx];
      visited[idx] = 1;

      while (queue.length > 0) {
        const cur = queue.pop()!;
        pixels.push(cur);

        const x = cur % W;
        const y = Math.floor(cur / W);

        const neighbors = [
          cur - 1,
          cur + 1,
          cur - W,
          cur + W,
        ];

        for (const n of neighbors) {
          const nx = n % W;
          const ny = Math.floor(n / W);
          if (
            nx >= 0 &&
            nx < W &&
            ny >= 0 &&
            ny < H &&
            !visited[n] &&
            binary[n] === 1
          ) {
            // Check the pixel isn't just crossing a thin wall
            const dx = Math.abs(nx - x);
            const dy = Math.abs(ny - y);
            if (dx + dy <= 1) {
              visited[n] = 1;
              queue.push(n);
            }
          }
        }
      }

      const area = pixels.length;
      if (area < MIN_AREA || area > MAX_AREA) continue;

      // ── Compute bounding polygon ────────────────────────────────────────
      let sumX = 0, sumY = 0;
      let minX = W, maxX = 0, minY = H, maxY = 0;

      for (const p of pixels) {
        const px = p % W;
        const py = Math.floor(p / W);
        sumX += px;
        sumY += py;
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
      }

      const centroid = { x: sumX / pixels.length, y: sumY / pixels.length };

      // Build approximate polygon via extreme points at angles
      const polygon = buildPolygon(pixels, W, centroid);

      roomIndex++;
      const color = COLORS[(roomIndex - 1) % COLORS.length];

      rooms.push({
        id: `room-${roomIndex}`,
        label: `Помещение ${roomIndex}`,
        area,
        polygon: polygon.map((p) => ({ x: p.x / W, y: p.y / H })),
        color,
        centroid: { x: centroid.x / W, y: centroid.y / H },
      });
    }
  }

  // Sort largest first
  rooms.sort((a, b) => b.area - a.area);

  // Re-label after sort
  rooms.forEach((r, i) => {
    r.label = `Помещение ${i + 1}`;
    r.id = `room-${i + 1}`;
  });

  progress(`Найдено помещений: ${rooms.length}`);
  return rooms;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Build a simplified polygon by casting rays at N angles from centroid */
function buildPolygon(
  pixels: number[],
  W: number,
  centroid: { x: number; y: number }
): Array<{ x: number; y: number }> {
  const set = new Set(pixels);
  const ANGLES = 32;
  const points: Array<{ x: number; y: number }> = [];

  for (let i = 0; i < ANGLES; i++) {
    const angle = (i / ANGLES) * Math.PI * 2;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);

    let last = { x: centroid.x, y: centroid.y };
    for (let r = 0; r < 2000; r++) {
      const px = Math.round(centroid.x + dx * r);
      const py = Math.round(centroid.y + dy * r);
      const idx = py * W + px;
      if (!set.has(idx)) break;
      last = { x: px, y: py };
    }
    points.push(last);
  }

  return convexHull(points);
}

/** Graham scan convex hull */
function convexHull(
  points: Array<{ x: number; y: number }>
): Array<{ x: number; y: number }> {
  if (points.length < 3) return points;

  const sorted = [...points].sort((a, b) =>
    a.x !== b.x ? a.x - b.x : a.y - b.y
  );

  const cross = (
    o: { x: number; y: number },
    a: { x: number; y: number },
    b: { x: number; y: number }
  ) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const lower: Array<{ x: number; y: number }> = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0)
      lower.pop();
    lower.push(p);
  }

  const upper: Array<{ x: number; y: number }> = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0)
      upper.pop();
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  return [...lower, ...upper];
}

/** Generate SVG from selected rooms and original image dimensions */
export function generateSVG(
  rooms: Room[],
  selectedIds: Set<string>,
  imageWidth: number,
  imageHeight: number
): string {
  const selectedRooms = rooms.filter((r) => selectedIds.has(r.id));

  const polygons = selectedRooms
    .map((room) => {
      const points = room.polygon
        .map((p) => `${(p.x * imageWidth).toFixed(1)},${(p.y * imageHeight).toFixed(1)}`)
        .join(" ");
      return `  <polygon
    id="${room.id}"
    data-label="${room.label}"
    data-area="${room.area}"
    points="${points}"
    fill="${room.color}"
    fill-opacity="0.35"
    stroke="${room.color}"
    stroke-width="2"
  />`;
    })
    .join("\n");

  const labels = selectedRooms
    .map((room) => {
      const cx = (room.centroid.x * imageWidth).toFixed(1);
      const cy = (room.centroid.y * imageHeight).toFixed(1);
      return `  <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle"
    font-family="sans-serif" font-size="14" fill="${room.color}" font-weight="bold"
  >${room.label}</text>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
  width="${imageWidth}" height="${imageHeight}"
  viewBox="0 0 ${imageWidth} ${imageHeight}">
  <title>Floor Plan — Selected Rooms</title>
${polygons}
${labels}
</svg>`;
}

/** Generate JSON export */
export function generateJSON(
  rooms: Room[],
  selectedIds: Set<string>,
  imageWidth: number,
  imageHeight: number
): string {
  const selectedRooms = rooms.filter((r) => selectedIds.has(r.id));
  const output = selectedRooms.map((room) => ({
    id: room.id,
    label: room.label,
    area_px: room.area,
    color: room.color,
    centroid: {
      x: +(room.centroid.x * imageWidth).toFixed(2),
      y: +(room.centroid.y * imageHeight).toFixed(2),
    },
    polygon: room.polygon.map((p) => ({
      x: +(p.x * imageWidth).toFixed(2),
      y: +(p.y * imageHeight).toFixed(2),
    })),
  }));
  return JSON.stringify(output, null, 2);
}
