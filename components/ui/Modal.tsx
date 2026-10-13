"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, m } from "framer-motion";
import { X } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useUI } from "../Providers";
import { FM } from "@/lib/motion";

type Props = { open: boolean; onClose: () => void; labelledBy: string; children: ReactNode; className?: string; full?: boolean };

/** Accessible modal: focus-trapped, Esc/scrim to close, scroll locked, focus restored to opener. */
export default function Modal({ open, onClose, labelledBy, children, className = "", full }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { lockScroll } = useUI();
  useFocusTrap(ref, open, onClose);
  useEffect(() => {
    if (!open) return;
    lockScroll(true);
    return () => lockScroll(false);
  }, [open, lockScroll]);

  return (
    <AnimatePresence>
      {open && (
        <m.div key="modal" className="fixed inset-0 z-[150] grid place-items-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={FM.panel}>
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
          <m.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            className={`relative max-h-[calc(100svh-32px)] w-full overflow-auto overscroll-contain ${full ? "max-w-[1400px]" : "card max-w-[560px] p-6 sm:p-9"} ${className}`}
            initial={{ y: 24, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 12, scale: 0.98 }}
            transition={FM.panel}
            data-lenis-prevent
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className={`absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full border ${full ? "border-white/15 bg-black/50 text-white backdrop-blur-md" : "border-line"}`}
            >
              <X size={18} aria-hidden="true" />
            </button>
            {children}
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
