// Physical "door sign" (문패) UI rendered to look like a *real* mounted nameplate:
// a thick beveled plate that casts a shadow off the wall, fastened with four
// corner screws, with characters that read as carved/engraved into the surface.
// A red marker slides in a recessed groove under the active cell.
//
// Tap a cell to slide the marker there (set active); long-press to edit/delete;
// tap an empty cell to add. The plate's material is driven by `theme`
// (see lib/themes.js); 3D bevel/screw tones are derived from the theme colors.
import React from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { getTheme } from "../lib/themes";

// --- tiny color helper: lighten (amt>0) / darken (amt<0) a #rrggbb hex --------
function shade(hex, amt) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const clamp = (v) => Math.max(0, Math.min(255, v));
  const r = clamp((n >> 16) + amt);
  const g = clamp(((n >> 8) & 0xff) + amt);
  const b = clamp((n & 0xff) + amt);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

// Rough perceived brightness, to decide light- vs dark-plate engraving.
function isDarkColor(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const r = n >> 16,
    g = (n >> 8) & 0xff,
    b = n & 0xff;
  return 0.299 * r + 0.587 * g + 0.114 * b < 140;
}

// A single screw head: a domed metallic disc with a recessed slot.
function Screw({ tone }) {
  return (
    <View style={[styles.screw, { backgroundColor: tone.base, borderColor: tone.dark }]}>
      <View style={[styles.screwHi, { backgroundColor: tone.light }]} />
      <View style={[styles.screwSlot, { backgroundColor: tone.dark }]} />
    </View>
  );
}

// Render a label as stacked (vertical) characters, carved into the plate.
function VerticalLabel({ text, active, theme, engrave }) {
  const chars = Array.from(text).slice(0, 6); // keep cells a sane height
  const clipped = Array.from(text).length > 6;
  const color = active ? theme.charActiveColor : theme.charColor;
  const carve = {
    color,
    textShadowColor: engrave.color,
    textShadowOffset: engrave.offset,
    textShadowRadius: 0.6,
  };
  return (
    <View style={styles.vstack}>
      {chars.map((ch, i) => (
        <Text key={i} style={[styles.vchar, carve, active && styles.vcharActive]}>
          {ch}
        </Text>
      ))}
      {clipped ? <Text style={[styles.vchar, carve]}>⋯</Text> : null}
    </View>
  );
}

export default function DoorSign({
  slots, // length 7: null | { emoji, label }
  activeIndex, // number | null
  themeId, // door-sign skin id (lib/themes)
  onSelect,
  onAdd,
  onEdit,
  onDelete,
}) {
  const theme = getTheme(themeId);

  function longPress(index) {
    Alert.alert("문패 수정", "이 칸을 어떻게 할까요?", [
      { text: "수정", onPress: () => onEdit(index) },
      { text: "삭제", style: "destructive", onPress: () => onDelete(index) },
      { text: "취소", style: "cancel" },
    ]);
  }

  const deco = theme.decoration;
  const baseBg = theme.frame.backgroundColor || "#fafaf7";
  const dark = isDarkColor(baseBg);

  // Bevel tones derived from the plate material (theme can override).
  const bevelLight = theme.bevelLight || shade(baseBg, dark ? 55 : 70);
  const bevelDark = theme.bevelDark || shade(baseBg, dark ? -45 : -60);
  const screw = theme.screw || {
    base: dark ? "#9aa3b2" : "#b9bcc4",
    light: dark ? "#dfe4ee" : "#f2f3f6",
    dark: dark ? "#4a505c" : "#7c808a",
  };
  // Engraved text: a 1px highlight on light plates, a 1px shadow on dark ones,
  // so the characters look cut into (not printed onto) the surface.
  const engrave = dark
    ? { color: "rgba(0,0,0,0.65)", offset: { width: 0, height: -1 } }
    : { color: "rgba(255,255,255,0.9)", offset: { width: 0, height: 1 } };

  return (
    <View>
      {/* The plate casts a drop shadow off the surface it is mounted on. */}
      <View style={styles.frameWrap}>
        <View style={[styles.plateShadow]}>
          <View
            style={[
              styles.plate,
              {
                backgroundColor: baseBg,
                borderTopColor: bevelLight,
                borderLeftColor: bevelLight,
                borderRightColor: bevelDark,
                borderBottomColor: bevelDark,
                borderRadius: theme.frame.borderRadius ?? 6,
              },
            ]}
          >
            {/* Inner recessed face that holds the cells. */}
            <View
              style={[
                styles.face,
                {
                  borderTopColor: bevelDark,
                  borderLeftColor: bevelDark,
                  borderRightColor: bevelLight,
                  borderBottomColor: bevelLight,
                  borderRadius: Math.max(0, (theme.frame.borderRadius ?? 6) - 3),
                },
              ]}
            >
              {slots.map((slot, i) => {
                const active = activeIndex === i;
                const last = i === slots.length - 1;
                return (
                  <Pressable
                    key={i}
                    style={[
                      styles.cell,
                      { backgroundColor: active ? theme.cellActiveBg : theme.cellBg },
                      // Active cell looks pressed-in; others sit flush.
                      active && {
                        borderTopColor: bevelDark,
                        borderLeftColor: bevelDark,
                        borderRightColor: bevelLight,
                        borderBottomColor: bevelLight,
                        borderWidth: 1.5,
                      },
                      !last && { borderRightWidth: 1, borderRightColor: theme.dividerColor },
                    ]}
                    onPress={() => (slot ? onSelect(i) : onAdd(i))}
                    onLongPress={slot ? () => longPress(i) : undefined}
                  >
                    {slot ? (
                      <>
                        <Text style={styles.cellEmoji}>{slot.emoji}</Text>
                        <VerticalLabel
                          text={slot.label}
                          active={active}
                          theme={theme}
                          engrave={engrave}
                        />
                      </>
                    ) : (
                      <Text style={[styles.plus, { color: theme.plusColor }]}>＋</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Four corner screws fastening the plate. */}
            <View style={[styles.screwPos, styles.screwTL]}>
              <Screw tone={screw} />
            </View>
            <View style={[styles.screwPos, styles.screwTR]}>
              <Screw tone={screw} />
            </View>
            <View style={[styles.screwPos, styles.screwBL]}>
              <Screw tone={screw} />
            </View>
            <View style={[styles.screwPos, styles.screwBR]}>
              <Screw tone={screw} />
            </View>
          </View>
        </View>

        {deco ? (
          <Text style={[styles.decoration, DECO_POS[deco.position] || DECO_POS["bottom-right"]]}>
            {deco.emoji}
          </Text>
        ) : null}
      </View>

      {/* Recessed groove with the marker sitting under the active cell. */}
      <View style={styles.track}>
        {slots.map((_, i) => (
          <View key={i} style={styles.trackCell}>
            {activeIndex === i ? (
              <View style={styles.marker}>
                <Text style={[styles.arrow, { color: theme.arrowColor }]}>▲</Text>
              </View>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

// Corner placement for a theme's concept decoration. Negative offsets let the
// emoji overhang the frame edge so it reads as "standing beside" the sign.
const DECO_POS = {
  "bottom-right": { right: -6, bottom: -14, transform: [{ rotate: "8deg" }] },
  "bottom-left": { left: -6, bottom: -14, transform: [{ rotate: "-8deg" }] },
  "top-right": { right: -4, top: -16 },
  "top-left": { left: -4, top: -16 },
};

const styles = StyleSheet.create({
  frameWrap: { position: "relative" },
  decoration: { position: "absolute", fontSize: 40, zIndex: 5 },

  // Drop shadow: the whole plate floats off the door/wall.
  plateShadow: {
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 9,
    elevation: 8,
  },
  // Thick beveled plate body (light top/left, dark bottom/right => raised).
  plate: {
    borderWidth: 3,
    padding: 6,
  },
  // Inner face is beveled the opposite way => the cells sit recessed.
  face: {
    flexDirection: "row",
    overflow: "hidden",
    borderWidth: 1.5,
  },
  cell: {
    flex: 1,
    minHeight: 132,
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 2,
  },
  cellEmoji: { fontSize: 20, marginBottom: 4 },
  vstack: { alignItems: "center" },
  vchar: { fontSize: 15, lineHeight: 18, fontWeight: "600" },
  vcharActive: { fontWeight: "800" },
  plus: { fontSize: 22, marginTop: 48 },

  // Screws.
  screwPos: { position: "absolute", zIndex: 4 },
  screwTL: { top: 5, left: 5 },
  screwTR: { top: 5, right: 5 },
  screwBL: { bottom: 5, left: 5 },
  screwBR: { bottom: 5, right: 5 },
  screw: {
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.35,
    shadowRadius: 1,
  },
  screwHi: {
    position: "absolute",
    top: 1.5,
    left: 2.5,
    width: 5,
    height: 3,
    borderRadius: 3,
    opacity: 0.8,
  },
  screwSlot: { width: 8.5, height: 1.6, borderRadius: 1 },

  // Recessed slider groove + raised marker.
  track: {
    flexDirection: "row",
    marginTop: 8,
    height: 22,
  },
  trackCell: { flex: 1, alignItems: "center" },
  marker: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 1.5,
  },
  arrow: { fontSize: 18, fontWeight: "900" },
});
