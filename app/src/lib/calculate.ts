const LISTEN_WPM = 150;
const READ_WPM = 240;

export function calculateDurations(content: string): { listenMin: number; readMin: number } {
  const words = content.split(/\s+/).length;
  return {
    listenMin: Math.max(1, Math.ceil(words / LISTEN_WPM)),
    readMin: Math.max(1, Math.ceil(words / READ_WPM)),
  };
}
