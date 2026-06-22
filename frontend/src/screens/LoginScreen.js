// Minimal sign-in screen: logo + a single "Continue with Google" button.
// Google is the only auth method (no email/password, no phone).
import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";

export default function LoginScreen() {
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);

  async function onPress() {
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      Alert.alert("Sign-in failed", e.message ?? "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.brand}>
        <Text style={styles.logo}>🚪</Text>
        <Text style={styles.title}>Nudge</Text>
        <Text style={styles.tagline}>See what your close friends are up to.</Text>
      </View>

      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        onPress={onPress}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color="#3c4043" />
        ) : (
          <>
            <Text style={styles.googleG}>G</Text>
            <Text style={styles.buttonText}>Continue with Google</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: "#fff",
  },
  brand: { alignItems: "center", marginBottom: 64 },
  logo: { fontSize: 72 },
  title: { fontSize: 44, fontWeight: "800", marginTop: 8 },
  tagline: { fontSize: 16, color: "#888", marginTop: 8, textAlign: "center" },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#dadce0",
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: 24,
    minWidth: 260,
    // subtle elevation
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  buttonPressed: { backgroundColor: "#f7f8f8" },
  googleG: { fontSize: 20, fontWeight: "700", color: "#4285F4" },
  buttonText: { fontSize: 16, fontWeight: "600", color: "#3c4043" },
});
