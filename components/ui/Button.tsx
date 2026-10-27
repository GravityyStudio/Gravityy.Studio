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
  loading?: boolean;
  className?: string;
  external?: boolean;
};

const STYLES: Record<Variant, string> = {
  primary: "bg-fg text-bg hover:bg-fg/85",
  accent: "bg-accent text-on-accent hover:brightness-110",
  ghost: "text-fg hairline hover:bg-fg/[0.06]",
};

/**
 * Pill button, 48px tall (≥44px target). States: default; hover = in-place colour shift + 1.03 scale; focus-visible =
 * the global accent ring; active = 0.98; disabled = 40% and inert to the pointer; loading = spinner, aria-busy and
 * blocked clicks. Keyboard: Enter/Space (native). Touch: no hover dependency. Reduced motion keeps only the colour.
 */
export default function Button({ children, variant = "primary", href, onClick, type = "button", disabled, loading, className = "", external }: Props) {
  const cls = `inline-flex min-h-[48px] items-center justify-center gap-2 rounded-pill px-6 text-[15px] font-semibold tracking-[-0.01em] transition-[transform,background-color,filter,opacity] duration-200 ease-[cubic-bezier(.22,1,.36,1)] hover:scale-[1.03] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 aria-busy:pointer-events-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100 ${STYLES[variant]} ${className}`;
  const body = (
    <>
      {loading && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />}
      {children}
    </>
  );

  // Internal routes → client-side navigation (no full reload).
  if (href?.startsWith("/"))
    return (
      <Link href={href} className={cls} onClick={onClick}>
        {body}
      </Link>
    );
  if (href)
    return (
      <a href={href} className={cls} onClick={onClick} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
        {body}
      </a>
    );
  return (
    <button type={type} onClick={onClick} disabled={disabled} aria-busy={loading || undefined} className={cls}>
      {body}
    </button>
  );
}
