"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";

/**
 * next/link that prefetches on intent (hover / focus / touch) instead of on viewport entry.
 * With ~a dozen nav/footer/"View all" links visible, viewport prefetching parsed every page's payload
 * during load and cost ~200 ms of main-thread time on mobile. Intent prefetch keeps navigation instant.
 */
export default function SmartLink({ href, onMouseEnter, onFocus, onTouchStart, ...rest }: ComponentProps<typeof Link> & { href: string }) {
  const router = useRouter();
  const warm = () => router.prefetch(href);
  return (
    <Link
      href={href}
      prefetch={false}
      onMouseEnter={(e) => (warm(), onMouseEnter?.(e))}
      onFocus={(e) => (warm(), onFocus?.(e))}
      onTouchStart={(e) => (warm(), onTouchStart?.(e))}
      {...rest}
    />
  );
}
