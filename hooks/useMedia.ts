"use client";
import { useSyncExternalStore } from "react";

/** matchMedia as a hook. Server snapshot = `fallback`. */
export function useMedia(query: string, fallback = false) {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => fallback,
  );
}
