"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

const FRAME_COUNT = 178;
const ANCHORS = [0, 47, 93, 130, 177];
const SLUGS = ["intro", "listen", "feedback", "progress", "record"];
const DOT_LABELS = ["Intro", "While you speak", "After you finish", "Over time", "Record"];

function frameUrl(i: number): string {
  return `/frames/frame_${String(i + 1).padStart(3, "0")}.jpg`;
}
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
// Deterministic pseudo-random in [0,1) — keeps petal generation pure (no
// Math.random) so it's stable across renders and SSR/hydration.
function pseudo(seed: number): number {
  const x = Math.sin(seed * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

const PETAL_COLORS = [
  ["#f6cdd3", "#dc94ab"],
  ["#f2b6c2", "#c9718c"],
  ["#f8dcd4", "#e6a894"],
  ["#eec2cb", "#d98fa6"],
  ["#f5c6bd", "#dc7a8e"],
  ["#fbe2dc", "#f0c3b6"],
];

export function CinematicLanding() {
  const router = useRouter();
  const { isSignedIn } = useUser();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const playheadRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const cooldownRef = useRef(false);
  const wheelAccumRef = useRef(0);
  const checkpointRef = useRef(0);
  const reducedRef = useRef(false);

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

  // Preload frames (priority set first, then the rest).
  useEffect(() => {
    const imgs: HTMLImageElement[] = new Array(FRAME_COUNT);
    imagesRef.current = imgs;

    const priority = new Set<number>(ANCHORS);
    for (let i = 0; i < FRAME_COUNT; i += 6) priority.add(i);
    const priorityTotal = priority.size;
    let priorityLoaded = 0;

    const load = (i: number, isPriority: boolean) =>
      new Promise<void>((resolve) => {
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
    (async () => {
      await Promise.all([...priority].map((i) => load(i, true)));
      if (cancelled) return;
      setLoaded(true);
      draw(0);
      for (let i = 0; i < FRAME_COUNT; i++) if (!priority.has(i)) void load(i, false);
    })();

    return () => {
      cancelled = true;
    };
  }, [draw]);

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

  // Sync the browser's reduced-motion preference into React on mount.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const glideTo = useCallback(
    (target: number) => {
      const t = Math.max(0, Math.min(4, target));
      checkpointRef.current = t;
      setCheckpoint(t);
      window.history.replaceState(null, "", `#${SLUGS[t]}`);

      const from = playheadRef.current;
      const to = ANCHORS[t];
      const dur = reducedRef.current ? 0 : t === 4 ? 2400 : 1400;
      const start = performance.now();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      const tick = (now: number) => {
        const p = dur === 0 ? 1 : Math.min(1, (now - start) / dur);
        playheadRef.current = from + (to - from) * easeInOutCubic(p);
        draw(Math.round(playheadRef.current));
        if (p < 1) rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [draw],
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
      return {
        id: i,
        left: pseudo(i + 2) * 100,
        size: 9 + pseudo(i + 1) * 15,
        fall: 11 + pseudo(i + 3) * 12,
        sway: 3 + pseudo(i + 4) * 4,
        delay: -pseudo(i + 5) * 20,
        grad: `linear-gradient(135deg, ${a}, ${b})`,
      };
    });
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 overflow-hidden bg-bg" style={{ touchAction: "none" }}>
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/50" />

      {/* Loader */}
      {!loaded && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-bg">
          <p className="font-display text-2xl font-light italic text-blush">Preparing the descent…</p>
          <div className="h-1 w-56 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${loadPct}%`, background: "linear-gradient(90deg,#ecc0aa,#dc94ab)" }} />
          </div>
          <p className="font-label text-xs tabular-nums text-faint">{loadPct}%</p>
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
            <div
              key={p.id}
              className="absolute top-0"
              style={{ left: `${p.left}%`, animation: `petalFall ${p.fall}s linear ${p.delay}s infinite` }}
            >
              <div
                style={{
                  width: p.size,
                  height: p.size,
                  background: p.grad,
                  borderRadius: "100% 0 100% 0",
                  animation: `petalSway ${p.sway}s ease-in-out infinite`,
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Top chrome */}
      <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <span className="logo-dot" />
          <span className="font-display text-xl">Impromptu</span>
        </div>

        <div className="hidden items-center gap-5 md:flex">
          <span className="font-label text-[0.7rem] uppercase tracking-[0.2em] text-muted">
            {String(checkpoint + 1).padStart(2, "0")}
            <span className="mx-2 inline-block h-px w-10 translate-y-[-3px] bg-white/20" />
            05
          </span>
          <button
            onClick={() => setReduced((r) => !r)}
            className="font-label text-[0.7rem] uppercase tracking-[0.2em] text-muted hover:text-fg"
          >
            {reduced ? "Motion off" : "Motion on"}
          </button>
          <button
            onClick={() => glideTo(4)}
            className="font-label text-[0.7rem] uppercase tracking-[0.2em] text-muted hover:text-fg"
          >
            Skip to the mic
          </button>
          <button
            onClick={() => router.push("/sign-in")}
            className="font-label text-[0.7rem] uppercase tracking-[0.2em] text-muted hover:text-fg"
          >
            Sign in
          </button>
        </div>

        <button
          onClick={goPractice}
          className="btn-accent rounded-full px-5 py-2 font-label text-[0.7rem] uppercase tracking-[0.2em] transition-opacity duration-500"
          style={{ opacity: checkpoint > 0 ? 1 : 0, pointerEvents: checkpoint > 0 ? "auto" : "none" }}
        >
          Start practicing
        </button>
      </header>

      {/* Right-side checkpoint dots */}
      <div className="absolute right-6 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-end gap-4 md:flex">
        {DOT_LABELS.map((label, i) => (
          <button key={label} onClick={() => glideTo(i)} className="group flex items-center gap-3">
            <span className="font-label text-[0.65rem] uppercase tracking-[0.15em] text-faint opacity-0 transition-opacity group-hover:opacity-100">
              {label}
            </span>
            <span
              className="h-2.5 w-2.5 rounded-full transition-all"
              style={
                checkpoint === i
                  ? { background: "linear-gradient(135deg,#ecc0aa,#dc94ab)", boxShadow: "0 0 12px rgba(220,148,171,0.7)", transform: "scale(1.3)" }
                  : { background: "rgba(255,255,255,0.25)" }
              }
            />
          </button>
        ))}
      </div>

      {/* Overlays */}
      <Overlay active={checkpoint === 0} className="inset-0 flex flex-col items-center justify-center px-6 text-center">
        <span className="frost-pill mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-label text-[0.65rem] uppercase tracking-[0.24em]">
          <span className="logo-dot h-1.5 w-1.5" />
          Impromptu Speech Trainer
        </span>
        <h1 className="max-w-3xl font-display text-5xl font-light leading-tight sm:text-7xl">
          Find your voice, one <span className="italic text-blush">breath</span> at a time.
        </h1>
        <p className="mt-5 max-w-md text-muted">
          Pick a difficulty, get a topic, and speak to the clock. AI feedback on content and delivery.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button onClick={goPractice} className="btn-accent rounded-full px-7 py-3 font-label text-xs uppercase tracking-[0.2em]">
            Start your first speech
          </button>
          <button onClick={() => glideTo(1)} className="btn-ghost rounded-full px-7 py-3 font-label text-xs uppercase tracking-[0.2em]">
            See how it works ↓
          </button>
        </div>
        <span className="mt-14 font-label text-[0.65rem] uppercase tracking-[0.34em] text-faint">
          Scroll to explore ↓
        </span>
      </Overlay>

      <Overlay active={checkpoint === 1} className="inset-y-0 left-0 flex w-full max-w-lg flex-col justify-center px-8 sm:px-16">
        <CheckpointNumber n="01" />
        <p className="eyebrow mt-4">While you speak</p>
        <h2 className="mt-2 font-display text-4xl font-light sm:text-5xl">
          Every word, <span className="italic text-blush">measured.</span>
        </h2>
        <ul className="mt-6 space-y-px">
          {["Pace", "Filler words", "Structure", "Vocabulary"].map((r) => (
            <li key={r} className="border-t border-white/10 py-3 font-label text-sm uppercase tracking-[0.15em] text-muted">
              {r}
            </li>
          ))}
        </ul>
      </Overlay>

      <Overlay active={checkpoint === 2} className="inset-y-0 left-0 flex w-full max-w-lg flex-col justify-center px-8 sm:px-16">
        <CheckpointNumber n="02" />
        <p className="eyebrow mt-4">After you finish</p>
        <h2 className="mt-2 font-display text-4xl font-light sm:text-5xl">
          Feedback that <span className="italic text-blush">listens.</span>
        </h2>
        <p className="mt-4 max-w-sm text-sm text-muted">
          A 0–100 score across content and delivery, with specific tips — strictness scaling by difficulty.
        </p>
        <div className="mt-6 flex gap-6">
          {[
            ["Easy", "3", "#63d29b"],
            ["Medium", "5", "#e8b45c"],
            ["Hard", "7", "#e0788a"],
          ].map(([label, n, c]) => (
            <div key={label} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
              <span className="text-sm text-muted">
                {label} · {n} criteria
              </span>
            </div>
          ))}
        </div>
      </Overlay>

      <Overlay active={checkpoint === 3} className="inset-y-0 left-0 flex w-full max-w-lg flex-col justify-center px-8 sm:px-16">
        <CheckpointNumber n="03" />
        <p className="eyebrow mt-4">Over time</p>
        <h2 className="mt-2 font-display text-4xl font-light sm:text-5xl">
          Watch yourself <span className="italic text-blush">grow.</span>
        </h2>
        <ul className="mt-6 space-y-px">
          {["History", "Trends", "Streaks"].map((r) => (
            <li key={r} className="border-t border-white/10 py-3 font-label text-sm uppercase tracking-[0.15em] text-muted">
              {r}
            </li>
          ))}
        </ul>
      </Overlay>

      <Overlay active={checkpoint === 4} className="inset-x-0 bottom-0 flex flex-col items-center px-6 pb-20 text-center">
        <p className="font-display text-2xl font-light italic text-blush">
          The stage is quiet. The mic is yours.
        </p>
        <button
          onClick={goPractice}
          className="record-pulse relative mt-8 flex h-[104px] w-[104px] items-center justify-center rounded-full"
          style={{ background: "linear-gradient(135deg,#ecc0aa,#dc94ab)" }}
          aria-label="Start your speech"
        >
          <span className="h-4 w-4 rounded-full bg-[#2a1418]" />
        </button>
        <span className="mt-5 font-label text-xs uppercase tracking-[0.2em]">Start your speech</span>
        <p className="mt-6 max-w-sm text-sm italic text-faint">
          “I stopped fearing the blank moment before I speak.”
        </p>
      </Overlay>
    </div>
  );
}

function Overlay({
  active,
  className,
  children,
}: {
  active: boolean;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`absolute z-20 transition-opacity duration-700 ${className}`}
      style={{ opacity: active ? 1 : 0, pointerEvents: active ? "auto" : "none" }}
    >
      {children}
    </div>
  );
}

function CheckpointNumber({ n }: { n: string }) {
  return (
    <span
      className="font-display text-6xl font-light italic"
      style={{ WebkitTextStroke: "1px rgba(240,195,182,0.5)", color: "transparent" }}
    >
      {n}
    </span>
  );
}
