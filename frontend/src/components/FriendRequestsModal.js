// Show incoming friend requests and accept them.
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { api } from "../api/client";

export default function FriendRequestsModal({ visible, onClose, onChanged }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api
      .listRequests()
      .then(setRequests)
      .catch((e) => Alert.alert("불러오기 실패", e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (visible) load();
  }, [visible, load]);

  async function accept(item) {
    try {
      await api.acceptFriend(item.id);
      setRequests((rs) => rs.filter((r) => r.id !== item.id));
      onChanged?.(); // let Home refresh its friends list
    } catch (e) {
      Alert.alert("수락 실패", e.message);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={styles.title}>받은 친구 요청</Text>

          {loading ? (
            <ActivityIndicator style={{ marginTop: 24 }} />
          ) : (
            <FlatList
              data={requests}
              keyExtractor={(item) => item.id}
              style={styles.list}
              ListEmptyComponent={<Text style={styles.empty}>받은 요청이 없어요.</Text>}
              renderItem={({ item }) => (
                <View style={styles.row}>
                  <Text style={styles.name}>{item.username ?? "알 수 없음"}</Text>
                  <Pressable style={styles.accept} onPress={() => accept(item)}>
                    <Text style={styles.acceptText}>수락</Text>
                  </Pressable>
                </View>
              )}
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
    minHeight: 300,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#e0e0e0",
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  list: { marginTop: 8 },
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
  accept: {
    backgroundColor: "#111",
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  acceptText: { color: "#fff", fontWeight: "700" },
});
