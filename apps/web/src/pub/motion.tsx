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
        <span key={i} aria-hidden="true" className="transition-colors duration-300" style={{ color: i < lit ? "var(--color-ink)" : "rgb(31 38 28 / 0.45)" }}>
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

/** Fades a block up once when it scrolls into view. */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { el.classList.add("in"); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting || e.boundingClientRect.top < 0) { el.classList.add("in"); io.disconnect(); } }, { threshold: 0.08 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

/** Subtle 3D tilt toward the pointer (mouse only). Returns ref + handlers. */
export function useTilt<T extends HTMLElement>(max = 6) {
  const ref = useRef<T>(null);
  const on = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse" || reducedMotion()) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    el.classList.remove("idle");
    el.style.setProperty("--ry", `${x * max * 2}deg`);
    el.style.setProperty("--rx", `${-y * max * 2}deg`);
  };
  const off = () => {
    const el = ref.current;
    if (!el) return;
    el.classList.add("idle");
    el.style.setProperty("--ry", "0deg"); el.style.setProperty("--rx", "0deg");
  };
  return { ref, onPointerMove: on, onPointerLeave: off };
}

/** Moves every [data-parallax="k"] element at its own speed with GSAP ScrollTrigger (k = fraction of the scroll distance). */
export function useParallaxLayers(dep: unknown) {
  useEffect(() => {
    if (reducedMotion()) return;
    let kill = () => {};
    let off = false;
    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
      if (off) return;
      gsap.registerPlugin(ScrollTrigger);
      const ctx = gsap.context(() => {
        document.querySelectorAll<HTMLElement>("[data-parallax]").forEach((el) => {
          const host = el.parentElement;
          if (!host) return;
          const k = parseFloat(el.dataset.parallax || "0");
          const d = () => (window.innerHeight + host.offsetHeight) / 2 * k;
          gsap.fromTo(el, { y: () => d() }, { y: () => -d(), ease: "none", scrollTrigger: { trigger: host, start: "top bottom", end: "bottom top", scrub: 0.6, invalidateOnRefresh: true } });
        });
      });
      kill = () => ctx.revert();
    })();
    return () => { off = true; kill(); };
  }, [dep]);
}
