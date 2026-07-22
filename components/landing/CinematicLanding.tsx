"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

const FRAME_COUNT = 178;
const ANCHORS = [0, 47, 93, 130, 177];
const SLUGS = ["intro", "listen", "feedback", "progress", "record"];
const DOT_LABELS = ["Intro", "While you speak", "After you finish", "Over time", "Record"];

// Baseline translateY per overlay (the intro is nudged down so eyes clear the
// headline). The text ramp adds to this.
const BASE_TY = ["7vh", "0px", "0px", "0px", "0px"];

// Where the 178-frame sequence is served from. Defaults to the local
// `public/frames` folder; in production set NEXT_PUBLIC_FRAME_BASE_URL to the
// R2/CDN base (e.g. https://cdn.example.com/frames) so these ~178 requests per
// visit don't count against the Vercel plan.
const FRAME_BASE = (process.env.NEXT_PUBLIC_FRAME_BASE_URL ?? "/frames").replace(/\/+$/, "");

function frameUrl(i: number): string {
  return `${FRAME_BASE}/frame_${String(i + 1).padStart(3, "0")}.jpg`;
}
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
// Softer sine ease-in-out, used only for the gentle handoff into the mic frame.
function easeInOutSine(t: number): number {
  return 0.5 - 0.5 * Math.cos(Math.PI * t);
}
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
// Clamped linear ramp: 0 below `a`, 1 above `b`.
function ramp(p: number, a: number, b: number): number {
  if (b <= a) return p >= b ? 1 : 0;
  return Math.max(0, Math.min(1, (p - a) / (b - a)));
}
// Deterministic pseudo-random in [0,1) — keeps petal generation pure.
function pseudo(seed: number): number {
  const x = Math.sin(seed * 127.1) * 43758.5453;
  return x - Math.floor(x);
}
// Keeps inline-style floats short enough that the server string and the
// browser's re-serialized CSSOM value agree (see the petal note below).
function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

const PETAL_COLORS = [
  ["#f6cdd3", "#dc94ab"],
  ["#f2b6c2", "#c9718c"],
  ["#f8dcd4", "#e6a894"],
  ["#eec2cb", "#d98fa6"],
  ["#f5c6bd", "#dc7a8e"],
  ["#fbe2dc", "#f0c3b6"],
];

const ROW_HAIRLINE: React.CSSProperties = {
  backgroundImage: "linear-gradient(90deg,rgba(240,195,182,0.5),rgba(240,195,182,0.05))",
  backgroundSize: "100% 1px",
  backgroundPosition: "top",
  backgroundRepeat: "no-repeat",
};

export function CinematicLanding() {
  const router = useRouter();
  const { isSignedIn } = useUser();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const playheadRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const textRafRef = useRef<number | null>(null);
  const cooldownRef = useRef(false);
  const wheelAccumRef = useRef(0);
  const checkpointRef = useRef(0);
  const reducedRef = useRef(false);
  // Kicks the lazy frame queue. Held in a ref so a checkpoint change or the
  // motion toggle can re-prioritise / resume it from outside the load effect.
  const pumpRef = useRef<(() => void) | null>(null);
  // Overlay text nodes, driven imperatively (opacity + translateY) from progress.
  const overlayRefs = useRef<Array<HTMLDivElement | null>>([null, null, null, null, null]);

  const [checkpoint, setCheckpoint] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [loadPct, setLoadPct] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    checkpointRef.current = checkpoint;
  }, [checkpoint]);
  useEffect(() => {
    reducedRef.current = reduced;
  }, [reduced]);

  // Imperatively set an overlay's opacity + translateY + interactivity.
  const applyOverlay = useCallback((i: number, opacity: number, ty: number, interactive: boolean) => {
    const el = overlayRefs.current[i];
    if (!el) return;
    el.style.opacity = String(opacity);
    el.style.transform = `translateY(calc(${BASE_TY[i]} + ${ty}px))`;
    el.style.pointerEvents = interactive ? "auto" : "none";
  }, []);

  const draw = useCallback((idx: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let img = imagesRef.current[idx];
    if (!img || !img.naturalWidth) {
      for (let d = 1; d < FRAME_COUNT; d++) {
        const a = imagesRef.current[idx - d];
        if (a && a.naturalWidth) {
          img = a;
          break;
        }
        const b = imagesRef.current[idx + d];
        if (b && b.naturalWidth) {
          img = b;
          break;
        }
      }
    }
    if (!img || !img.naturalWidth) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight) * 1.04;
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2 - dh * 0.02;
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, dw, dh);
  }, []);

  // Preload frames: a small priority backbone first, then the rest lazily,
  // nearest-to-the-playhead first.
  //
  // Previously every remaining frame was requested at once the moment the
  // backbone landed — ~20 MB of images competing for bandwidth regardless of
  // where the viewer actually was. `draw()` already falls back to the nearest
  // loaded frame, so fetching on demand degrades gracefully: the worst case is
  // the same coarse stepping the backbone gives during the initial load.
  useEffect(() => {
    const imgs: HTMLImageElement[] = new Array(FRAME_COUNT);
    imagesRef.current = imgs;

    // Read the media query directly rather than the `reduced` state: this
    // effect runs before the effect that populates that state. Seed the ref
    // too, otherwise the queue gets a brief window where it still reads the
    // initial `false` and fetches a handful of frames before stopping.
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    reducedRef.current = prefersReduced;

    // With reduced motion the glide duration is 0, so the playhead jumps
    // straight to an anchor and the in-between frames are never drawn. Loading
    // only the anchors takes those visitors from ~20 MB to ~0.6 MB. If they
    // later switch motion back on, the queue below fills in the rest.
    const priority = new Set<number>(ANCHORS);
    if (!prefersReduced) {
      for (let i = 0; i < FRAME_COUNT; i += 6) priority.add(i);
    }
    const priorityTotal = priority.size;
    let priorityLoaded = 0;

    const requested = new Set<number>();

    const load = (i: number, isPriority: boolean) =>
      new Promise<void>((resolve) => {
        if (requested.has(i)) {
          resolve();
          return;
        }
        requested.add(i);
        const img = new Image();
        const done = () => {
          imgs[i] = img;
          if (isPriority) {
            priorityLoaded++;
            setLoadPct(Math.round((priorityLoaded / priorityTotal) * 100));
          }
          resolve();
        };
        img.onload = done;
        img.onerror = done;
        img.src = frameUrl(i);
      });

    let cancelled = false;

    const pending = new Set<number>();
    for (let i = 0; i < FRAME_COUNT; i++) if (!priority.has(i)) pending.add(i);

    // A few in flight at a time, so the frames nearest the playhead win the
    // bandwidth instead of queueing behind 140 others.
    const MAX_IN_FLIGHT = 4;
    let inFlight = 0;

    const pump = () => {
      if (cancelled || reducedRef.current) return;
      while (inFlight < MAX_IN_FLIGHT && pending.size > 0) {
        // Re-picked on every slot, so changing checkpoint mid-load naturally
        // re-prioritises without cancelling anything in flight.
        const head = playheadRef.current;
        let next = -1;
        let bestDist = Infinity;
        for (const i of pending) {
          const d = Math.abs(i - head);
          if (d < bestDist) {
            bestDist = d;
            next = i;
          }
        }
        if (next < 0) return;
        pending.delete(next);
        inFlight++;
        void load(next, false).then(() => {
          inFlight--;
          pump();
        });
      }
    };
    pumpRef.current = pump;

    (async () => {
      await Promise.all([...priority].map((i) => load(i, true)));
      if (cancelled) return;
      setLoaded(true);
      draw(0);
      pump();
    })();

    return () => {
      cancelled = true;
      pumpRef.current = null;
    };
  }, [draw]);

  // Resume the queue when motion is switched back on, and top it up as the
  // viewer moves so the next segment is fetched ahead of them.
  useEffect(() => {
    if (!reduced) pumpRef.current?.();
  }, [reduced, checkpoint]);

  // Initialize overlays: intro visible, the rest hidden.
  useEffect(() => {
    applyOverlay(0, 1, 0, true);
    for (let i = 1; i < 5; i++) applyOverlay(i, 0, 0, false);
  }, [applyOverlay]);

  // Canvas sizing (DPR-aware) + redraw on resize.
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      draw(Math.round(playheadRef.current));
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [draw]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (textRafRef.current) cancelAnimationFrame(textRafRef.current);
    },
    [],
  );

  // Ramp the target caption in AFTER its frame has landed: a brief beat, then
  // opacity 0→1 + translateY 24px→0. Driven by its own progress (not a CSS
  // transition) so it always follows the image.
  const revealText = useCallback(
    (i: number) => {
      if (textRafRef.current) cancelAnimationFrame(textRafRef.current);
      const start = performance.now();
      const delay = 120; // brief beat after the frame settles
      const dur = 340;
      const tick = (now: number) => {
        const raw = (now - start - delay) / dur;
        const e = raw <= 0 ? 0 : raw >= 1 ? 1 : easeOutCubic(raw);
        applyOverlay(i, e, (1 - e) * 24, e > 0.5);
        if (raw < 1) textRafRef.current = requestAnimationFrame(tick);
      };
      textRafRef.current = requestAnimationFrame(tick);
    },
    [applyOverlay],
  );

  const glideTo = useCallback(
    (target: number) => {
      const t = Math.max(0, Math.min(4, target));
      const prev = checkpointRef.current;
      checkpointRef.current = t;
      setCheckpoint(t);
      window.history.replaceState(null, "", `#${SLUGS[t]}`);

      const from = playheadRef.current;
      const to = ANCHORS[t];
      // Gentler, slower glide into the final mic frame; snappier cubic elsewhere.
      const toRecord = t === 4;
      const dur = reducedRef.current ? 0 : toRecord ? 2400 : 1400;
      const ease = toRecord ? easeInOutSine : easeInOutCubic;
      const start = performance.now();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (textRafRef.current) cancelAnimationFrame(textRafRef.current);

      // Hide the incoming caption (below + transparent) until the frame lands.
      applyOverlay(t, 0, 24, false);

      const tick = (now: number) => {
        const p = dur === 0 ? 1 : Math.min(1, (now - start) / dur);
        playheadRef.current = from + (to - from) * ease(p);
        draw(Math.round(playheadRef.current));

        // Outgoing caption clears out immediately as we start moving.
        if (prev !== t) applyOverlay(prev, 1 - ramp(p, 0, 0.12), 0, false);

        if (p < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          if (prev !== t) applyOverlay(prev, 0, 0, false);
          // Frame has landed — now reveal the caption.
          if (reducedRef.current) applyOverlay(t, 1, 0, true);
          else revealText(t);
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [draw, applyOverlay, revealText],
  );

  const step = useCallback(
    (dir: number) => {
      if (cooldownRef.current) return;
      const next = checkpointRef.current + dir;
      if (next < 0 || next > 4) return;
      cooldownRef.current = true;
      setTimeout(() => {
        cooldownRef.current = false;
      }, 300);
      glideTo(next);
    },
    [glideTo],
  );

  // Input: wheel / keyboard / touch scrubbing.
  useEffect(() => {
    if (!loaded) return;
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      wheelAccumRef.current += e.deltaY;
      if (Math.abs(wheelAccumRef.current) > 40) {
        step(wheelAccumRef.current > 0 ? 1 : -1);
        wheelAccumRef.current = 0;
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowDown", "PageDown", " ", "Spacebar"].includes(e.key)) {
        e.preventDefault();
        step(1);
      } else if (["ArrowUp", "PageUp"].includes(e.key)) {
        e.preventDefault();
        step(-1);
      }
    };
    let touchY = 0;
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => e.preventDefault();
    const onTouchEnd = (e: TouchEvent) => {
      const dy = touchY - e.changedTouches[0].clientY;
      if (Math.abs(dy) > 46) step(dy > 0 ? 1 : -1);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [loaded, step]);

  const goPractice = () => router.push(isSignedIn ? "/practice" : "/sign-up");

  const petals = useMemo(() => {
    return Array.from({ length: 26 }, (_, i) => {
      const [a, b] = PETAL_COLORS[i % PETAL_COLORS.length];
      // Rounded on purpose: the browser's CSSOM re-serializes inline-style
      // floats at ~6 significant digits, so full-precision values make React's
      // hydration check see a string mismatch and re-render the whole subtree
      // on the client. 3dp is far below a visible pixel/second.
      return {
        id: i,
        left: round(pseudo(i + 2) * 100),
        size: round(9 + pseudo(i + 1) * 15),
        fall: round(11 + pseudo(i + 3) * 12),
        sway: round(3 + pseudo(i + 4) * 4),
        delay: round(-pseudo(i + 5) * 20),
        grad: `linear-gradient(135deg, ${a}, ${b})`,
      };
    });
  }, []);

  const setOverlayRef = (i: number) => (el: HTMLDivElement | null) => {
    // Ref callbacks run at commit, not during render — safe to assign here.
    // eslint-disable-next-line react-hooks/refs
    overlayRefs.current[i] = el;
  };

  return (
    <div ref={containerRef} className="fixed inset-0 overflow-hidden bg-bg" style={{ touchAction: "none" }}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/45 to-transparent" />

      {/* Loader */}
      {!loaded && (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center gap-7 bg-bg">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 rounded-full border-[1.5px] border-white/[.08]" />
            <div className="absolute inset-0 animate-spin rounded-full border-[1.5px] border-transparent" style={{ borderTopColor: "#e6a894", animationDuration: "1s" }} />
          </div>
          <div className="text-center">
            <div className="font-display text-[22px] font-light italic text-blush">Preparing the descent…</div>
            <div className="mt-2 font-label text-xs tracking-[0.18em] text-faint">{loadPct}%</div>
          </div>
          <div className="h-0.5 w-44 overflow-hidden rounded bg-white/[.08]">
            <div className="h-full transition-[width] duration-300" style={{ width: `${loadPct}%`, background: "linear-gradient(90deg,#e6b6a0,#8fb8d6)" }} />
          </div>
        </div>
      )}

      {/* Falling petals (intro only) */}
      {!reduced && (
        <div
          className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-700"
          style={{ opacity: checkpoint === 0 ? 1 : 0 }}
          aria-hidden
        >
          {petals.map((p) => (
            <div key={p.id} className="absolute top-0" style={{ left: `${p.left}%`, animation: `petalFall ${p.fall}s linear ${p.delay}s infinite` }}>
              <div style={{ width: p.size, height: p.size, background: p.grad, borderRadius: "100% 0 100% 0", animation: `petalSway ${p.sway}s ease-in-out infinite` }} />
            </div>
          ))}
        </div>
      )}

      {/* Top chrome */}
      <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <span className="logo-dot" />
            <span className="font-display text-2xl font-medium">Impromptu</span>
          </div>
          <div className="hidden items-center gap-2.5 border-l border-white/15 pl-4 sm:flex">
            <span className="font-label text-xs tracking-[0.14em] tabular-nums text-fg/90">
              {String(checkpoint + 1).padStart(2, "0")}
            </span>
            <span className="h-0.5 w-[34px] overflow-hidden rounded bg-white/15">
              <span className="block h-full transition-[width] duration-500" style={{ width: `${(checkpoint / 4) * 100}%`, background: "linear-gradient(90deg,#ecc0aa,#dc94ab)" }} />
            </span>
            <span className="font-label text-xs tracking-[0.14em] tabular-nums text-fg/40">05</span>
          </div>
        </div>

        <nav className="flex items-center gap-4 sm:gap-6">
          <button
            onClick={() => setReduced((r) => !r)}
            aria-label="Toggle reduced motion"
            title="Reduce motion"
            className="hidden h-[34px] w-[34px] items-center justify-center rounded-full border border-white/20 bg-white/5 text-fg/80 transition-colors hover:border-white/45 hover:text-fg sm:inline-flex"
            style={{ opacity: reduced ? 0.5 : 1 }}
          >
            <MotionIcon />
          </button>
          <button
            onClick={() => glideTo(4)}
            className="hidden items-center gap-1.5 text-sm text-fg/70 transition-colors hover:text-fg sm:inline-flex"
          >
            Skip to the mic <MicIcon />
          </button>
          <button
            onClick={() => router.push("/sign-in")}
            className="hidden items-center rounded-full border border-white/20 bg-white/5 px-5 py-2 text-sm font-semibold text-fg backdrop-blur transition-colors hover:border-white/40 sm:inline-flex"
          >
            Sign in
          </button>
          <button
            onClick={goPractice}
            className="btn-accent rounded-full px-5 py-2.5 font-label text-[13px] tracking-[0.06em] transition-opacity duration-500"
            style={{ opacity: checkpoint > 0 ? 1 : 0, pointerEvents: checkpoint > 0 ? "auto" : "none" }}
          >
            Start practicing
          </button>
        </nav>
      </header>

      {/* Right-side checkpoint dots */}
      <div className="absolute right-4 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-end gap-1.5 md:flex">
        {DOT_LABELS.map((label, i) => (
          <button key={label} onClick={() => glideTo(i)} className="group flex items-center gap-3 py-1.5">
            <span
              className="whitespace-nowrap font-label text-[10px] uppercase tracking-[0.2em] transition-opacity group-hover:opacity-100"
              style={{ color: "rgba(244,239,236,0.85)", opacity: checkpoint === i ? 1 : 0, textShadow: "0 1px 8px rgba(0,0,0,0.8)" }}
            >
              {label}
            </span>
            <span
              className="h-2 w-2 rounded-full transition-all"
              style={
                checkpoint === i
                  ? { background: "linear-gradient(135deg,#ecc0aa,#dc94ab)", boxShadow: "0 0 12px rgba(220,148,171,0.7)", transform: "scale(1.35)" }
                  : { background: "rgba(255,255,255,0.35)" }
              }
            />
          </button>
        ))}
      </div>

      {/* Overlay 0 — Intro */}
      <Overlay setRef={setOverlayRef(0)} className="inset-0 flex flex-col items-center justify-center px-6 text-center">
        <span className="frost-pill mb-6 inline-flex items-center gap-2 rounded-full px-4 py-[7px] text-[12px] uppercase tracking-[0.34em]" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.55)" }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: "linear-gradient(135deg,#f0c3b6,#dc94ab)", boxShadow: "0 0 8px rgba(224,150,150,0.8)" }} />
          Impromptu Speech Trainer
        </span>
        <h1 className="max-w-[16ch] font-display text-5xl font-light leading-none tracking-tight sm:text-7xl lg:text-[104px]" style={{ textShadow: "0 2px 40px rgba(0,0,0,0.55)" }}>
          Find your voice,
          <br />
          one <span className="italic text-blush">breath</span> at a time.
        </h1>
        <p className="mt-6 max-w-[44ch] text-base leading-[1.55] text-fg/[.78]">
          A calm, AI-guided studio for impromptu speaking — pick a prompt, speak, and grow with every take.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3.5">
          <button onClick={goPractice} className="btn-accent flex items-center gap-2.5 rounded-full px-8 py-4 font-label text-sm uppercase tracking-[0.08em]">
            <span className="h-2 w-2 rounded-full bg-[#2a1418]" />
            Start your first speech
          </button>
          <button onClick={() => glideTo(1)} className="btn-ghost flex items-center gap-2 rounded-full px-7 py-4 font-label text-sm uppercase tracking-[0.08em]">
            See how it works <span className="text-xs opacity-70">↓</span>
          </button>
        </div>
        <span className="mt-14 flex flex-col items-center gap-2 font-label text-[11px] uppercase tracking-[0.22em] text-fg/50">
          Scroll to explore
          <span className="animate-bounce">↓</span>
        </span>
      </Overlay>

      {/* Overlay 1 — While you speak */}
      <Overlay setRef={setOverlayRef(1)} className="inset-0 flex items-center justify-start px-6 sm:px-[7vw] lg:px-[120px]">
        <Editorial>
          <CheckpointHead n="01" kicker="While you speak" />
          <Headline first="Every word," second="measured." />
          <div className="mt-6 flex flex-col">
            <Row label="Pace" desc="words per minute, tracked live" />
            <Row label="Filler words" desc="every um, uh and like, counted" />
            <Row label="Structure" desc="opening, argument, close" />
            <Row label="Vocabulary" desc="range and precision of word choice" last />
          </div>
        </Editorial>
      </Overlay>

      {/* Overlay 2 — After you finish */}
      <Overlay setRef={setOverlayRef(2)} className="inset-0 flex items-start justify-start px-6 pt-24 sm:px-[7vw] sm:pt-[13vh] lg:px-[120px]">
        <Editorial>
          <CheckpointHead n="02" kicker="After you finish" />
          <Headline first="Feedback that" second="listens." />
          <p className="mt-[18px] max-w-[42ch] text-[15px] leading-[1.6] text-fg/[.82]">
            Content and delivery scored{" "}
            <span className="font-display text-[19px] italic text-blush">0–100</span>, explained line by line — with sharp, specific tips for your next take.
          </p>
          <div
            className="mt-[22px] flex flex-wrap items-center gap-6 py-3.5"
            style={{ ...ROW_HAIRLINE, borderBottom: "1px solid rgba(240,195,182,0.14)" }}
          >
            {[
              ["Easy", "3", "#63d29b"],
              ["Medium", "5", "#e8b45c"],
              ["Hard", "7", "#e0788a"],
            ].map(([label, n, c]) => (
              <span key={label} className="inline-flex items-center gap-2">
                <span className="h-[7px] w-[7px] rounded-full" style={{ background: c, boxShadow: `0 0 10px ${c}b3` }} />
                <span className="text-sm font-semibold">{label}</span>
                <span className="text-[13px] text-fg/60">{n} criteria</span>
              </span>
            ))}
          </div>
          <p className="mt-3 font-display text-[17px] italic text-fg/55">
            Strictness scales with the difficulty you choose.
          </p>
        </Editorial>
      </Overlay>

      {/* Overlay 3 — Over time */}
      <Overlay setRef={setOverlayRef(3)} className="inset-0 flex items-center justify-start px-6 pb-[20vh] sm:px-[7vw] lg:px-[120px]">
        <Editorial>
          <CheckpointHead n="03" kicker="Over time" />
          <Headline first="Watch yourself" second="grow." />
          <div className="mt-6 flex flex-col">
            <Row label="History" desc="every take saved, replayable" />
            <Row label="Trends" desc="scores charted across sessions" />
            <Row label="Streaks" desc="daily practice, kept alive" last />
          </div>
        </Editorial>
      </Overlay>

      {/* Overlay 4 — Mic payoff */}
      <Overlay setRef={setOverlayRef(4)} className="inset-0 flex flex-col items-center justify-end px-6 pb-[7vh] text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2"
          style={{
            width: "min(760px, 100vw)",
            height: "58vh",
            background:
              "radial-gradient(ellipse at 50% 66%,rgba(11,8,9,0.88) 0%,rgba(11,8,9,0.6) 50%,transparent 78%)",
            filter: "blur(10px)",
          }}
        />
        <p className="relative font-display text-2xl font-normal italic leading-[1.3] text-[#fdfaf8] sm:text-3xl" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.9), 0 2px 30px rgba(0,0,0,0.9)" }}>
          The stage is quiet. The mic is yours.
        </p>
        <button
          onClick={goPractice}
          aria-label="Start your speech"
          className="record-pulse relative mt-8 flex h-[104px] w-[104px] items-center justify-center rounded-full border border-white/[.28] bg-white/[.07]"
          style={{ boxShadow: "0 12px 44px rgba(220,148,150,0.32), inset 0 0 20px rgba(255,255,255,0.05)" }}
        >
          <span className="h-[34px] w-[34px] rounded-full" style={{ background: "linear-gradient(135deg,#ecc0aa,#dc7a8e)", boxShadow: "0 0 18px rgba(220,120,138,0.7)" }} />
        </button>
        <span className="relative mt-[18px] font-label text-[13px] uppercase tracking-[0.16em] text-fg/90">Start your speech</span>
        <div className="relative mt-6 flex flex-col items-center gap-[7px]">
          <p className="font-display text-[18px] font-light italic text-fg/[.72]">
            “I stopped dreading being called on in meetings.”
          </p>
          <span className="font-label text-[10.5px] uppercase tracking-[0.22em] text-[#f0c3b6]/60">
            Maya R. · early member · 40,000+ speeches practiced
          </span>
        </div>
      </Overlay>
    </div>
  );
}

// Positioning wrapper for an overlay. Opacity/transform are NOT set here — they
// are driven imperatively via the forwarded ref (see applyOverlay). The
// `.overlay-content` class hides it until JS takes over.
function Overlay({
  setRef,
  className,
  children,
}: {
  setRef: (el: HTMLDivElement | null) => void;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <div ref={setRef} className={`overlay-content absolute z-20 ${className}`}>
      {children}
    </div>
  );
}

function Editorial({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative max-w-[480px]">
      <div
        aria-hidden
        className="absolute -inset-x-24 -inset-y-16"
        style={{
          background:
            "radial-gradient(ellipse at 40% 50%,rgba(11,8,9,0.86) 0%,rgba(11,8,9,0.58) 55%,transparent 78%)",
          filter: "blur(6px)",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

function CheckpointHead({ n, kicker }: { n: string; kicker: string }) {
  return (
    <div className="flex items-baseline gap-4">
      <span
        className="font-display text-[78px] font-light italic leading-none"
        style={{ WebkitTextStroke: "1px rgba(240,195,182,0.65)", color: "transparent" }}
      >
        {n}
      </span>
      <span className="text-[11px] uppercase tracking-[0.32em]" style={{ color: "rgba(240,200,190,0.85)" }}>
        {kicker}
      </span>
    </div>
  );
}

function Headline({ first, second }: { first: string; second: string }) {
  return (
    <h2 className="mt-3.5 font-display text-4xl font-light leading-[1.04] sm:text-5xl" style={{ textShadow: "0 2px 30px rgba(0,0,0,0.6)" }}>
      {first}
      <br />
      <span className="italic text-blush">{second}</span>
    </h2>
  );
}

function Row({ label, desc, last }: { label: string; desc: string; last?: boolean }) {
  return (
    <div
      className="flex items-baseline gap-3.5 py-[11px]"
      style={last ? { ...ROW_HAIRLINE, borderBottom: "1px solid rgba(240,195,182,0.14)" } : ROW_HAIRLINE}
    >
      <span className="min-w-[126px] font-label text-[12.5px] font-medium uppercase tracking-[0.2em]" style={{ color: "#ffd9cd" }}>
        {label}
      </span>
      <span className="text-[15px]" style={{ color: "rgba(244,239,236,0.94)" }}>
        {desc}
      </span>
    </div>
  );
}

function MotionIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v4" />
      <path d="M12 18v4" />
      <path d="M4.9 4.9l2.8 2.8" />
      <path d="M16.3 16.3l2.8 2.8" />
      <path d="M2 12h4" />
      <path d="M18 12h4" />
      <path d="M4.9 19.1l2.8-2.8" />
      <path d="M16.3 7.7l2.8-2.8" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.85 }}>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <line x1="9" y1="21" x2="15" y2="21" />
    </svg>
  );
}
