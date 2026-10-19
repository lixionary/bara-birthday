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

export type SoundEffect =
  | boolean
  | "tap"
  | "pop"
  | "unwrap"
  | "blow"
  | "sparkle"
  | "celebrate"
  | "melody";

export function useSound() {
  const [enabled, setEnabled] = useState(false);
  const [available, setAvailable] = useState(true);
  const context = useRef<AudioContext | null>(null);
  const muted = useRef(true);
  const popStep = useRef(0);
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
  function play(effect: SoundEffect = false) {
    if (
      muted.current ||
      !context.current ||
      context.current.state !== "running"
    )
      return;
    try {
      const ctx = context.current;
      const mode =
        effect === true ? "celebrate" : effect === false ? "tap" : effect;

      const playTone = (
        freq: number,
        delay: number,
        duration: number,
        peak = 0.08,
        type: OscillatorType = "sine",
        endFreq?: number,
      ) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = ctx.currentTime + delay;
        osc.type = type;
        osc.frequency.setValueAtTime(freq, start);
        if (endFreq) {
          osc.frequency.exponentialRampToValueAtTime(
            endFreq,
            start + duration * 0.85,
          );
        }
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(peak, start + 0.014);
        gain.gain.exponentialRampToValueAtTime(0.0008, start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + duration + 0.02);
        osc.onended = () => {
          osc.disconnect();
          gain.disconnect();
        };
      };

      if (mode === "pop") {
        const scale = [523.25, 587.33, 659.25, 783.99, 880, 1046.5];
        const base = scale[popStep.current % scale.length];
        popStep.current += 1;
        playTone(base * 0.85, 0, 0.14, 0.09, "triangle", base * 1.25);
        playTone(base * 1.5, 0.04, 0.12, 0.045, "sine");
        return;
      }

      if (mode === "unwrap") {
        const notes = [523.25, 659.25, 783.99, 987.77, 1174.66];
        notes.forEach((f, i) => {
          playTone(f, i * 0.065, 0.22, 0.075, "triangle");
        });
        return;
      }

      if (mode === "blow") {
        playTone(340, 0, 0.26, 0.06, "sine", 140);
        playTone(783.99, 0.08, 0.24, 0.06, "triangle");
        playTone(1046.5, 0.16, 0.3, 0.07, "sine");
        return;
      }

      if (mode === "sparkle") {
        [1046.5, 1318.51, 1567.98, 2093.0].forEach((f, i) => {
          playTone(f, i * 0.055, 0.18, 0.05, "sine");
        });
        return;
      }

      if (mode === "melody") {
        // Happy Birthday motif: G4 G4 A4 G4 C5 B4 + sparkle chord
        const phrase: [number, number, number][] = [
          [392.0, 0.0, 0.16],
          [392.0, 0.18, 0.14],
          [440.0, 0.35, 0.28],
          [392.0, 0.66, 0.28],
          [523.25, 0.98, 0.28],
          [493.88, 1.3, 0.45],
          [783.99, 1.32, 0.42],
        ];
        phrase.forEach(([f, delay, dur]) => {
          playTone(f, delay, dur, 0.08, "triangle");
        });
        return;
      }

      const notes =
        mode === "celebrate"
          ? [523.25, 659.25, 783.99, 1046.5, 1318.51]
          : [660];
      notes.forEach((frequency, i) => {
        playTone(frequency, i * 0.11, 0.18, 0.08, "sine");
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
    const colors = [
      "#bd637b",
      "#9b59b6",
      "#d5b8e9",
      "#edc269",
      "#98b8a0",
      "#f7d9e1",
    ];
    const shapes = ["ribbon", "heart", "star", "thirty"] as const;
    const particles = Array.from({ length: 105 }, (_, idx) => ({
      x: Math.random() * width,
      y: -Math.random() * height * 0.65 - 10,
      speed: 1.6 + Math.random() * 2.9,
      drift: Math.random() * 2.2 - 1.1,
      spin: Math.random() * Math.PI * 2,
      spinSpeed: (Math.random() * 0.05 + 0.015) * (idx % 2 === 0 ? 1 : -1),
      wobble: Math.random() * Math.PI * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      shape:
        idx % 14 === 0
          ? "thirty"
          : shapes[idx % 3],
    }));
    let frame = 0;
    const start = performance.now();
    let last = start;
    function draw(now: number) {
      if (!ctx) return;
      const step = Math.min((now - last) / 16.67, 3);
      last = now;
      ctx.clearRect(0, 0, width, height);
      ctx.globalAlpha = Math.max(0, Math.min(1, (3600 - (now - start)) / 750));
      particles.forEach((p) => {
        p.y += p.speed * step;
        p.wobble += 0.05 * step;
        p.x += (p.drift + Math.sin(p.wobble) * 0.5) * step;
        p.spin += p.spinSpeed * step;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.spin);
        ctx.fillStyle = p.color;
        if (p.shape === "ribbon") {
          ctx.fillRect(-3.5, -6, 7, 12);
        } else if (p.shape === "heart") {
          ctx.font = "13px Georgia, serif";
          ctx.fillText("♥", -5, 5);
        } else if (p.shape === "star") {
          ctx.font = "13px Georgia, serif";
          ctx.fillText("✦", -5, 5);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, 9, 0, Math.PI * 2);
          ctx.fillStyle = "#f6d379";
          ctx.fill();
          ctx.fillStyle = "#6e3884";
          ctx.font = "bold 9px Trebuchet MS, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("30", 0, 0.5);
        }
        ctx.restore();
      });
      if (now - start < 3600) frame = requestAnimationFrame(draw);
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
        ✦ ♡ 30 ♡ ✦
      </div>
    );
  return <canvas ref={canvas} className="confetti" aria-hidden="true" />;
}

