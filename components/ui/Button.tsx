import type { ReactNode, MouseEvent } from "react";
import Link from "@/components/ui/SmartLink";

type Variant = "primary" | "accent" | "ghost";
type Props = {
  children: ReactNode;
  variant?: Variant;
  href?: string;
  onClick?: (e: MouseEvent) => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
  external?: boolean;
};

const STYLES: Record<Variant, string> = {
  primary: "bg-fg text-bg hover:bg-fg/85",
  accent: "bg-accent text-bg hover:brightness-110",
  ghost: "border border-line-strong text-fg hover:border-fg/60 hover:bg-fg/[0.06]",
};

/**
 * Pill button. Stays in place: hover is an in-place colour shift + a 1.03 scale from the centre (0.2s), press
 * settles to 0.98. No pointer-follow or layout movement; reduced motion keeps only the colour change.
 */
export default function Button({ children, variant = "primary", href, onClick, type = "button", disabled, className = "", external }: Props) {
  const cls = `inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full px-6 text-[15px] font-medium tracking-[-0.01em] transition-[transform,background-color,border-color,filter,opacity] duration-200 ease-out hover:scale-[1.03] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 motion-reduce:hover:scale-100 motion-reduce:active:scale-100 ${STYLES[variant]} ${className}`;

  // Internal routes → client-side navigation (no full reload).
  if (href?.startsWith("/"))
    return (
      <Link href={href} className={cls} onClick={onClick}>
        {children}
      </Link>
    );
  if (href)
    return (
      <a href={href} className={cls} onClick={onClick} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
        {children}
      </a>
    );
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}
