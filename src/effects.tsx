import { useEffect, useRef, useState } from "react";

export function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

export function useSound() {
  const [enabled, setEnabled] = useState(false);
  const [available, setAvailable] = useState(true);
  const context = useRef<AudioContext | null>(null);
  const muted = useRef(true);
  useEffect(
    () => () => {
      void context.current?.close().catch(() => undefined);
    },
    [],
  );
  function toggle() {
    if (!muted.current) {
      muted.current = true;
      setEnabled(false);
      void context.current?.suspend().catch(() => undefined);
      return;
    }
    try {
      context.current ??= new AudioContext();
      void context.current.resume().catch(() => {
        muted.current = true;
        setEnabled(false);
        setAvailable(false);
      });
      muted.current = false;
      setEnabled(true);
    } catch {
      setAvailable(false);
      setEnabled(false);
    }
  }
  function play(celebrate = false) {
    if (
      muted.current ||
      !context.current ||
      context.current.state !== "running"
    )
      return;
    try {
      const ctx = context.current;
      const notes = celebrate
        ? [523.25, 659.25, 783.99, 1046.5, 1318.51]
        : [660];
      notes.forEach((frequency, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = ctx.currentTime + i * 0.12;
        osc.type = "sine";
        osc.frequency.setValueAtTime(frequency, start);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.08, start + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.18);
        osc.onended = () => {
          osc.disconnect();
          gain.disconnect();
        };
      });
    } catch {
      /* Audio is decorative; the adventure keeps working. */
    }
  }
  return { enabled, available, toggle, play };
}

export function Confetti({ burst }: { burst: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const surface = canvas.current;
    if (!burst || reduced || !surface) return;
    const ctx = surface.getContext("2d");
    if (!ctx) return;
    const width = window.innerWidth,
      height = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    surface.width = width * ratio;
    surface.height = height * ratio;
    ctx.scale(ratio, ratio);
    const colors = ["#bd637b", "#d5b8e9", "#edc269", "#98b8a0", "#f7d9e1"];
    const particles = Array.from({ length: 90 }, () => ({
      x: Math.random() * width,
      y: -Math.random() * height * 0.6,
      speed: 1.7 + Math.random() * 2.8,
      drift: Math.random() * 2 - 1,
      spin: Math.random() * Math.PI,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    let frame = 0;
    const start = performance.now();
    let last = start;
    function draw(now: number) {
      if (!ctx) return;
      const step = Math.min((now - last) / 16.67, 3);
      last = now;
      ctx.clearRect(0, 0, width, height);
      ctx.globalAlpha = Math.max(0, Math.min(1, (3400 - (now - start)) / 700));
      particles.forEach((p) => {
        p.y += p.speed * step;
        p.x += p.drift * step;
        p.spin += 0.03 * step;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.spin);
        ctx.fillStyle = p.color;
        ctx.fillRect(-3, -5, 6, 10);
        ctx.restore();
      });
      if (now - start < 3400) frame = requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, width, height);
    }
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      ctx.clearRect(0, 0, width, height);
    };
  }, [burst, reduced]);
  if (reduced && burst)
    return (
      <div className="static-confetti" aria-hidden="true">
        ✦ ♡ ✧ ♡ ✦
      </div>
    );
  return <canvas ref={canvas} className="confetti" aria-hidden="true" />;
}
