import { useState, useEffect } from "react";

type Listener = () => void;
const listeners: Listener[] = [];

export function useRefreshSignal(callback?: Listener) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const listener = callback || (() => setTick((t) => t + 1));
    listeners.push(listener);
    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) listeners.splice(index, 1);
    };
  }, [callback]);

  const trigger = () => listeners.forEach((l) => l());
  return trigger;
}
