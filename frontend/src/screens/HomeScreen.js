// Home: friends and their live active status, plus a floating button to open
// the status picker. Friend statuses update in real time via Supabase Realtime.
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { api } from "../api/client";
import { supabase } from "../lib/supabase";
import { koreanTimeAgo } from "../lib/time";
import { DEFAULT_STATUS } from "../lib/status";
import { useAuth } from "../context/AuthContext";
import DoorSign from "../components/DoorSign";
import StatusEditorModal from "../components/StatusEditorModal";
import AddFriendModal from "../components/AddFriendModal";
import FriendRequestsModal from "../components/FriendRequestsModal";
import ThemePickerModal from "../components/ThemePickerModal";
import { DEFAULT_THEME, getTheme } from "../lib/themes";

const EMPTY_SLOTS = Array(7).fill(null);
const NUDGES = [
  { type: "knock", emoji: "🚪" },
  { type: "coffee", emoji: "☕" },
  { type: "eyes", emoji: "👀" },
];

const ONBOARDING_TEXT =
  "문패를 만들어봐 👋 지금 자주 하는 상황을 등록해두면 친구들이 볼 수 있어";

export default function HomeScreen() {
  const { user, signOut, updateUser } = useAuth();

  const [friends, setFriends] = useState([]);
  const [slots, setSlots] = useState(EMPTY_SLOTS);
  const [activeIndex, setActiveIndex] = useState(null);
  const [themePickerOpen, setThemePickerOpen] = useState(false);

  const themeId = user?.theme ?? DEFAULT_THEME;

  const [editor, setEditor] = useState({ open: false, index: null });
  const [dismissedOnboarding, setDismissedOnboarding] = useState(false);
  const [, setTick] = useState(0); // forces "X분 전" labels to refresh

  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [requestCount, setRequestCount] = useState(0);

  const loadFriends = useCallback(() => {
    api.getFriendsStatus().then(setFriends).catch(() => {});
  }, []);

  const loadRequests = useCallback(() => {
    api.listRequests().then((r) => setRequestCount(r.length)).catch(() => {});
  }, []);

  const loadMine = useCallback(() => {
    api
      .getMyStatus()
      .then((data) => {
        setSlots(data.slots ?? EMPTY_SLOTS);
        setActiveIndex(data.active_slot_index ?? null);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadMine();
    loadFriends();
    loadRequests();
  }, [loadMine, loadFriends, loadRequests]);

  // Realtime: any change to friends' active statuses re-fetches the list.
  useEffect(() => {
    const channel = supabase
      .channel("statuses-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "statuses" },
        () => loadFriends()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadFriends]);

  // Keep relative timestamps fresh.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const allEmpty = slots.every((s) => !s);
  const showOnboarding = allEmpty && !dismissedOnboarding;

  // --- door-sign actions ---
  function handleSelect(index) {
    setActiveIndex(index); // optimistic: slide the marker immediately
    api.setActiveSlot(index).then(loadMine).catch(loadMine);
  }

  function handleClearActive() {
    setActiveIndex(null);
    api.setActiveSlot(null).then(loadMine).catch(loadMine);
  }

  function handleAdd(index) {
    setEditor({ open: true, index });
  }

  function handleEdit(index) {
    setEditor({ open: true, index });
  }

  function handleDelete(index) {
    api.deleteSlot(index).then(loadMine).catch(loadMine);
  }

  function handleSave(emoji, label) {
    const index = editor.index;
    setEditor({ open: false, index: null });
    api
      .upsertSlot(index, emoji, label)
      .then(loadMine)
      .catch((e) => Alert.alert("저장 실패", e.message));
  }

  function handleSelectTheme(nextThemeId) {
    setThemePickerOpen(false);
    if (nextThemeId === themeId) return;
    const prev = themeId;
    updateUser({ theme: nextThemeId }); // optimistic: repaint the sign now
    api.updateMe({ theme: nextThemeId }).catch((e) => {
      updateUser({ theme: prev }); // revert on failure
      Alert.alert("저장 실패", e.message);
    });
  }

  function nudge(friendId, type) {
    api
      .sendReaction(friendId, type)
      .then(() => Alert.alert("보냈어요!", "Nudge 전송 완료"))
      .catch((e) => Alert.alert("전송 실패", e.message));
  }

  const editorSlot = editor.index !== null ? slots[editor.index] : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.hi}>안녕, {user?.username ?? "친구"} 👋</Text>
        <Pressable onPress={signOut} hitSlop={8}>
          <Text style={styles.signOut}>로그아웃</Text>
        </Pressable>
      </View>

      <View style={styles.signSection}>
        <View style={styles.signTitleRow}>
          <Text style={styles.signTitle}>내 문패</Text>
          <Pressable onPress={() => setThemePickerOpen(true)} hitSlop={8}>
            <Text style={styles.designBtn}>🎨 디자인</Text>
          </Pressable>
        </View>
        <DoorSign
          slots={slots}
          activeIndex={activeIndex}
          themeId={themeId}
          onSelect={handleSelect}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
        <Pressable
          style={styles.clearRow}
          onPress={handleClearActive}
          disabled={activeIndex === null}
        >
          <Text style={[styles.clearText, activeIndex === null && styles.clearDisabled]}>
            {activeIndex === null ? "현재: ❓ 알 수 없음" : "상태 비우기 (문패 내리기)"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.friendActions}>
        <Pressable style={styles.friendBtn} onPress={() => setAddFriendOpen(true)}>
          <Text style={styles.friendBtnText}>＋ 친구 추가</Text>
        </Pressable>
        <Pressable style={styles.friendBtn} onPress={() => setRequestsOpen(true)}>
          <Text style={styles.friendBtnText}>받은 요청</Text>
          {requestCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{requestCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <FlatList
        data={friends}
        keyExtractor={(item) => item.user_id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>아직 친구가 없어요.</Text>}
        renderItem={({ item }) => {
          // No active status → show the fixed default (❓ 알 수 없음).
          const status = item.status ?? DEFAULT_STATUS;
          const fTheme = getTheme(item.theme);
          return (
            <View style={styles.row}>
              <View
                style={[
                  styles.friendPlate,
                  { borderColor: fTheme.frame.borderColor, backgroundColor: fTheme.cellActiveBg },
                ]}
              >
                <Text style={styles.friendEmoji}>{status.emoji}</Text>
                {fTheme.decoration ? (
                  <Text style={styles.friendDeco}>{fTheme.decoration.emoji}</Text>
                ) : null}
              </View>
              <View style={styles.friendInfo}>
                <Text style={styles.friendName}>{item.username}</Text>
                <Text style={styles.friendLabel}>{status.label}</Text>
                {item.status ? (
                  <Text style={styles.timeAgo}>{koreanTimeAgo(item.status.updated_at)}</Text>
                ) : null}
              </View>
              <View style={styles.nudges}>
                {NUDGES.map((n) => (
                  <Pressable key={n.type} onPress={() => nudge(item.user_id, n.type)} hitSlop={6}>
                    <Text style={styles.nudgeEmoji}>{n.emoji}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          );
        }}
      />

      {showOnboarding && (
        <Pressable style={styles.onboarding} onPress={() => setDismissedOnboarding(true)}>
          <Text style={styles.onboardingText}>{ONBOARDING_TEXT}</Text>
          <Text style={styles.onboardingHint}>(눌러서 닫기)</Text>
        </Pressable>
      )}

      <StatusEditorModal
        visible={editor.open}
        initialEmoji={editorSlot?.emoji ?? ""}
        initialLabel={editorSlot?.label ?? ""}
        onSave={handleSave}
        onClose={() => setEditor({ open: false, index: null })}
      />

      <AddFriendModal
        visible={addFriendOpen}
        onClose={() => {
          setAddFriendOpen(false);
          loadRequests();
        }}
      />

      <FriendRequestsModal
        visible={requestsOpen}
        onClose={() => setRequestsOpen(false)}
        onChanged={() => {
          loadRequests();
          loadFriends();
        }}
      />

      <ThemePickerModal
        visible={themePickerOpen}
        currentThemeId={themeId}
        onSelect={handleSelectTheme}
        onClose={() => setThemePickerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  hi: { fontSize: 20, fontWeight: "800" },
  signOut: { color: "#999", fontSize: 13 },
  signSection: { paddingHorizontal: 20, paddingBottom: 12 },
  signTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  signTitle: { fontSize: 13, fontWeight: "700", color: "#888" },
  designBtn: { fontSize: 13, fontWeight: "700", color: "#333" },
  clearRow: { alignItems: "center", paddingTop: 10 },
  clearText: { color: "#c0392b", fontSize: 13, fontWeight: "600" },
  clearDisabled: { color: "#aaa" },
  friendActions: { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingBottom: 12 },
  friendBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f3f3f5",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  friendBtnText: { fontSize: 14, fontWeight: "600", color: "#333" },
  badge: {
    backgroundColor: "#e53935",
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  list: { paddingHorizontal: 20, paddingBottom: 120 },
  empty: { color: "#aaa", textAlign: "center", marginTop: 48 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    gap: 14,
  },
  friendPlate: {
    width: 52,
    height: 52,
    borderWidth: 2,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  friendEmoji: { fontSize: 30, textAlign: "center" },
  friendDeco: { position: "absolute", right: -6, bottom: -6, fontSize: 16 },
  friendInfo: { flex: 1 },
  friendName: { fontSize: 16, fontWeight: "600" },
  friendLabel: { fontSize: 14, color: "#444", marginTop: 2 },
  timeAgo: { fontSize: 12, color: "#aaa", marginTop: 2 },
  nudges: { flexDirection: "row", gap: 12 },
  nudgeEmoji: { fontSize: 22 },
  onboarding: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 96,
    backgroundColor: "#111",
    borderRadius: 16,
    padding: 16,
  },
  onboardingText: { color: "#fff", fontSize: 15, lineHeight: 21 },
  onboardingHint: { color: "#999", fontSize: 12, marginTop: 6 },
});
