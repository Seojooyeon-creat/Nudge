// Door-sign skins (문패 디자인). A theme is a user-level choice persisted on the
// profile (users.theme) so friends see your chosen material too. Each theme is a
// flat bag of style values consumed by DoorSign / ThemePickerModal / friend rows.
//
// A theme may also carry a `decoration`: a small emoji prop that sits beside the
// sign (e.g. a bottle next to it) to give the skin a "concept". For now these are
// plain emoji; they can later be swapped for custom illustrations.
//
// Optional 3D material accents (consumed by DoorSign; safe to omit — sensible
// tones are derived from the plate color when absent):
//   bevelLight / bevelDark — highlight & shadow edges of the raised plate
//   screw: { base, light, dark } — corner screw-head tones (e.g. brass on wood)
//
// Keep ids in sync with the backend whitelist (schemas.THEMES).

// Warm brass screws suit the wood/paper plates; cool steel suits dark metal.
const BRASS = { base: "#c9a44c", light: "#f0d98a", dark: "#7d5e1f" };
const STEEL = { base: "#aab0bb", light: "#e6e9ef", dark: "#565c68" };

export const DEFAULT_THEME = "wood";

// decoration.position: "bottom-right" | "bottom-left" | "top-right" | "top-left"
export const THEMES = [
  {
    id: "wood",
    name: "나무",
    frame: { borderWidth: 2, borderColor: "#222", borderRadius: 6, backgroundColor: "#fafaf7" },
    cellBg: "#fafaf7",
    cellActiveBg: "#fff",
    dividerColor: "#333",
    charColor: "#333",
    charActiveColor: "#111",
    plusColor: "#ccc",
    arrowColor: "#e53935",
    screw: BRASS,
    decoration: null,
  },
  {
    id: "metal",
    name: "메탈",
    frame: { borderWidth: 2, borderColor: "#5a6473", borderRadius: 4, backgroundColor: "#2d3748" },
    cellBg: "#2d3748",
    cellActiveBg: "#1a202c",
    dividerColor: "#5a6473",
    charColor: "#cbd5e0",
    charActiveColor: "#ffffff",
    plusColor: "#4a5568",
    arrowColor: "#f56565",
    screw: STEEL,
    decoration: null,
  },
  {
    id: "hanji",
    name: "한지",
    frame: { borderWidth: 2, borderColor: "#9c7a52", borderRadius: 16, backgroundColor: "#f5efe1" },
    cellBg: "#f5efe1",
    cellActiveBg: "#fffaf0",
    dividerColor: "#cbb994",
    charColor: "#5d4037",
    charActiveColor: "#3e2723",
    plusColor: "#cbb994",
    arrowColor: "#c0392b",
    screw: BRASS,
    decoration: null,
  },
  {
    id: "neon",
    name: "네온",
    frame: { borderWidth: 2, borderColor: "#00e5ff", borderRadius: 10, backgroundColor: "#14132b" },
    cellBg: "#14132b",
    cellActiveBg: "#241f44",
    dividerColor: "#3a2f6b",
    charColor: "#b388ff",
    charActiveColor: "#ffffff",
    plusColor: "#3a2f6b",
    arrowColor: "#ff4081",
    screw: STEEL,
    decoration: null,
  },
  // ---- concept themes (decorated) ----
  {
    id: "pub",
    name: "한잔",
    frame: { borderWidth: 2, borderColor: "#7a5a3c", borderRadius: 8, backgroundColor: "#f7efe3" },
    cellBg: "#f7efe3",
    cellActiveBg: "#fffaf0",
    dividerColor: "#caa97f",
    charColor: "#5a3e2b",
    charActiveColor: "#3b2718",
    plusColor: "#caa97f",
    arrowColor: "#c0392b",
    screw: BRASS,
    decoration: { emoji: "🍶", position: "bottom-right" },
  },
  {
    id: "cafe",
    name: "카페",
    frame: { borderWidth: 2, borderColor: "#a9805b", borderRadius: 10, backgroundColor: "#f3ebe0" },
    cellBg: "#f3ebe0",
    cellActiveBg: "#fffaf2",
    dividerColor: "#d2b48c",
    charColor: "#6b4f3a",
    charActiveColor: "#4a3526",
    plusColor: "#d2b48c",
    arrowColor: "#b5651d",
    screw: BRASS,
    decoration: { emoji: "☕", position: "bottom-right" },
  },
  {
    id: "plant",
    name: "식물",
    frame: { borderWidth: 2, borderColor: "#5b8c5a", borderRadius: 12, backgroundColor: "#eef5ec" },
    cellBg: "#eef5ec",
    cellActiveBg: "#f7fbf6",
    dividerColor: "#a7c7a3",
    charColor: "#38613a",
    charActiveColor: "#244526",
    plusColor: "#a7c7a3",
    arrowColor: "#e07a5f",
    screw: BRASS,
    decoration: { emoji: "🪴", position: "bottom-left" },
  },
  {
    id: "moon",
    name: "달밤",
    frame: { borderWidth: 2, borderColor: "#3a4a6b", borderRadius: 10, backgroundColor: "#1d2236" },
    cellBg: "#1d2236",
    cellActiveBg: "#2a3251",
    dividerColor: "#3a4a6b",
    charColor: "#c7d0e8",
    charActiveColor: "#ffffff",
    plusColor: "#3a4a6b",
    arrowColor: "#ffd166",
    screw: STEEL,
    decoration: { emoji: "🌙", position: "top-right" },
  },
];

const BY_ID = Object.fromEntries(THEMES.map((t) => [t.id, t]));

// Always returns a valid theme (falls back to the default for unknown ids).
export function getTheme(id) {
  return BY_ID[id] || BY_ID[DEFAULT_THEME];
}
