import React from "react";
import type { Room } from "../utils/roomDetector";

interface Props {
  rooms: Room[];
  selectedIds: Set<string>;
  hoveredId: string | null;
  onToggle: (id: string) => void;
  onHover: (id: string | null) => void;
  onToggleAll: (select: boolean) => void;
}

export function RoomList({
  rooms,
  selectedIds,
  hoveredId,
  onToggle,
  onHover,
  onToggleAll,
}: Props) {
  const allSelected = rooms.length > 0 && selectedIds.size === rooms.length;
  const noneSelected = selectedIds.size === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-slate-300 text-sm font-semibold tracking-wide uppercase">
          Помещения ({rooms.length})
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => onToggleAll(true)}
            disabled={allSelected}
            className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Все
          </button>
          <button
            onClick={() => onToggleAll(false)}
            disabled={noneSelected}
            className="text-xs px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Сбросить
          </button>
        </div>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
        {rooms.map((room) => {
          const selected = selectedIds.has(room.id);
          const hovered = hoveredId === room.id;

          return (
            <div
              key={room.id}
              onMouseEnter={() => onHover(room.id)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onToggle(room.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 border
                ${hovered ? "bg-slate-700/80 border-slate-500" : "bg-slate-800/50 border-transparent hover:bg-slate-700/50 hover:border-slate-600"}`}
            >
              {/* Color swatch */}
              <div
                className="w-3 h-3 rounded-full flex-shrink-0 transition-all"
                style={{
                  backgroundColor: room.color,
                  boxShadow: selected ? `0 0 0 2px #1e293b, 0 0 0 4px ${room.color}` : "none",
                }}
              />

              {/* Checkbox */}
              <div
                className={`w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center transition-all ${
                  selected
                    ? "border-transparent"
                    : "border-slate-500 bg-transparent"
                }`}
                style={selected ? { backgroundColor: room.color, borderColor: room.color } : {}}
              >
                {selected && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>

              {/* Name */}
              <span
                className={`text-sm flex-1 transition-colors ${
                  selected ? "text-slate-100 font-medium" : "text-slate-400"
                }`}
              >
                {room.label}
              </span>

              {/* Area badge */}
              <span className="text-xs text-slate-500 tabular-nums flex-shrink-0">
                {formatArea(room.area)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Selection summary */}
      {rooms.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-700/60 px-1">
          <p className="text-xs text-slate-500">
            Выбрано:{" "}
            <span className="text-slate-300 font-medium">{selectedIds.size}</span>{" "}
            из {rooms.length}
          </p>
        </div>
      )}
    </div>
  );
}

function formatArea(areaPx: number): string {
  if (areaPx >= 1_000_000) return `${(areaPx / 1_000_000).toFixed(1)}M px²`;
  if (areaPx >= 1000) return `${(areaPx / 1000).toFixed(1)}K px²`;
  return `${areaPx} px²`;
}
