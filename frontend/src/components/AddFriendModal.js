// Search users by username and send friend requests.
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { api } from "../api/client";

const LABELS = {
  none: "추가",
  pending_sent: "요청됨",
  pending_received: "수락 대기",
  accepted: "친구",
};

export default function AddFriendModal({ visible, onClose }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function search() {
    const term = q.trim();
    if (!term) return;
    setLoading(true);
    try {
      const rows = await api.searchUsers(term);
      setResults(rows);
      setSearched(true);
    } catch (e) {
      Alert.alert("검색 실패", e.message);
    } finally {
      setLoading(false);
    }
  }

  async function add(item) {
    try {
      await api.sendFriendRequest(item.id);
      // reflect locally → "요청됨"
      setResults((rs) =>
        rs.map((r) => (r.id === item.id ? { ...r, relationship: "pending_sent" } : r))
      );
    } catch (e) {
      Alert.alert("요청 실패", e.message);
    }
  }

  function close() {
    setQ("");
    setResults([]);
    setSearched(false);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={styles.title}>친구 추가</Text>

          <View style={styles.searchRow}>
            <TextInput
              style={styles.input}
              value={q}
              onChangeText={setQ}
              placeholder="사용자 이름 검색"
              placeholderTextColor="#bbb"
              autoCapitalize="none"
              returnKeyType="search"
              onSubmitEditing={search}
            />
            <Pressable style={styles.searchBtn} onPress={search}>
              <Text style={styles.searchBtnText}>검색</Text>
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginTop: 24 }} />
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              style={styles.list}
              ListEmptyComponent={
                searched ? <Text style={styles.empty}>검색 결과가 없어요.</Text> : null
              }
              renderItem={({ item }) => {
                const rel = item.relationship ?? "none";
                const disabled = rel !== "none";
                return (
                  <View style={styles.row}>
                    <Text style={styles.name}>{item.username}</Text>
                    <Pressable
                      style={[styles.action, disabled && styles.actionDisabled]}
                      disabled={disabled}
                      onPress={() => add(item)}
                    >
                      <Text style={[styles.actionText, disabled && styles.actionTextDisabled]}>
                        {LABELS[rel]}
                      </Text>
                    </Pressable>
                  </View>
                );
              }}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    minHeight: 380,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#e0e0e0",
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 16 },
  searchRow: { flexDirection: "row", gap: 8 },
  input: {
    flex: 1,
    backgroundColor: "#f3f3f5",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  searchBtn: {
    backgroundColor: "#111",
    borderRadius: 12,
    paddingHorizontal: 18,
    justifyContent: "center",
  },
  searchBtnText: { color: "#fff", fontWeight: "700" },
  list: { marginTop: 12 },
  empty: { color: "#aaa", textAlign: "center", marginTop: 24 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  name: { fontSize: 16, fontWeight: "600" },
  action: {
    backgroundColor: "#4285F4",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  actionDisabled: { backgroundColor: "#eee" },
  actionText: { color: "#fff", fontWeight: "700" },
  actionTextDisabled: { color: "#999" },
});
