import { useEffect, useRef, useState } from "react";

export const reducedMotion = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** True once the page has scrolled past `px` (used to solidify the header). */
export function useScrolled(px = 24) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const f = () => setOn(window.scrollY > px);
    f();
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, [px]);
  return on;
}

/** Slides an image inside its frame slower than the page scrolls. Frame must clip (overflow-hidden). */
export function useParallax<T extends HTMLElement>(speed = 0.14) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    let raf = 0;
    const tick = () => {
      raf = 0;
      const box = (el.parentElement as HTMLElement).getBoundingClientRect();
      if (box.bottom < -100 || box.top > innerHeight + 100) return;
      const offset = (box.top + box.height / 2 - innerHeight / 2) * -speed;
      el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0) scale(1.18)`;
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(tick); };
    tick();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); cancelAnimationFrame(raf); };
  }, [speed]);
  return ref;
}

/** Words fill in from muted to ink as the paragraph scrolls through the screen. */
export function WordReveal({ text, className = "" }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const words = text.split(" ");
  const [lit, setLit] = useState(reducedMotion() ? words.length : 0);

  useEffect(() => {
    if (reducedMotion()) return;
    const f = () => {
      const r = ref.current!.getBoundingClientRect();
      const p = (innerHeight * 0.8 - r.top) / (r.height + innerHeight * 0.25);
      setLit(Math.round(Math.min(1, Math.max(0, p)) * words.length));
    };
    f();
    window.addEventListener("scroll", f, { passive: true });
    window.addEventListener("resize", f);
    return () => { window.removeEventListener("scroll", f); window.removeEventListener("resize", f); };
  }, [words.length]);

  return (
    <p ref={ref} className={className}>
      <span className="sr-only">{text}</span>
      {words.map((w, i) => (
        <span key={i} aria-hidden="true" className="transition-colors duration-300" style={{ color: i < lit ? "var(--color-ink)" : "rgb(11 47 54 / 0.45)" }}>
          {w}{" "}
        </span>
      ))}
    </p>
  );
}

/** Smooth height accordion body (no JS measuring: grid-template-rows 0fr to 1fr). */
export function Collapse({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
      <div className="overflow-hidden" inert={!open}>{children}</div>
    </div>
  );
}
