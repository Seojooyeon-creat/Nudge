// Thin wrapper around fetch that attaches the Supabase JWT and unwraps the
// { success, data, error } envelope returned by the FastAPI backend.
import Constants from "expo-constants";
import { supabase } from "../lib/supabase";

const API_URL = Constants.expoConfig.extra.apiUrl;

async function request(path, { method = "GET", body } = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || "Request failed");
  }
  return json.data;
}

export const api = {
  // auth / profile
  googleAuth: (accessToken) =>
    request("/auth/google", { method: "POST", body: { access_token: accessToken } }),
  getMe: () => request("/auth/me"),
  updateMe: (payload) => request("/auth/me", { method: "PATCH", body: payload }),

  // status (the door sign)
  getMyStatus: () => request("/status/me"), // { slots: [7], active_slot_index }
  upsertSlot: (slotIndex, emoji, label) =>
    request(`/status/slots/${slotIndex}`, { method: "PUT", body: { emoji, label } }),
  deleteSlot: (slotIndex) =>
    request(`/status/slots/${slotIndex}`, { method: "DELETE" }),
  setActiveSlot: (slotIndex) =>
    request("/status/active", { method: "PUT", body: { slot_index: slotIndex } }),
  getFriendsStatus: () => request("/status/friends"),

  // friends
  searchUsers: (q) => request(`/friends/search?q=${encodeURIComponent(q)}`),
  listFriends: () => request("/friends"),
  listRequests: () => request("/friends/requests"),
  sendFriendRequest: (friendId) =>
    request("/friends/request", { method: "POST", body: { friend_id: friendId } }),
  acceptFriend: (friendshipId) =>
    request(`/friends/${friendshipId}/accept`, { method: "POST" }),

  // reactions (nudges)
  sendReaction: (receiverId, type) =>
    request("/reactions", { method: "POST", body: { receiver_id: receiverId, type } }),
  listReceivedReactions: () => request("/reactions/received"),
};
