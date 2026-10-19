import { birthday, decorations } from "./content/birthday";

export const STORAGE_KEY = "bara-birthday:v1";
export const DECORATION_LIMIT = 24;
export const MOOD_LIMIT = 3;
export type Stage = 0 | 1 | 2 | 3 | 4 | 5;
export type Decoration = { id: string; x: number; y: number; rotation: number };
export type BirthdayState = {
  version: 1;
  stage: Stage;
  caught: string[]; // Selected moods; keep this field name for existing sessions.
  opened: string[];
  decorations: Decoration[];
  cakeComplete: boolean;
  candlesBlown: boolean;
  letterIndex: number;
  completed: boolean;
};
export type Action =
  | { type: "GO"; stage: Stage }
  | { type: "TOGGLE_MOOD"; id: string }
  | { type: "OPEN"; id: string }
  | { type: "DECORATE"; decoration: Decoration }
  | { type: "UNDO" }
  | { type: "CLEAR_CAKE" }
  | { type: "FINISH_CAKE" }
  | { type: "BLOW" }
  | { type: "NEXT_LETTER" }
  | { type: "RESTART" };

export function initialState(): BirthdayState {
  return {
    version: 1,
    stage: 0,
    caught: [],
    opened: [],
    decorations: [],
    cakeComplete: false,
    candlesBlown: false,
    letterIndex: 0,
    completed: false,
  };
}

export function unlockedStage(state: BirthdayState): Stage {
  if (state.caught.length !== MOOD_LIMIT) return 1;
  if (state.opened.length < birthday.gifts.length) return 2;
  if (!state.cakeComplete) return 3;
  if (!state.candlesBlown) return 4;
  return 5;
}

function validDecoration(value: unknown): value is Decoration {
  if (!value || typeof value !== "object") return false;
  const d = value as Decoration;
  return (
    decorations.some((item) => item.id === d.id) &&
    Number.isFinite(d.x) &&
    d.x >= 0 &&
    d.x <= 1 &&
    Number.isFinite(d.y) &&
    d.y >= 0 &&
    d.y <= 1 &&
    Number.isFinite(d.rotation) &&
    Math.abs(d.rotation) <= 180
  );
}

export function reducer(state: BirthdayState, action: Action): BirthdayState {
  switch (action.type) {
    case "RESTART":
      return initialState();
    case "GO":
      return action.stage <= unlockedStage(state)
        ? {
            ...state,
            stage: action.stage,
            letterIndex: action.stage === 5 ? 0 : state.letterIndex,
          }
        : state;
    case "TOGGLE_MOOD":
      if (state.stage !== 1 || !birthday.moods.some((m) => m.id === action.id))
        return state;
      if (state.caught.includes(action.id))
        return {
          ...state,
          caught: state.caught.filter((id) => id !== action.id),
        };
      return state.caught.length < MOOD_LIMIT
        ? { ...state, caught: [...state.caught, action.id] }
        : state;
    case "OPEN":
      return state.stage === 2 &&
        birthday.gifts.some((g) => g.id === action.id) &&
        !state.opened.includes(action.id)
        ? { ...state, opened: [...state.opened, action.id] }
        : state;
    case "DECORATE":
      return state.stage === 3 &&
        state.decorations.length < DECORATION_LIMIT &&
        validDecoration(action.decoration)
        ? { ...state, decorations: [...state.decorations, action.decoration] }
        : state;
    case "UNDO":
      return state.stage === 3
        ? { ...state, decorations: state.decorations.slice(0, -1) }
        : state;
    case "CLEAR_CAKE":
      return state.stage === 3 ? { ...state, decorations: [] } : state;
    case "FINISH_CAKE":
      return state.stage === 3
        ? { ...state, cakeComplete: true, stage: 4 }
        : state;
    case "BLOW":
      return state.stage === 4 ? { ...state, candlesBlown: true } : state;
    case "NEXT_LETTER": {
      if (state.stage !== 5 || state.letterIndex >= birthday.letter.length)
        return state;
      const letterIndex = state.letterIndex + 1;
      return {
        ...state,
        letterIndex,
        completed: state.completed || letterIndex === birthday.letter.length,
      };
    }
  }
}

function validIds(value: unknown, ids: string[]): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((id) => typeof id === "string" && ids.includes(id)) &&
    new Set(value).size === value.length
  );
}

export function restoreState(raw: string | null): BirthdayState {
  try {
    if (!raw) return initialState();
    const s = JSON.parse(raw) as BirthdayState;
    if (
      !s ||
      s.version !== 1 ||
      !Number.isInteger(s.stage) ||
      s.stage < 0 ||
      s.stage > 5 ||
      !validIds(
        s.caught,
        birthday.moods.map((m) => m.id),
      ) ||
      !validIds(
        s.opened,
        birthday.gifts.map((g) => g.id),
      ) ||
      !Array.isArray(s.decorations) ||
      s.decorations.length > DECORATION_LIMIT ||
      !s.decorations.every(validDecoration) ||
      typeof s.cakeComplete !== "boolean" ||
      typeof s.candlesBlown !== "boolean" ||
      typeof s.completed !== "boolean" ||
      !Number.isInteger(s.letterIndex) ||
      s.letterIndex < 0 ||
      s.letterIndex > birthday.letter.length ||
      (s.cakeComplete && s.opened.length !== birthday.gifts.length) ||
      (s.candlesBlown && !s.cakeComplete) ||
      ((s.completed || s.letterIndex > 0) && !s.candlesBlown) ||
      (s.letterIndex === birthday.letter.length && !s.completed)
    )
      return initialState();
    // Older sessions could collect all six; retain their first three choices.
    const caught = s.caught.slice(0, MOOD_LIMIT);
    if (s.stage > unlockedStage({ ...s, caught })) return initialState();
    return {
      version: 1,
      stage: s.stage,
      caught,
      opened: s.opened,
      decorations: s.decorations,
      cakeComplete: s.cakeComplete,
      candlesBlown: s.candlesBlown,
      letterIndex: s.letterIndex,
      completed: s.completed,
    };
  } catch {
    return initialState();
  }
}

type SessionStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export function loadState(storage?: SessionStore): BirthdayState {
  try {
    return restoreState(
      (storage ?? window.sessionStorage).getItem(STORAGE_KEY),
    );
  } catch {
    return initialState();
  }
}
export function saveState(state: BirthdayState, storage?: SessionStore): void {
  try {
    const store = storage ?? window.sessionStorage;
    if (state.stage === 0 && !state.caught.length && !state.opened.length)
      store.removeItem(STORAGE_KEY);
    else store.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* Private browsing or full storage: continue in memory. */
  }
}
