"use client";
import { useRef, type ReactNode, type PointerEvent } from "react";
import { MOTION } from "@/lib/motion";

/** CSS-perspective tilt (±8°) on fine pointers. Pure CSS vars, no re-renders; reduced motion disables it in CSS. */
export default function Tilt({ children, className = "", as: Tag = "div", ...rest }: { children: ReactNode; className?: string; as?: "div" | "article" | "li" } & Record<string, unknown>) {
  const ref = useRef<HTMLElement>(null);
  const move = (e: PointerEvent) => {
    if (e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ref.current.style.setProperty("--rx", `${(-py * MOTION.tilt * 2).toFixed(2)}deg`);
    ref.current.style.setProperty("--ry", `${(px * MOTION.tilt * 2).toFixed(2)}deg`);
  };
  const leave = () => {
    ref.current?.style.setProperty("--rx", "0deg");
    ref.current?.style.setProperty("--ry", "0deg");
  };
  return (
    // @ts-expect-error polymorphic ref is fine for these block elements
    <Tag ref={ref} onPointerMove={move} onPointerLeave={leave} className={`tilt ${className}`} {...rest}>
      {children}
    </Tag>
  );
}
