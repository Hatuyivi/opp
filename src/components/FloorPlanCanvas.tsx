import React, { useEffect, useRef } from "react";
import type { Room } from "../utils/roomDetector";

interface Props {
  imageDataUrl: string;
  rooms: Room[];
  selectedIds: Set<string>;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onToggle: (id: string) => void;
}

export function FloorPlanCanvas({
  imageDataUrl,
  rooms,
  selectedIds,
  hoveredId,
  onHover,
  onToggle,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Load image once
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      draw();
    };
    img.src = imageDataUrl;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageDataUrl]);

  // Redraw whenever state changes
  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms, selectedIds, hoveredId]);

  function draw() {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    const container = containerRef.current;
    if (!canvas || !img || !container) return;

    const W = container.clientWidth;
    const H = container.clientHeight;
    canvas.width = W;
    canvas.height = H;

    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, W, H);

    // Scale to fit
    const scale = Math.min(W / img.naturalWidth, H / img.naturalHeight);
    const offX = (W - img.naturalWidth * scale) / 2;
    const offY = (H - img.naturalHeight * scale) / 2;

    ctx.drawImage(img, offX, offY, img.naturalWidth * scale, img.naturalHeight * scale);

    // Draw polygons
    for (const room of rooms) {
      const isSelected = selectedIds.has(room.id);
      const isHovered = hoveredId === room.id;

      if (room.polygon.length < 3) continue;

      ctx.beginPath();
      room.polygon.forEach((p, i) => {
        const x = offX + p.x * img.naturalWidth * scale;
        const y = offY + p.y * img.naturalHeight * scale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();

      // Fill
      ctx.globalAlpha = isSelected ? (isHovered ? 0.55 : 0.4) : isHovered ? 0.25 : 0.1;
      ctx.fillStyle = room.color;
      ctx.fill();

      // Stroke
      ctx.globalAlpha = isSelected ? 1 : isHovered ? 0.8 : 0.3;
      ctx.strokeStyle = room.color;
      ctx.lineWidth = isHovered ? 3 : 2;
      ctx.stroke();

      ctx.globalAlpha = 1;

      // Label
      if (isSelected || isHovered) {
        const cx = offX + room.centroid.x * img.naturalWidth * scale;
        const cy = offY + room.centroid.y * img.naturalHeight * scale;

        ctx.font = `bold ${isHovered ? 13 : 11}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Background pill
        const text = room.label;
        const tw = ctx.measureText(text).width;
        const ph = 16, pw = tw + 12;
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.beginPath();
        ctx.roundRect(cx - pw / 2, cy - ph / 2, pw, ph, 4);
        ctx.fill();

        ctx.fillStyle = room.color;
        ctx.fillText(text, cx, cy);
      }
    }
  }

  // Hit test — find which room is under the mouse
  function roomAtPoint(mx: number, my: number): string | null {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    const container = containerRef.current;
    if (!canvas || !img || !container) return null;

    const W = container.clientWidth;
    const H = container.clientHeight;
    const scale = Math.min(W / img.naturalWidth, H / img.naturalHeight);
    const offX = (W - img.naturalWidth * scale) / 2;
    const offY = (H - img.naturalHeight * scale) / 2;

    const nx = (mx - offX) / (img.naturalWidth * scale);
    const ny = (my - offY) / (img.naturalHeight * scale);

    // Check in reverse order (topmost first = last drawn)
    for (let i = rooms.length - 1; i >= 0; i--) {
      const room = rooms[i];
      if (pointInPolygon(nx, ny, room.polygon)) return room.id;
    }
    return null;
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const id = roomAtPoint(e.clientX - rect.left, e.clientY - rect.top);
    onHover(id);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const id = roomAtPoint(e.clientX - rect.left, e.clientY - rect.top);
    if (id) onToggle(id);
  };

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => onHover(null)}
        onClick={handleClick}
      />
    </div>
  );
}

function pointInPolygon(
  x: number,
  y: number,
  polygon: Array<{ x: number; y: number }>
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
