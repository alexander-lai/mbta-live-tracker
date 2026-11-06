import { useEffect, useRef, useState } from 'react';

interface PollState<T> {
  key: string | null;
  data?: T;
  error?: string;
  updatedAt?: number;
}

/**
 * Fetches `fn` whenever `key` changes, then re-fetches every `intervalMs`
 * (0 = fetch once). Pauses while the tab is hidden to save API quota, and
 * ignores responses that arrive after the key has changed (no stale data
 * from the previously selected route flashing on screen).
 */
export function usePolling<T>(key: string | null, fn: () => Promise<T>, intervalMs: number) {
  const [state, setState] = useState<PollState<T>>({ key });
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    let timer: number | undefined;
    setState({ key });

    const tick = async () => {
      if (!document.hidden || intervalMs === 0) {
        try {
          const data = await fnRef.current();
          if (!cancelled) setState({ key, data, updatedAt: Date.now() });
        } catch (e) {
          if (!cancelled) setState((s) => ({ ...s, key, error: (e as Error).message }));
        }
      }
      if (!cancelled && intervalMs > 0) timer = window.setTimeout(tick, intervalMs);
    };

    const onVisible = () => {
      if (!document.hidden && intervalMs > 0) {
        clearTimeout(timer);
        tick();
      }
    };

    tick();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [key, intervalMs]);

  const current = state.key === key;
  return {
    data: current ? state.data : undefined,
    error: current ? state.error : undefined,
    updatedAt: current ? state.updatedAt : undefined,
    loading: current && !state.data && !state.error,
  };
}

/** Re-renders every `ms` so relative times ("3 min", "10s ago") stay fresh. */
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}
