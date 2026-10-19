import {
  useEffect,
  useReducer,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { birthday, copy, decorations, stickerUrl } from "./content/birthday";
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
  const [tool, setTool] = useState<string>("heart");
  const [announcement, setAnnouncement] = useState("");
  const [burst, setBurst] = useState(0);
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
    if (
      previousStage.current !== state.stage ||
      previousFinale.current !== finale
    ) {
      title.current?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "instant" });
      setSelectedMood(null);
      setSelectedGift(null);
      setAnnouncement("");
      setBurst(0);
    }
    previousStage.current = state.stage;
    previousFinale.current = finale;
  }, [state.stage, finale]);
  useEffect(() => {
    if (finale) setBurst((n) => n + 1);
  }, [finale]);

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
    sound.play();
  }
  function decorate(event: MouseEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (event.detail === 0) addDecoration(0.5, 0.62);
    else
      addDecoration(
        Math.max(
          0.08,
          Math.min(0.92, (event.clientX - rect.left) / rect.width),
        ),
        Math.max(
          0.18,
          Math.min(0.86, (event.clientY - rect.top) / rect.height),
        ),
      );
  }
  const mood = birthday.moods.find((m) => m.id === selectedMood);
  const gift = birthday.gifts.find((g) => g.id === selectedGift);
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
              <div className="welcome-collage" aria-hidden="true">
                <span className="collage-star star-one">✦</span>
                <span className="collage-star star-two">✧</span>
                <span className="collage-doodle">♡</span>
                <div className="speech-bubble">{copy.welcomeTag}</div>
                <div className="photo-card">
                  <span className="tape" />
                  <Sticker name="bara_hello" className="hello-sticker" />
                  <div className="handwritten photo-caption">
                    {copy.welcomePhoto} ♡
                  </div>
                </div>
                <div className="mini-sticker mini-cute">
                  <Sticker name="bara_cute" />
                </div>
                <div className="mini-sticker mini-angry">
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
                    {birthday.moods.map((m, i) => (
                      <button
                        type="button"
                        className={`mood-card mood-${i} ${state.caught.includes(m.id) ? "selected" : ""}`}
                        key={m.id}
                        onClick={() => {
                          dispatch({ type: "TOGGLE_MOOD", id: m.id });
                          setSelectedMood(
                            state.caught.includes(m.id)
                              ? (state.caught
                                  .filter((id) => id !== m.id)
                                  .at(-1) ?? null)
                              : m.id,
                          );
                          sound.play();
                        }}
                        aria-label={m.name}
                        aria-pressed={state.caught.includes(m.id)}
                        disabled={
                          !state.caught.includes(m.id) &&
                          state.caught.length >= MOOD_LIMIT
                        }
                      >
                        <span
                          className="mood-check"
                          aria-label={
                            state.caught.includes(m.id)
                              ? copy.moods.collected
                              : undefined
                          }
                        >
                          {state.caught.includes(m.id) ? "✓" : "✧"}
                        </span>
                        <Sticker name={m.sticker} />
                        <span className="handwritten">{m.label}</span>
                      </button>
                    ))}
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
                      ♡
                    </span>
                    <p>{mood?.message ?? copy.moods.instruction}</p>
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
                    {birthday.gifts.map((g, i) => (
                      <button
                        type="button"
                        className={`gift-card gift-${i} ${state.opened.includes(g.id) ? "opened" : ""} ${selectedGift === g.id ? "selected" : ""}`}
                        key={g.id}
                        aria-pressed={selectedGift === g.id}
                        onClick={() => {
                          dispatch({ type: "OPEN", id: g.id });
                          setSelectedGift(g.id);
                          sound.play();
                        }}
                      >
                        <span className="gift-number">NO. {g.number}</span>
                        {state.opened.includes(g.id) ? (
                          <Sticker name={g.sticker} />
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
                          {state.opened.includes(g.id)
                            ? copy.gifts.reread
                            : copy.gifts.open}{" "}
                          <Arrow />
                        </span>
                      </button>
                    ))}
                  </div>
                  {gift && (
                    <div
                      className="message-panel gift-message"
                      aria-live="polite"
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
                      >
                        <Cake />
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
                            onClick={() => setTool(d.id)}
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
                        sound.play();
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
                  <div className="wish-cake">
                    <Cake blown={state.candlesBlown} />
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
                  <div className="wish-buttons">
                    {!state.candlesBlown ? (
                      <button
                        type="button"
                        className="primary"
                        onClick={() => {
                          dispatch({ type: "BLOW" });
                          setBurst((n) => n + 1);
                          sound.play(true);
                        }}
                      >
                        ✧ {copy.candles.blow}
                      </button>
                    ) : (
                      <>
                        <p className="wish-success" role="status">
                          {copy.candles.blown}
                        </p>
                        <button
                          type="button"
                          className="primary"
                          onClick={() => go(5)}
                        >
                          {copy.candles.next}
                          <Arrow />
                        </button>
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
                  <article className="letter-paper">
                    <span className="tape" />
                    <div className="letter-greeting handwritten">
                      {copy.letter.greeting}
                    </div>
                    <div
                      className="letter-paragraph"
                      aria-live="polite"
                      aria-atomic="true"
                    >
                      <p key={state.letterIndex}>
                        {birthday.letter[state.letterIndex]}
                      </p>
                    </div>
                    <div className="letter-signature handwritten">
                      — {birthday.sender}
                    </div>
                    <div className="letter-bottom">
                      <span className="progress-note">
                        {copy.letter.page} {state.letterIndex + 1}/
                        {birthday.letter.length}
                      </span>
                      <button
                        className="primary"
                        type="button"
                        onClick={() => {
                          sound.play(
                            state.letterIndex === birthday.letter.length - 1,
                          );
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
                  <Sticker
                    name="bara_birthday"
                    className="birthday-sticker"
                    alt={`Selamat ulang tahun, ${birthday.recipient}!`}
                  />
                  <p className="finale-message handwritten">
                    {birthday.ending}
                  </p>
                  <p className="finale-signature">
                    {copy.finale.signature} <b>{birthday.sender}</b>
                  </p>
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
