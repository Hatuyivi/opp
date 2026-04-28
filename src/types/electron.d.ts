export {};

declare global {
  interface Window {
    electronAPI: {
      openImage: () => Promise<{ dataUrl: string; filePath: string } | null>;
      saveRooms: (
        svgContent: string,
        defaultName: string
      ) => Promise<{ success: boolean; filePath?: string; reason?: string }>;
      readLog: () => Promise<string>;
      clearLog: () => Promise<boolean>;
      writeLog: (level: string, message: string) => Promise<void>;
    };
  }
}
