// Modal for creating / editing a status slot: pick an emoji + type a label.
import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { lastEmoji } from "../lib/emoji";

const LABEL_MAX = 16;
// A few quick picks so users aren't forced to open the emoji keyboard.
const QUICK = ["📚", "💻", "🍜", "😴", "🏃", "☕", "🎧", "🚗", "🟢", "🛌", "📵", "🎮"];

export default function StatusEditorModal({
  visible,
  initialEmoji = "",
  initialLabel = "",
  onSave,
  onClose,
}) {
  const [emoji, setEmoji] = useState(initialEmoji);
  const [label, setLabel] = useState(initialLabel);

  // Reset fields whenever the modal is (re)opened for a different slot.
  useEffect(() => {
    if (visible) {
      setEmoji(initialEmoji);
      setLabel(initialLabel);
    }
  }, [visible, initialEmoji, initialLabel]);

  const canSave = emoji.trim().length > 0 && label.trim().length > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          {/* Stop taps inside the card from closing the modal. */}
          <Pressable style={styles.card} onPress={() => {}}>
            <Text style={styles.title}>문패 만들기</Text>

            <View style={styles.emojiRow}>
              <TextInput
                style={styles.emojiInput}
                value={emoji}
                onChangeText={(t) => setEmoji(lastEmoji(t))}
                placeholder="🙂"
                placeholderTextColor="#bbb"
                maxLength={8}
              />
              <View style={styles.labelBox}>
                <TextInput
                  style={styles.labelInput}
                  value={label}
                  onChangeText={setLabel}
                  placeholder="지금 뭐해?"
                  placeholderTextColor="#bbb"
                  maxLength={LABEL_MAX}
                />
                <Text style={styles.count}>
                  {label.length}/{LABEL_MAX}
                </Text>
              </View>
            </View>

            <View style={styles.quickWrap}>
              {QUICK.map((e) => (
                <Pressable key={e} style={styles.quick} onPress={() => setEmoji(e)}>
                  <Text style={styles.quickEmoji}>{e}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={[styles.save, !canSave && styles.saveDisabled]}
              disabled={!canSave}
              onPress={() => onSave(emoji.trim(), label.trim())}
            >
              <Text style={styles.saveText}>저장</Text>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
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
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 20, gap: 16 },
  title: { fontSize: 18, fontWeight: "700" },
  emojiRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  emojiInput: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "#f3f3f5",
    textAlign: "center",
    fontSize: 32,
  },
  labelBox: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: "#f3f3f5",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  labelInput: { fontSize: 18 },
  count: { alignSelf: "flex-end", color: "#999", fontSize: 12, marginTop: 2 },
  quickWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quick: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#f7f7f9",
    alignItems: "center",
    justifyContent: "center",
  },
  quickEmoji: { fontSize: 24 },
  save: {
    backgroundColor: "#111",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
  },
  saveDisabled: { backgroundColor: "#ccc" },
  saveText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
