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
  | "melody"
  | "rattle"
  | "wax"
  | "sparkler";

export function useSound() {
  const [enabled, setEnabled] = useState(false);
  const [available, setAvailable] = useState(true);
  const context = useRef<AudioContext | null>(null);
  const muted = useRef(true);
  const popStep = useRef(0);
  const musicStep = useRef(0);

  useEffect(
    () => () => {
      void context.current?.close().catch(() => undefined);
    },
    [],
  );

  // Gentle music-box arpeggio loop while sound is enabled
  useEffect(() => {
    if (!enabled) return;
    const musicNotes = [
      523.25, 659.25, 783.99, 987.77, 783.99, 659.25, 587.33, 783.99, 880.0,
      1046.5, 880.0, 783.99,
    ];
    const timer = window.setInterval(() => {
      if (
        muted.current ||
        !context.current ||
        context.current.state !== "running"
      )
        return;
      try {
        const ctx = context.current;
        const freq = musicNotes[musicStep.current % musicNotes.length];
        musicStep.current += 1;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = ctx.currentTime + 0.01;
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(0.018, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0005, start + 0.42);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.45);
      } catch {
        /* Ignore background music box errors */
      }
    }, 520);
    return () => window.clearInterval(timer);
  }, [enabled]);

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

      if (mode === "rattle") {
        [420, 560, 480, 640].forEach((f, i) => {
          playTone(f, i * 0.045, 0.08, 0.055, "triangle", f * 1.15);
        });
        return;
      }

      if (mode === "wax") {
        playTone(310, 0, 0.11, 0.08, "triangle", 620);
        [783.99, 987.77, 1318.51, 1567.98].forEach((f, i) => {
          playTone(f, 0.08 + i * 0.055, 0.22, 0.06, "sine");
        });
        return;
      }

      if (mode === "sparkler") {
        [1174.66, 1567.98, 1975.53, 2349.32, 2637.02].forEach((f, i) => {
          playTone(f, i * 0.04, 0.14, 0.05, "sine", f * 0.92);
        });
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

export type MicStatus = "idle" | "listening" | "denied" | "unavailable";

export function useMicBlow({
  active,
  onBlowFirst,
  onBlowAll,
}: {
  active: boolean;
  onBlowFirst: () => void;
  onBlowAll: () => void;
}) {
  const [supported] = useState(
    () =>
      typeof navigator !== "undefined" &&
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      typeof window !== "undefined" &&
      typeof window.AudioContext !== "undefined",
  );
  const [status, setStatus] = useState<MicStatus>(() =>
    supported ? "idle" : "unavailable",
  );
  const [level, setLevel] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const frameRef = useRef<number>(0);
  const grantedSessionRef = useRef(false);
  const firstTriggeredRef = useRef(false);
  const blowProgressRef = useRef(0);
  const onBlowFirstRef = useRef(onBlowFirst);
  const onBlowAllRef = useRef(onBlowAll);
  onBlowFirstRef.current = onBlowFirst;
  onBlowAllRef.current = onBlowAll;

  function stop() {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (ctxRef.current) {
      void ctxRef.current.close().catch(() => undefined);
      ctxRef.current = null;
    }
    blowProgressRef.current = 0;
    firstTriggeredRef.current = false;
    setLevel(0);
    setStatus((prev) => (prev === "listening" ? "idle" : prev));
  }

  async function start() {
    if (!supported || !active || streamRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      if (!active) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      grantedSessionRef.current = true;
      streamRef.current = stream;
      const ctx = new AudioContext();
      ctxRef.current = ctx;
      await ctx.resume().catch(() => undefined);
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.45;
      source.connect(analyser);

      const timeData = new Uint8Array(analyser.fftSize);
      const freqData = new Uint8Array(analyser.frequencyBinCount);
      blowProgressRef.current = 0;
      firstTriggeredRef.current = false;
      setStatus("listening");

      let last = performance.now();
      const tick = (now: number) => {
        if (!streamRef.current || !ctxRef.current) return;
        const dt = Math.min(now - last, 50);
        last = now;

        analyser.getByteTimeDomainData(timeData);
        analyser.getByteFrequencyData(freqData);

        let sumSq = 0;
        for (let i = 0; i < timeData.length; i++) {
          const sample = (timeData[i] - 128) / 128;
          sumSq += sample * sample;
        }
        const rms = Math.sqrt(sumSq / timeData.length);

        let lowFreqSum = 0;
        const bins = Math.min(18, freqData.length);
        for (let i = 0; i < bins; i++) {
          lowFreqSum += freqData[i] / 255;
        }
        const lowFreqAvg = bins > 0 ? lowFreqSum / bins : 0;

        const raw = Math.max(rms * 3.4, lowFreqAvg * 1.35);
        const normalized = Math.min(1, Math.max(0, (raw - 0.06) / 0.34));
        setLevel(normalized);

        if (normalized >= 0.32) {
          blowProgressRef.current += normalized * (dt / 16.67);
          if (blowProgressRef.current >= 4 && !firstTriggeredRef.current) {
            firstTriggeredRef.current = true;
            onBlowFirstRef.current();
          }
          if (blowProgressRef.current >= 9.5) {
            onBlowAllRef.current();
            stop();
            return;
          }
        } else {
          blowProgressRef.current = Math.max(
            0,
            blowProgressRef.current - 0.14 * (dt / 16.67),
          );
        }

        frameRef.current = requestAnimationFrame(tick);
      };

      frameRef.current = requestAnimationFrame(tick);
    } catch {
      setStatus("denied");
      stop();
    }
  }

  useEffect(() => {
    if (!active || !supported) {
      stop();
      return;
    }
    let cancelled = false;
    // If already granted in this session or via browser permissions API, auto-start!
    if (grantedSessionRef.current) {
      void start();
    } else if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "microphone" as PermissionName })
        .then((res) => {
          if (!cancelled && res.state === "granted") {
            void start();
          }
        })
        .catch(() => undefined);
    }
    return () => {
      cancelled = true;
      stop();
    };
  }, [active, supported]);

  return {
    supported,
    status,
    listening: status === "listening",
    level,
    start,
    stop,
  };
}

type StardustParticle = {
  id: number;
  x: number;
  y: number;
  symbol: string;
  color: string;
  dx: number;
};

const STARDUST_SYMBOLS = ["✦", "✧", "♡", "⋆"];
const STARDUST_COLORS = ["#b87fd0", "#d49a2a", "#bd637b", "#8f4f9d"];

export function StardustTrail() {
  const reduced = useReducedMotion();
  const [motes, setMotes] = useState<StardustParticle[]>([]);
  const lastSpawnRef = useRef(0);
  const idRef = useRef(0);

  useEffect(() => {
    if (reduced) return;
    const spawn = (clientX: number, clientY: number, force = false) => {
      const now = performance.now();
      if (!force && now - lastSpawnRef.current < 55) return;
      lastSpawnRef.current = now;
      const id = ++idRef.current;
      const mote: StardustParticle = {
        id,
        x: clientX,
        y: clientY,
        symbol: STARDUST_SYMBOLS[id % STARDUST_SYMBOLS.length],
        color: STARDUST_COLORS[id % STARDUST_COLORS.length],
        dx: ((id * 13) % 24) - 12,
      };
      setMotes((prev) => [...prev.slice(-14), mote]);
      window.setTimeout(() => {
        setMotes((prev) => prev.filter((item) => item.id !== id));
      }, 650);
    };

    const onMove = (e: PointerEvent) => {
      if (e.clientX <= 0 && e.clientY <= 0) return;
      spawn(e.clientX, e.clientY, false);
    };
    const onDown = (e: PointerEvent) => {
      if (e.clientX <= 0 && e.clientY <= 0) return;
      spawn(e.clientX, e.clientY, true);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [reduced]);

  if (reduced || motes.length === 0) return null;

  return (
    <div className="stardust-layer" aria-hidden="true">
      {motes.map((m) => (
        <span
          key={m.id}
          className="stardust-mote"
          style={{
            left: `${m.x}px`,
            top: `${m.y}px`,
            color: m.color,
            ["--sdx" as string]: `${m.dx}px`,
          }}
        >
          {m.symbol}
        </span>
      ))}
    </div>
  );
}

export function downloadPolaroidKeepsake({
  recipient,
  sender,
  age,
  moodLabels,
  decorations,
}: {
  recipient: string;
  sender: string;
  age: number;
  moodLabels: string[];
  decorations: { id: string; x: number; y: number }[];
}): boolean {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 720;
    canvas.height = 900;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;

    // Outer Polaroid paper
    ctx.fillStyle = "#fffaf4";
    ctx.fillRect(0, 0, 720, 900);
    ctx.strokeStyle = "#e3d1e8";
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, 714, 894);

    // Inner photo frame
    const px = 48,
      py = 52,
      pw = 624,
      ph = 600;
    const bgGrad = ctx.createLinearGradient(px, py, px, py + ph);
    bgGrad.addColorStop(0, "#f8eefc");
    bgGrad.addColorStop(1, "#fdf5ea");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = "#decbe4";
    ctx.lineWidth = 2;
    ctx.strokeRect(px, py, pw, ph);

    // Subtle sparkles in backdrop
    ctx.fillStyle = "#d49a2a";
    ctx.font = "22px Georgia, serif";
    ctx.fillText("✦", px + 46, py + 58);
    ctx.fillText("✧", px + pw - 68, py + 72);
    ctx.fillStyle = "#bd637b";
    ctx.fillText("♡", px + 68, py + 150);
    ctx.fillText("♡", px + pw - 82, py + 165);

    // Plate
    ctx.fillStyle = "#f2e8f5";
    ctx.beginPath();
    ctx.ellipse(360, py + 478, 220, 26, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bottom ube tier
    ctx.fillStyle = "#6e3b82";
    ctx.beginPath();
    ctx.roundRect(180, py + 340, 360, 126, 22);
    ctx.fill();

    // Middle ube tier
    ctx.fillStyle = "#824998";
    ctx.beginPath();
    ctx.roundRect(215, py + 235, 290, 112, 20);
    ctx.fill();

    // Top ube tier
    ctx.fillStyle = "#9559ac";
    ctx.beginPath();
    ctx.roundRect(250, py + 148, 220, 96, 18);
    ctx.fill();

    // White chocolate glaze on top tier
    ctx.fillStyle = "#fff8ee";
    ctx.beginPath();
    ctx.roundRect(248, py + 142, 224, 28, 14);
    ctx.fill();

    // Sculpted "30" candle digits on top of cake
    ctx.font = "bold 76px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff4d9";
    ctx.strokeStyle = "#7a3e90";
    ctx.lineWidth = 6;
    ctx.strokeText(String(age), 360, py + 135);
    ctx.fillText(String(age), 360, py + 135);

    // Golden flames above "3" and "0"
    [332, 388].forEach((fx) => {
      ctx.fillStyle = "#ffbe3b";
      ctx.beginPath();
      ctx.ellipse(fx, py + 56, 9, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff6cc";
      ctx.beginPath();
      ctx.ellipse(fx, py + 60, 4, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // User's placed decorations mapped onto the cake area
    const symbolMap: Record<string, string> = {
      heart: "♥",
      star: "✦",
      sparkle: "✧",
      ube: "🟣",
      "ube-flower": "✿",
      "ube-cream": " swirl ",
    };
    ctx.font = "24px Georgia, serif";
    decorations.forEach((d) => {
      const dx = 160 + d.x * 400;
      const dy = py + 110 + d.y * 350;
      ctx.fillStyle = "#ffe5f0";
      ctx.fillText(symbolMap[d.id] ?? "♡", dx, dy);
    });

    // Mood pills along bottom of photo
    if (moodLabels.length > 0) {
      ctx.font = "bold 16px Trebuchet MS, sans-serif";
      ctx.fillStyle = "#6c3680";
      ctx.fillText(moodLabels.join("  ·  "), 360, py + ph - 28);
    }

    // Polaroid caption below photo
    ctx.fillStyle = "#5f2f70";
    ctx.font = "italic bold 32px Georgia, serif";
    ctx.fillText(`Selamat Ulang Tahun ke-${age}, ${recipient}! ♡`, 360, 725);

    ctx.fillStyle = "#8a6d8f";
    ctx.font = "18px Trebuchet MS, sans-serif";
    ctx.fillText(
      `Kue Ube Spesial (${decorations.length} dekorasi) · Dari ${sender}`,
      360,
      775,
    );

    ctx.fillStyle = "#bd637b";
    ctx.font = "bold 16px Trebuchet MS, sans-serif";
    ctx.fillText("✦ EDISI KENANGAN 30 TAHUN ✦", 360, 830);

    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `bara-${age}th-polaroid.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    link.remove();
    return true;
  } catch {
    return false;
  }
}



