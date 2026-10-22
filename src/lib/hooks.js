import { useEffect, useState } from 'react';

/** Re-renderiza a cada `ms` e devolve o horário atual. */
export function useNow(ms = 1000, enabled = true) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!enabled) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms, enabled]);
  return now;
}
