import React, { useRef, useState, useCallback } from "react";

interface Props {
  onFile: (dataUrl: string) => void;
  onOpenDialog: () => void;
}

export function DropZone({ onFile, onOpenDialog }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) onFile(e.target.result as string);
      };
      reader.readAsDataURL(file);
    },
    [onFile]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div
      className={`flex flex-col items-center justify-center gap-6 border-2 border-dashed rounded-2xl transition-all duration-200 h-full min-h-64 cursor-pointer
        ${dragging ? "border-blue-400 bg-blue-900/20" : "border-slate-600 bg-slate-800/40 hover:border-slate-400 hover:bg-slate-800/60"}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {/* Icon */}
      <div className={`p-5 rounded-full transition-colors ${dragging ? "bg-blue-500/20" : "bg-slate-700/60"}`}>
        <svg
          className={`w-12 h-12 ${dragging ? "text-blue-400" : "text-slate-400"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
          />
        </svg>
      </div>

      <div className="text-center px-6">
        <p className="text-slate-200 text-lg font-semibold mb-1">
          Перетащите планировку сюда
        </p>
        <p className="text-slate-400 text-sm mb-4">
          или выберите файл
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Выбрать файл
          </button>
          {/* Electron native dialog */}
          {typeof window !== "undefined" && (window as any).electronAPI && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenDialog();
              }}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Открыть диалог
            </button>
          )}
        </div>
        <p className="text-slate-500 text-xs mt-4">
          PNG, JPG, BMP, TIFF, WebP
        </p>
      </div>
    </div>
  );
}
