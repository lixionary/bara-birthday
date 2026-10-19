import defaults from "../server/default-content.json";
import { installContent } from "./content/birthday";
import { describe, expect, it } from "vitest";
import { birthday } from "./content/birthday";
import {
  DECORATION_LIMIT,
  MOOD_LIMIT,
  STORAGE_KEY,
  initialState,
  loadState,
  reducer,
  restoreState,
  saveState,
  type BirthdayState,
} from "./state";

installContent(defaults);

function reachCake(): BirthdayState {
  let state = reducer(initialState(), { type: "GO", stage: 1 });
  for (const mood of birthday.moods.slice(0, 3))
    state = reducer(state, { type: "TOGGLE_MOOD", id: mood.id });
  state = reducer(state, { type: "GO", stage: 2 });
  for (const gift of birthday.gifts)
    state = reducer(state, { type: "OPEN", id: gift.id });
  return reducer(state, { type: "GO", stage: 3 });
}

describe("birthday journey", () => {
  it("caps choices at three and requires deselecting before replacement", () => {
    let state = reducer(initialState(), { type: "GO", stage: 1 });
    for (const mood of birthday.moods.slice(0, MOOD_LIMIT))
      state = reducer(state, { type: "TOGGLE_MOOD", id: mood.id });
    expect(state.caught).toHaveLength(MOOD_LIMIT);
    expect(reducer(state, { type: "TOGGLE_MOOD", id: "cool" })).toEqual(state);
    state = reducer(state, { type: "TOGGLE_MOOD", id: "cute" });
    expect(state.caught).toEqual(["angry", "sleepy"]);
    expect(reducer(state, { type: "GO", stage: 2 }).stage).toBe(1);
    state = reducer(state, { type: "TOGGLE_MOOD", id: "cool" });
    expect(state.caught).toEqual(["angry", "sleepy", "cool"]);
    expect(reducer(state, { type: "GO", stage: 2 }).stage).toBe(2);
  });

  it("preserves later progress when revisiting and changing moods", () => {
    let state = reducer(reachCake(), { type: "GO", stage: 1 });
    state = reducer(state, { type: "TOGGLE_MOOD", id: "cute" });
    expect(restoreState(JSON.stringify(state))).toEqual(state);
    state = reducer(state, { type: "TOGGLE_MOOD", id: "cool" });
    state = reducer(state, { type: "GO", stage: 3 });
    expect(state.stage).toBe(3);
    expect(state.opened).toHaveLength(3);
  });

  it("blocks skipping prerequisites, toggles repeated taps, and ignores unknown moods", () => {
    let state = reducer(initialState(), { type: "GO", stage: 5 });
    expect(state.stage).toBe(0);
    state = reducer(state, { type: "GO", stage: 1 });
    state = reducer(state, { type: "TOGGLE_MOOD", id: "cute" });
    state = reducer(state, { type: "TOGGLE_MOOD", id: "cute" });
    state = reducer(state, { type: "TOGGLE_MOOD", id: "unknown" });
    expect(state.caught).toEqual([]);
    expect(reducer(state, { type: "GO", stage: 2 }).stage).toBe(1);
    expect(reducer(state, { type: "BLOW" }).candlesBlown).toBe(false);
    expect(reducer(state, { type: "NEXT_LETTER" }).letterIndex).toBe(0);
  });

  it("allows an undecorated cake, requires extinguishing candles, and completes the letter", () => {
    let state = reducer(reachCake(), { type: "FINISH_CAKE" });
    expect(state.stage).toBe(4);
    expect(reducer(state, { type: "GO", stage: 5 }).stage).toBe(4);
    state = reducer(state, { type: "BLOW" });
    state = reducer(state, { type: "GO", stage: 5 });
    for (const _paragraph of birthday.letter)
      state = reducer(state, { type: "NEXT_LETTER" });
    expect(state.completed).toBe(true);
    expect(state.letterIndex).toBe(birthday.letter.length);
    expect(reducer(state, { type: "NEXT_LETTER" })).toEqual(state);
    state = reducer(state, { type: "GO", stage: 5 });
    expect(state.letterIndex).toBe(0);
    expect(state.completed).toBe(true);
    expect(reducer(state, { type: "GO", stage: 2 }).opened).toHaveLength(3);
  });

  it("limits and validates decorations, and supports Undo and Reset", () => {
    let state = reachCake();
    for (let i = 0; i < DECORATION_LIMIT + 3; i++)
      state = reducer(state, {
        type: "DECORATE",
        decoration: { id: "heart", x: 0.4, y: 0.5, rotation: 0 },
      });
    expect(state.decorations).toHaveLength(DECORATION_LIMIT);
    state = reducer(state, { type: "UNDO" });
    expect(state.decorations).toHaveLength(DECORATION_LIMIT - 1);
    const invalid = reducer(state, {
      type: "DECORATE",
      decoration: { id: "star", x: Infinity, y: 0.5, rotation: 0 },
    });
    expect(invalid).toEqual(state);
    state = reducer(state, {
      type: "MOVE_DECORATION",
      index: 0,
      x: 0.72,
      y: 0.44,
    });
    expect(state.decorations[0]).toEqual({
      id: "heart",
      x: 0.72,
      y: 0.44,
      rotation: 0,
    });
    expect(
      reducer(state, {
        type: "MOVE_DECORATION",
        index: 99,
        x: 0.5,
        y: 0.5,
      }),
    ).toEqual(state);
    expect(reducer(state, { type: "CLEAR_CAKE" }).decorations).toEqual([]);
  });

  it("supports relighting candles and navigating back and forth in the letter", () => {
    let state = reducer(reachCake(), { type: "FINISH_CAKE" });
    state = reducer(state, { type: "BLOW" });
    expect(state.candlesBlown).toBe(true);
    state = reducer(state, { type: "RELIGHT" });
    expect(state.candlesBlown).toBe(false);
    state = reducer(state, { type: "BLOW" });
    state = reducer(state, { type: "GO", stage: 5 });
    expect(reducer(state, { type: "PREV_LETTER" }).letterIndex).toBe(0);
    state = reducer(state, { type: "NEXT_LETTER" });
    expect(state.letterIndex).toBe(1);
    state = reducer(state, { type: "PREV_LETTER" });
    expect(state.letterIndex).toBe(0);
  });
});

describe("session recovery", () => {
  it("reduces old six-mood sessions to three without losing their progress", () => {
    const state = reachCake();
    const legacy = { ...state, caught: birthday.moods.map((m) => m.id) };
    expect(restoreState(JSON.stringify(legacy))).toEqual(state);
  });

  it("restores progress and decorations after refresh", () => {
    const state = reducer(reachCake(), {
      type: "DECORATE",
      decoration: { id: "cute", x: 0.5, y: 0.6, rotation: 12 },
    });
    expect(restoreState(JSON.stringify(state))).toEqual(state);
  });

  it.each([
    "not-json",
    "null",
    "{}",
    JSON.stringify({ ...initialState(), version: 2 }),
    JSON.stringify({ ...initialState(), stage: 5 }),
    JSON.stringify({ ...initialState(), caught: ["cute", "cute", "cute"] }),
    JSON.stringify({ ...initialState(), completed: true }),
  ])("safely rejects corrupted or impossible progress: %s", (raw) => {
    expect(restoreState(raw)).toEqual(initialState());
  });

  it("handles denied storage and clears saved progress on restart", () => {
    const blocked = {
      getItem: () => {
        throw new Error("Denied");
      },
      setItem: () => {
        throw new Error("Denied");
      },
      removeItem: () => {
        throw new Error("Denied");
      },
    };
    expect(loadState(blocked)).toEqual(initialState());
    expect(() => saveState(reachCake(), blocked)).not.toThrow();
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
      removeItem: (key: string) => {
        values.delete(key);
      },
    };
    saveState(reachCake(), storage);
    expect(values.has(STORAGE_KEY)).toBe(true);
    saveState(reducer(reachCake(), { type: "RESTART" }), storage);
    expect(values.has(STORAGE_KEY)).toBe(false);
  });
});
