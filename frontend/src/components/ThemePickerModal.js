// Modal for choosing the door-sign skin (문패 디자인). Shows each theme as a
// live mini door-sign preview; tapping one selects it immediately.
import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { THEMES } from "../lib/themes";
import Emoji from "./Emoji";

const MINI_DECO_POS = {
  "bottom-right": { right: -8, bottom: -8 },
  "bottom-left": { left: -8, bottom: -8 },
  "top-right": { right: -6, top: -8 },
  "top-left": { left: -6, top: -8 },
};

// A tiny 3-cell door sign rendered in the given theme, used as the swatch.
function ThemePreview({ theme }) {
  const cells = ["개", "식", ""];
  const deco = theme.decoration;
  return (
    <View style={styles.miniWrap}>
      <View style={[styles.miniFrame, theme.frame]}>
        {cells.map((ch, i) => {
          const active = i === 0;
          const last = i === cells.length - 1;
          return (
            <View
              key={i}
              style={[
                styles.miniCell,
                { backgroundColor: active ? theme.cellActiveBg : theme.cellBg },
                !last && { borderRightWidth: 1, borderRightColor: theme.dividerColor },
              ]}
            >
              {ch ? (
                <Text
                  style={[
                    styles.miniChar,
                    { color: active ? theme.charActiveColor : theme.charColor },
                  ]}
                >
                  {ch}
                </Text>
              ) : (
                <Text style={[styles.miniPlus, { color: theme.plusColor }]}>＋</Text>
              )}
            </View>
          );
        })}
      </View>
      <View style={styles.miniTrack}>
        <Text style={[styles.miniArrow, { color: theme.arrowColor }]}>▲</Text>
      </View>
      {deco ? (
        <Emoji
          char={deco.emoji}
          size={22}
          style={[styles.miniDeco, MINI_DECO_POS[deco.position] || MINI_DECO_POS["bottom-right"]]}
        />
      ) : null}
    </View>
  );
}

export default function ThemePickerModal({ visible, currentThemeId, onSelect, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>문패 디자인</Text>
          <Text style={styles.subtitle}>고른 디자인은 친구들에게도 보여요</Text>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.grid}>
            {THEMES.map((theme) => {
              const selected = theme.id === currentThemeId;
              return (
                <Pressable
                  key={theme.id}
                  style={[styles.option, selected && styles.optionSelected]}
                  onPress={() => onSelect(theme.id)}
                >
                  <ThemePreview theme={theme} />
                  <Text style={[styles.optionName, selected && styles.optionNameSelected]}>
                    {theme.name}
                    {selected ? " ✓" : ""}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable style={styles.close} onPress={onClose}>
            <Text style={styles.closeText}>닫기</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 24,
  },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 20, gap: 12 },
  title: { fontSize: 18, fontWeight: "700" },
  subtitle: { fontSize: 13, color: "#888", marginTop: -4 },
  scroll: { maxHeight: 460 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 12, paddingVertical: 4 },
  option: {
    width: "47%",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: "#f7f7f9",
    padding: 12,
    alignItems: "center",
    gap: 8,
  },
  optionSelected: { borderColor: "#111", backgroundColor: "#fff" },
  optionName: { fontSize: 14, fontWeight: "600", color: "#555" },
  optionNameSelected: { color: "#111", fontWeight: "800" },
  // mini door-sign swatch
  miniWrap: { position: "relative" },
  miniDeco: { position: "absolute", fontSize: 22 },
  miniFrame: { flexDirection: "row", overflow: "hidden", width: 108 },
  miniCell: {
    flex: 1,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  miniChar: { fontFamily: "NanumPenScript", fontSize: 17, lineHeight: 16 },
  miniPlus: { fontSize: 16 },
  miniTrack: { alignItems: "flex-start", paddingLeft: 12, height: 14 },
  miniArrow: { fontSize: 12, fontWeight: "900" },
  close: {
    backgroundColor: "#111",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  closeText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
