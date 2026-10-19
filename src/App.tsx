import {
  useEffect,
  useReducer,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from "react";
import {
  birthday,
  copy,
  decorations,
  settings,
  stickerUrl,
} from "./content/birthday";
import {
  DECORATION_LIMIT,
  MOOD_LIMIT,
  loadState,
  initialState,
  reducer,
  saveState,
  unlockedStage,
  type Stage,
} from "./state";
import { Confetti, useSound } from "./effects";
import Cake from "./Cake";

function Sticker({
  name,
  className = "",
  alt = "",
}: {
  name: string;
  className?: string;
  alt?: string;
}) {
  return (
    <img
      className={`sticker ${className}`}
      src={stickerUrl(name)}
      alt={alt}
      width={300}
      height={360}
      draggable={false}
    />
  );
}

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}

const WELCOME_BADGES = [
  "special delivery!",
  "edisi 30 tahun ✨",
  "siap pesta ube! 🎂",
  "tim Bara bertugas ♡",
];

export default function App({
  preview = false,
  initialStage = 0,
  previewFinale = false,
}: {
  preview?: boolean;
  initialStage?: Stage;
  previewFinale?: boolean;
}) {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    if (!preview) return loadState();
    return {
      ...initialState(),
      stage: initialStage,
      caught:
        initialStage >= 2 ? birthday.moods.slice(0, 3).map((m) => m.id) : [],
      opened: initialStage >= 3 ? birthday.gifts.map((g) => g.id) : [],
      cakeComplete: initialStage >= 4,
      candlesBlown: initialStage >= 5,
      letterIndex: previewFinale ? birthday.letter.length : 0,
      completed: previewFinale,
    };
  });
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedGift, setSelectedGift] = useState<string | null>(null);
  const [justOpenedGift, setJustOpenedGift] = useState<string | null>(null);
  const [tool, setTool] = useState<string>("heart");
  const [announcement, setAnnouncement] = useState("");
  const [burst, setBurst] = useState(0);

  // Welcome collage interactivity
  const [welcomeBadgeIdx, setWelcomeBadgeIdx] = useState(0);
  const [bouncingSticker, setBouncingSticker] = useState<string | null>(null);
  const [collageTilt, setCollageTilt] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  // Cake Studio interactivity (bounce, cursor preview, placement burst, drag)
  const [cakeBounce, setCakeBounce] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [placementBurst, setPlacementBurst] = useState<{
    x: number;
    y: number;
    key: number;
  } | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [wiggleIndex, setWiggleIndex] = useState<number | null>(null);
  const dragRef = useRef<{
    index: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const suppressNextClickRef = useRef(false);

  // Stage 4 individual candle state & flame tilt
  const digitCount = String(settings.age).length;
  const [blownDigits, setBlownDigits] = useState<boolean[]>(() =>
    Array(digitCount).fill(state.candlesBlown),
  );
  const [flameTilt, setFlameTilt] = useState(0);

  // Stage 5 letter page flip direction
  const [letterDir, setLetterDir] = useState<"next" | "prev">("next");

  const title = useRef<HTMLHeadingElement>(null);
  const previousStage = useRef(state.stage);
  const sound = useSound();
  const finale =
    state.stage === 5 && state.letterIndex === birthday.letter.length;
  const previousFinale = useRef(finale);

  useEffect(() => {
    if (!preview) saveState(state);
  }, [state, preview]);

  useEffect(() => {
    setBlownDigits(Array(digitCount).fill(state.candlesBlown));
  }, [state.candlesBlown, digitCount]);

  useEffect(() => {
    if (
      previousStage.current !== state.stage ||
      previousFinale.current !== finale
    ) {
      title.current?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "instant" });
      setSelectedMood(null);
      setSelectedGift(null);
      setJustOpenedGift(null);
      setAnnouncement("");
      setBurst(0);
      setCursorPos(null);
      setPlacementBurst(null);
      setFlameTilt(0);
      if (state.stage === 4 && !state.candlesBlown) {
        sound.play("sparkle");
      }
    }
    previousStage.current = state.stage;
    previousFinale.current = finale;
  }, [state.stage, finale, state.candlesBlown, sound]);

  useEffect(() => {
    if (finale) setBurst((n) => n + 1);
  }, [finale]);

  function triggerCakeBounce() {
    setCakeBounce(false);
    requestAnimationFrame(() => {
      setCakeBounce(true);
    });
  }

  function go(stage: Stage) {
    sound.play();
    dispatch({ type: "GO", stage });
  }

  function addDecoration(x: number, y: number, id = tool) {
    if (state.decorations.length >= DECORATION_LIMIT) {
      setAnnouncement(copy.cake.limit);
      return;
    }
    dispatch({
      type: "DECORATE",
      decoration: { id, x, y, rotation: Math.random() * 28 - 14 },
    });
    setAnnouncement(copy.cake.added);
    triggerCakeBounce();
    setPlacementBurst({ x, y, key: Date.now() + Math.random() });
    sound.play("pop");
  }

  function findNearbyDecoration(normX: number, normY: number): number {
    for (let i = state.decorations.length - 1; i >= 0; i--) {
      const d = state.decorations[i];
      if (Math.hypot(d.x - normX, d.y - normY) <= 0.065) {
        return i;
      }
    }
    return -1;
  }

  function handleCakePointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (!event.isPrimary || state.decorations.length === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const normX = (event.clientX - rect.left) / rect.width;
    const normY = (event.clientY - rect.top) / rect.height;
    const hitIndex = findNearbyDecoration(normX, normY);
    if (hitIndex !== -1) {
      dragRef.current = {
        index: hitIndex,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
      };
    }
  }

  function handleCakePointerMove(event: PointerEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const clampedX = Math.max(
      0.08,
      Math.min(0.92, (event.clientX - rect.left) / rect.width),
    );
    const clampedY = Math.max(
      0.18,
      Math.min(0.86, (event.clientY - rect.top) / rect.height),
    );
    setCursorPos({ x: clampedX, y: clampedY });

    if (dragRef.current) {
      const dist = Math.hypot(
        event.clientX - dragRef.current.startX,
        event.clientY - dragRef.current.startY,
      );
      if (dist > 6) {
        dragRef.current.moved = true;
        setDraggingIndex(dragRef.current.index);
        dispatch({
          type: "MOVE_DECORATION",
          index: dragRef.current.index,
          x: clampedX,
          y: clampedY,
        });
      }
    }
  }

  function handleCakePointerUp() {
    if (dragRef.current?.moved) {
      suppressNextClickRef.current = true;
      setWiggleIndex(dragRef.current.index);
      triggerCakeBounce();
      sound.play("pop");
    }
    dragRef.current = null;
    setDraggingIndex(null);
  }

  function decorate(event: MouseEvent<HTMLButtonElement>) {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    if (event.detail === 0) {
      addDecoration(0.5, 0.62);
      return;
    }
    const normX = Math.max(
      0.08,
      Math.min(0.92, (event.clientX - rect.left) / rect.width),
    );
    const normY = Math.max(
      0.18,
      Math.min(0.86, (event.clientY - rect.top) / rect.height),
    );
    if (state.decorations.length >= DECORATION_LIMIT) {
      const hitIndex = findNearbyDecoration(normX, normY);
      if (hitIndex !== -1) {
        setWiggleIndex(hitIndex);
        sound.play("pop");
      }
      setAnnouncement(copy.cake.limit);
      return;
    }
    addDecoration(normX, normY);
  }

  function handleBlowDigit(index: number) {
    if (state.candlesBlown || blownDigits[index]) return;
    const next = blownDigits.map((b, i) => (i === index ? true : b));
    setBlownDigits(next);
    if (next.every(Boolean)) {
      dispatch({ type: "BLOW" });
      setBurst((n) => n + 1);
      sound.play("melody");
    } else {
      sound.play("blow");
      setAnnouncement("Satu lilin padam! Tiup satu lagi.");
    }
  }

  function handleBlowAll() {
    setBlownDigits(Array(digitCount).fill(true));
    dispatch({ type: "BLOW" });
    setBurst((n) => n + 1);
    sound.play("melody");
  }

  function handleRelight() {
    dispatch({ type: "RELIGHT" });
    setBlownDigits(Array(digitCount).fill(false));
    sound.play("sparkle");
    setAnnouncement("Lilin dinyalakan kembali.");
  }

  const mood = birthday.moods.find((m) => m.id === selectedMood);
  const gift = birthday.gifts.find((g) => g.id === selectedGift);
  const activeToolItem =
    decorations.find((t) => t.id === tool) ?? decorations[0];
  const heading = finale
    ? `${copy.finale.heading} ${birthday.recipient}!`
    : [
        copy.moods.heading,
        copy.gifts.heading,
        copy.cake.heading,
        copy.candles.heading,
        copy.letter.heading,
      ][state.stage - 1];
  const stageCopy = [
    copy.moods,
    copy.gifts,
    copy.cake,
    copy.candles,
    copy.letter,
  ][Math.max(0, state.stage - 1)];

  return (
    <div className="app-shell">
      <a className="skip-link" href="#adventure">
        {copy.skip}
      </a>
      <header className="site-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            b<span>♡</span>
          </span>
          <div>
            <span className="brand-title">{birthday.title}</span>
            <span className="brand-note">{copy.brandNote}</span>
          </div>
        </div>
        <div className="header-tools">
          <span className="header-note">{copy.headerNote}</span>
          <button
            className="sound-button"
            type="button"
            onClick={sound.toggle}
            aria-pressed={sound.enabled}
            disabled={!sound.available}
          >
            <span aria-hidden="true">{sound.enabled ? "♫" : "♪"}</span>
            <span>
              {!sound.available
                ? copy.soundUnavailable
                : sound.enabled
                  ? copy.soundOn
                  : copy.soundOff}
            </span>
          </button>
        </div>
      </header>

      <main id="adventure" className="main-content">
        <nav className="steps" aria-label={copy.progress}>
          {birthday.stages.map((label, i) => (
            <button
              key={label}
              type="button"
              className={`step ${i === state.stage ? "active" : ""} ${i < state.stage || state.completed ? "passed" : ""}`}
              aria-current={i === state.stage ? "step" : undefined}
              disabled={!preview && i > unlockedStage(state)}
              onClick={() => go(i as Stage)}
            >
              <span className="step-number">
                {i < state.stage || state.completed ? "✓" : `0${i + 1}`}
              </span>
              <span className="step-label">{label}</span>
            </button>
          ))}
        </nav>

        <section
          className={`scene scene-${state.stage} ${finale ? "scene-finale" : ""}`}
          aria-labelledby="scene-title"
        >
          {state.stage === 0 ? (
            <div className="welcome-grid">
              <div className="welcome-copy">
                <div className="eyebrow">
                  <span className="tiny-star">✦</span>{" "}
                  {birthday.welcome.eyebrow}
                </div>
                <h1 id="scene-title" ref={title} tabIndex={-1}>
                  {birthday.welcome.headingLead}
                  <br />
                  {birthday.welcome.headingMiddle}{" "}
                  <em>{birthday.recipient}.</em>
                </h1>
                <p className="intro">{birthday.welcome.description}</p>
                <button type="button" className="primary" onClick={() => go(1)}>
                  {birthday.welcome.button}
                  <Arrow />
                </button>
                <p className="handwritten welcome-note">
                  {birthday.welcome.note}
                </p>
                <div className="delivery-stamp">
                  <span aria-hidden="true">♡</span>
                  <div>
                    {copy.welcomeStamp}
                    <small>{copy.welcomeMini}</small>
                  </div>
                </div>
              </div>
              <div
                className="welcome-collage"
                aria-hidden="true"
                style={
                  {
                    "--tilt-x": `${collageTilt.x}deg`,
                    "--tilt-y": `${collageTilt.y}deg`,
                  } as React.CSSProperties
                }
                onPointerMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const nx = (e.clientX - rect.left) / rect.width - 0.5;
                  const ny = (e.clientY - rect.top) / rect.height - 0.5;
                  setCollageTilt({ x: nx * 8, y: -ny * 8 });
                }}
                onPointerLeave={() => setCollageTilt({ x: 0, y: 0 })}
              >
                <span className="collage-star star-one">✦</span>
                <span className="collage-star star-two">✧</span>
                <span className="collage-doodle">♡</span>
                <div className="milestone-pill">
                  ✦ {settings.age}th Birthday Edition
                </div>
                <div
                  className="speech-bubble"
                  onClick={() => {
                    setWelcomeBadgeIdx(
                      (i) => (i + 1) % WELCOME_BADGES.length,
                    );
                    sound.play("pop");
                  }}
                >
                  {welcomeBadgeIdx === 0
                    ? copy.welcomeTag
                    : WELCOME_BADGES[welcomeBadgeIdx]}
                </div>
                <div
                  className={`photo-card ${bouncingSticker === "hello" ? "sticker-hop" : ""}`}
                  onClick={() => {
                    setBouncingSticker("hello");
                    setWelcomeBadgeIdx(
                      (i) => (i + 1) % WELCOME_BADGES.length,
                    );
                    sound.play("pop");
                  }}
                  onAnimationEnd={() => setBouncingSticker(null)}
                >
                  <span className="tape" />
                  <Sticker name="bara_hello" className="hello-sticker" />
                  <div className="handwritten photo-caption">
                    {copy.welcomePhoto} ♡
                  </div>
                </div>
                <div
                  className={`mini-sticker mini-cute ${bouncingSticker === "cute" ? "sticker-hop" : ""}`}
                  onClick={() => {
                    setBouncingSticker("cute");
                    sound.play("pop");
                  }}
                  onAnimationEnd={() => setBouncingSticker(null)}
                >
                  <Sticker name="bara_cute" />
                </div>
                <div
                  className={`mini-sticker mini-angry ${bouncingSticker === "angry" ? "sticker-hop" : ""}`}
                  onClick={() => {
                    setBouncingSticker("angry");
                    sound.play("pop");
                  }}
                  onAnimationEnd={() => setBouncingSticker(null)}
                >
                  <Sticker name="bara_angry" />
                </div>
                <div className="mini-label handwritten">
                  {copy.welcomeAside}
                </div>
                <div className="collage-sparkles">✳ · ✧</div>
              </div>
            </div>
          ) : (
            <>
              <div className="scene-heading">
                <div className="eyebrow">
                  {finale ? copy.finale.eyebrow : stageCopy.eyebrow}
                </div>
                <h1 id="scene-title" ref={title} tabIndex={-1}>
                  {heading}
                </h1>
                <p className="intro">
                  {finale ? copy.finale.description : stageCopy.description}
                </p>
              </div>

              {state.stage === 1 && (
                <>
                  <div className="mood-grid">
                    {birthday.moods.map((m, i) => {
                      const isSelected = state.caught.includes(m.id);
                      return (
                        <button
                          type="button"
                          className={`mood-card mood-${i} ${isSelected ? "selected" : ""}`}
                          key={m.id}
                          onClick={() => {
                            const willSelect = !isSelected;
                            dispatch({ type: "TOGGLE_MOOD", id: m.id });
                            setSelectedMood(
                              isSelected
                                ? (state.caught
                                    .filter((id) => id !== m.id)
                                    .at(-1) ?? null)
                                : m.id,
                            );
                            sound.play(
                              willSelect &&
                                state.caught.length + 1 === MOOD_LIMIT
                                ? "sparkle"
                                : "pop",
                            );
                          }}
                          aria-label={m.name}
                          aria-pressed={isSelected}
                          disabled={
                            !isSelected && state.caught.length >= MOOD_LIMIT
                          }
                        >
                          <span
                            className="mood-check"
                            aria-label={
                              isSelected ? copy.moods.collected : undefined
                            }
                          >
                            {isSelected ? "✓" : "✧"}
                          </span>
                          {isSelected && (
                            <span
                              className="mood-sparkles"
                              aria-hidden="true"
                            >
                              <i>♡</i>
                              <i>✦</i>
                            </span>
                          )}
                          <Sticker name={m.sticker} />
                          <span className="handwritten">{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p
                    className="mood-selection-hint progress-note"
                    role="status"
                  >
                    {state.caught.length === MOOD_LIMIT
                      ? copy.moods.limit
                      : copy.moods.hint}
                  </p>
                  <div className="message-panel" aria-live="polite">
                    <span className="message-icon" aria-hidden="true">
                      {mood ? "✦" : "♡"}
                    </span>
                    <p key={mood?.id ?? "empty"}>
                      {mood?.message ?? copy.moods.instruction}
                    </p>
                  </div>
                  <div className="scene-actions">
                    <span className="progress-note">
                      <b>
                        {state.caught.length}/{MOOD_LIMIT}
                      </b>{" "}
                      {copy.moods.count}
                    </span>
                    <button
                      className="primary"
                      type="button"
                      disabled={state.caught.length !== MOOD_LIMIT}
                      onClick={() => go(2)}
                    >
                      {copy.moods.continue}
                      <Arrow />
                    </button>
                  </div>
                </>
              )}

              {state.stage === 2 && (
                <>
                  <div className="gift-grid">
                    {birthday.gifts.map((g, i) => {
                      const isOpened = state.opened.includes(g.id);
                      const isJustOpened = justOpenedGift === g.id;
                      return (
                        <button
                          type="button"
                          className={`gift-card gift-${i} ${isOpened ? "opened" : ""} ${isJustOpened ? "just-opened" : ""} ${selectedGift === g.id ? "selected" : ""}`}
                          key={g.id}
                          aria-pressed={selectedGift === g.id}
                          onClick={() => {
                            const firstTime = !isOpened;
                            dispatch({ type: "OPEN", id: g.id });
                            setSelectedGift(g.id);
                            setJustOpenedGift(g.id);
                            sound.play(firstTime ? "unwrap" : "pop");
                          }}
                        >
                          <span className="gift-number">NO. {g.number}</span>
                          {isOpened ? (
                            <div className="gift-reveal-stage">
                              <span
                                className="gift-unwrap-fx"
                                aria-hidden="true"
                              >
                                <i className="fx-lid" />
                                <i className="fx-star fx-1">✦</i>
                                <i className="fx-star fx-2">♡</i>
                                <i className="fx-star fx-3">✧</i>
                              </span>
                              <Sticker name={g.sticker} />
                            </div>
                          ) : (
                            <div className="gift-box" aria-hidden="true">
                              <span className="bow left" />
                              <span className="bow right" />
                              <div className="gift-lid" />
                              <div className="gift-ribbon" />
                            </div>
                          )}
                          <span className="gift-title">{g.title}</span>
                          <span className="gift-subtitle">{g.subtitle}</span>
                          <span className="gift-link">
                            {isOpened ? copy.gifts.reread : copy.gifts.open}{" "}
                            <Arrow />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {gift && (
                    <div
                      className="message-panel gift-message"
                      aria-live="polite"
                      key={gift.id}
                    >
                      <span className="message-icon" aria-hidden="true">
                        ✦
                      </span>
                      <div>
                        <h2>{gift.title}</h2>
                        <p>{gift.message}</p>
                      </div>
                    </div>
                  )}
                  <div className="scene-actions">
                    <span className="progress-note">
                      <b>{state.opened.length}/3</b> {copy.gifts.count}
                    </span>
                    <button
                      className="primary"
                      type="button"
                      disabled={state.opened.length < 3}
                      onClick={() => go(3)}
                    >
                      {copy.gifts.continue}
                      <Arrow />
                    </button>
                  </div>
                </>
              )}

              {state.stage === 3 && (
                <>
                  <div className="cake-studio">
                    <div className="cake-workspace">
                      <button
                        className="cake-surface"
                        type="button"
                        aria-label={copy.cake.surface}
                        onClick={decorate}
                        onPointerDown={handleCakePointerDown}
                        onPointerMove={handleCakePointerMove}
                        onPointerUp={handleCakePointerUp}
                        onPointerCancel={handleCakePointerUp}
                        onPointerLeave={() => {
                          setCursorPos(null);
                          handleCakePointerUp();
                        }}
                      >
                        <Cake unlit bouncing={cakeBounce} />

                        {/* Floating ghost preview of active tool */}
                        {cursorPos &&
                          draggingIndex === null &&
                          state.decorations.length < DECORATION_LIMIT && (
                            <span
                              className="tool-preview"
                              style={{
                                left: `${cursorPos.x * 100}%`,
                                top: `${cursorPos.y * 100}%`,
                              }}
                              aria-hidden="true"
                            >
                              {"symbol" in activeToolItem
                                ? activeToolItem.symbol
                                : "✦"}
                            </span>
                          )}

                        {/* Sparkle burst on placement */}
                        {placementBurst && (
                          <span
                            key={placementBurst.key}
                            className="placement-burst"
                            style={{
                              left: `${placementBurst.x * 100}%`,
                              top: `${placementBurst.y * 100}%`,
                            }}
                            aria-hidden="true"
                          >
                            <i>✦</i>
                            <i>✧</i>
                            <i>♥</i>
                            <i>✦</i>
                          </span>
                        )}

                        {state.decorations.map((d, i) => {
                          const item = decorations.find((t) => t.id === d.id)!;
                          return (
                            <span
                              key={i}
                              className={`decoration decoration-${d.id} ${draggingIndex === i ? "dragging" : ""} ${wiggleIndex === i ? "wiggle" : ""}`}
                              style={{
                                left: `${d.x * 100}%`,
                                top: `${d.y * 100}%`,
                                transform: `translate(-50%, -50%) rotate(${d.rotation}deg)`,
                              }}
                              onAnimationEnd={() => {
                                if (wiggleIndex === i) setWiggleIndex(null);
                              }}
                              aria-hidden="true"
                            >
                              {"symbol" in item ? (
                                item.symbol
                              ) : (
                                <Sticker name={item.sticker} />
                              )}
                            </span>
                          );
                        })}
                      </button>
                      <p className="handwritten">{copy.cake.optional}</p>
                    </div>
                    <aside className="palette">
                      <div className="eyebrow">{copy.cake.palette}</div>
                      <div
                        className="tool-grid"
                        role="group"
                        aria-label={copy.cake.select}
                      >
                        {decorations.map((d) => (
                          <button
                            type="button"
                            key={d.id}
                            className={`decoration-tool ${d.id === tool ? "selected" : ""}`}
                            aria-pressed={d.id === tool}
                            aria-label={d.name}
                            onClick={() => {
                              setTool(d.id);
                              sound.play("pop");
                            }}
                          >
                            {"symbol" in d ? (
                              <span
                                className={`symbol-${d.id}`}
                                aria-hidden="true"
                              >
                                {d.symbol}
                              </span>
                            ) : (
                              <Sticker name={d.sticker} />
                            )}
                          </button>
                        ))}
                      </div>
                      <p className="keyboard-hint">{copy.cake.keyboard}</p>
                      <button
                        type="button"
                        className="secondary chaos"
                        disabled={state.decorations.length >= DECORATION_LIMIT}
                        onClick={() =>
                          addDecoration(
                            0.16 + Math.random() * 0.68,
                            0.32 + Math.random() * 0.4,
                            decorations[
                              Math.floor(Math.random() * decorations.length)
                            ].id,
                          )
                        }
                      >
                        ✧ {copy.cake.chaos}
                      </button>
                      <div className="tool-actions">
                        <button
                          type="button"
                          className="text-button"
                          disabled={!state.decorations.length}
                          onClick={() => {
                            dispatch({ type: "UNDO" });
                            setAnnouncement(copy.cake.removed);
                          }}
                        >
                          ↶ {copy.cake.undo}
                        </button>
                        <button
                          type="button"
                          className="text-button"
                          disabled={!state.decorations.length}
                          onClick={() => {
                            dispatch({ type: "CLEAR_CAKE" });
                            setAnnouncement(copy.cake.cleared);
                          }}
                        >
                          {copy.cake.reset}
                        </button>
                      </div>
                      <p className="progress-note">
                        {state.decorations.length}/{DECORATION_LIMIT}{" "}
                        {copy.cake.count}
                      </p>
                    </aside>
                  </div>
                  <div className="scene-actions">
                    <span className="progress-note">
                      {state.decorations.length >= DECORATION_LIMIT
                        ? copy.cake.limit
                        : ""}
                    </span>
                    <button
                      type="button"
                      className="primary"
                      onClick={() => {
                        dispatch({ type: "FINISH_CAKE" });
                        sound.play("sparkle");
                      }}
                    >
                      {copy.cake.done}
                      <Arrow />
                    </button>
                  </div>
                </>
              )}

              {state.stage === 4 && (
                <div className="wish-scene">
                  <div
                    className="wish-cake"
                    onPointerMove={(e) => {
                      if (state.candlesBlown) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const nx = (e.clientX - rect.left) / rect.width - 0.5;
                      setFlameTilt(Math.round(nx * 14));
                    }}
                    onPointerLeave={() => setFlameTilt(0)}
                  >
                    <Cake
                      blown={state.candlesBlown}
                      blownDigits={blownDigits}
                      onBlowDigit={handleBlowDigit}
                      flameTilt={flameTilt}
                    />
                    {state.decorations.map((d, i) => {
                      const item = decorations.find((t) => t.id === d.id)!;
                      return (
                        <span
                          key={i}
                          className={`decoration decoration-${d.id}`}
                          style={{
                            left: `${d.x * 100}%`,
                            top: `${d.y * 100}%`,
                            transform: `translate(-50%, -50%) rotate(${d.rotation}deg)`,
                          }}
                          aria-hidden="true"
                        >
                          {"symbol" in item ? (
                            item.symbol
                          ) : (
                            <Sticker name={item.sticker} />
                          )}
                        </span>
                      );
                    })}
                  </div>
                  <p className="handwritten wish-caption">
                    {copy.candles.caption}
                  </p>
                  {!state.candlesBlown && (
                    <p className="candle-tap-hint" aria-hidden="true">
                      {blownDigits.some(Boolean)
                        ? "✦ Satu lilin padam! Ketuk lilin satunya lagi atau tekan tombol di bawah"
                        : `✦ Ketuk lilin angka ${settings.age} langsung di atas kue, atau tekan tombol`}
                    </p>
                  )}
                  <div className="wish-buttons">
                    {!state.candlesBlown ? (
                      <button
                        type="button"
                        className="primary"
                        onClick={handleBlowAll}
                      >
                        ✧ {copy.candles.blow}
                      </button>
                    ) : (
                      <>
                        <p className="wish-success" role="status">
                          {copy.candles.blown}
                        </p>
                        <div className="wish-complete-actions">
                          <button
                            type="button"
                            className="primary"
                            onClick={() => go(5)}
                          >
                            {copy.candles.next}
                            <Arrow />
                          </button>
                          <button
                            type="button"
                            className="text-button relight-button"
                            onClick={handleRelight}
                          >
                            ↺ Nyalakan lagi
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {state.stage === 5 && !finale && (
                <div className="letter-layout">
                  <div className="letter-illustration" aria-hidden="true">
                    <Sticker name="bara_like_this" />
                    <span className="handwritten">{copy.letter.envelope}</span>
                    <span className="letter-heart">♡</span>
                  </div>
                  <article
                    className={`letter-paper letter-flip-${letterDir}`}
                    key={state.letterIndex}
                  >
                    <span className="tape" />
                    <div className="letter-greeting handwritten">
                      {copy.letter.greeting}
                    </div>
                    <div
                      className="letter-paragraph"
                      aria-live="polite"
                      aria-atomic="true"
                    >
                      <p>{birthday.letter[state.letterIndex]}</p>
                    </div>
                    <div className="letter-signature handwritten">
                      — {birthday.sender}
                    </div>
                    <div className="letter-bottom">
                      <div className="letter-pager">
                        {state.letterIndex > 0 && (
                          <button
                            type="button"
                            className="text-button letter-prev"
                            onClick={() => {
                              setLetterDir("prev");
                              sound.play("pop");
                              dispatch({ type: "PREV_LETTER" });
                            }}
                          >
                            ← Sebelumnya
                          </button>
                        )}
                        <span className="progress-note">
                          {copy.letter.page} {state.letterIndex + 1}/
                          {birthday.letter.length}
                        </span>
                      </div>
                      <button
                        className="primary"
                        type="button"
                        onClick={() => {
                          setLetterDir("next");
                          const isLast =
                            state.letterIndex === birthday.letter.length - 1;
                          sound.play(isLast ? "melody" : "pop");
                          dispatch({ type: "NEXT_LETTER" });
                        }}
                      >
                        {state.letterIndex === birthday.letter.length - 1
                          ? copy.letter.finish
                          : copy.letter.next}
                        <Arrow />
                      </button>
                    </div>
                  </article>
                </div>
              )}

              {finale && (
                <div className="finale">
                  <div className="finale-milestone-badge" aria-hidden="true">
                    ✦ CHAPTER {settings.age} · DIRTY THIRTY CLUB ✦
                  </div>
                  <div
                    className="finale-sticker-stage"
                    onClick={() => {
                      setBurst((n) => n + 1);
                      sound.play("melody");
                    }}
                  >
                    <Sticker
                      name="bara_birthday"
                      className="birthday-sticker"
                      alt={`Selamat ulang tahun, ${birthday.recipient}!`}
                    />
                  </div>
                  <p className="finale-message handwritten">
                    {birthday.ending}
                  </p>
                  <p className="finale-signature">
                    {copy.finale.signature} <b>{birthday.sender}</b>
                  </p>
                  <div className="finale-party-action">
                    <button
                      type="button"
                      className="secondary party-burst-button"
                      onClick={() => {
                        setBurst((n) => n + 1);
                        sound.play("melody");
                      }}
                    >
                      🎉 Rayakan {settings.age} tahun lagi!
                    </button>
                  </div>
                  <div className="revisit">
                    <h2>{copy.finale.revisit}</h2>
                    <div className="revisit-buttons">
                      {copy.finale.activities.map((label, i) => (
                        <button
                          className="secondary"
                          type="button"
                          key={label}
                          onClick={() => go((i + 1) as Stage)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="finale-links">
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => go(5)}
                      >
                        {copy.finale.reread}
                      </button>
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => {
                          dispatch({ type: "RESTART" });
                          setTool("heart");
                        }}
                      >
                        {copy.finale.restart} ↻
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
        {state.stage > 0 && !finale && (
          <button
            type="button"
            className="back-button text-button"
            onClick={() => go((state.stage - 1) as Stage)}
          >
            ← {copy.return}
          </button>
        )}
        <div className="sr-only" role="status" aria-live="polite">
          {announcement}
        </div>
        <Confetti key={state.stage} burst={burst} />
      </main>
      <footer className="site-footer">
        <span>
          {copy.footer} <span aria-hidden="true">♡</span> {birthday.sender}
        </span>
        <span className="footer-note">{copy.footerNote}</span>
      </footer>
    </div>
  );
}

