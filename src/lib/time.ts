/** "Now", "1 min", "12 min" until an ISO timestamp. Returns null if it's in the past. */
export function formatEta(iso: string, now: number = Date.now()): string | null {
  const seconds = (new Date(iso).getTime() - now) / 1000;
  if (seconds < -30) return null;
  if (seconds < 60) return 'Now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/** "just now", "15s ago", "3m ago". */
export function formatAgo(timestamp: number, now: number = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.floor(seconds / 60)}m ago`;
}
