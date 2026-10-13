/** Runs `cb` once when `el` comes within `margin` of the viewport. Keeps setup work (SplitText, tweens) off the critical path. */
export function onNear(el: Element | null | undefined, cb: () => void, margin = "0px 0px 60% 0px") {
  if (!el) return () => {};
  const io = new IntersectionObserver(
    ([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      cb();
    },
    { rootMargin: margin },
  );
  io.observe(el);
  return () => io.disconnect();
}
