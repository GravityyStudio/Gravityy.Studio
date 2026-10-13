import BrandMark from "./ui/BrandMark";

/** CSS-only logo preloader (<1s, first load only: it lives in the root layout). The wordmark is text so first
 * paint never waits on an image. Hidden under reduced motion. */
export default function Preloader() {
  return (
    <div className="preloader pointer-events-none fixed inset-0 z-[200] grid place-items-center bg-bg" aria-hidden="true">
      <div className="flex items-center gap-3">
        <BrandMark height={33} priority />
        <span className="text-xl font-semibold tracking-[-0.03em]">Gravityy Studio</span>
      </div>
    </div>
  );
}
