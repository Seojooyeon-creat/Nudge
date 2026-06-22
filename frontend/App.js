// Root component. Single-screen shell for the MVP (no navigation library).
import React from "react";
import { ActivityIndicator, SafeAreaView, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import LoginScreen from "./src/screens/LoginScreen";
import HomeScreen from "./src/screens/HomeScreen";

function Main() {
  const { session, loading } = useAuth();

  if (loading) {
    // Splash-like loading state while we determine auth.
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!session) return <LoginScreen />;
  return <HomeScreen />;
}

export default function App() {
  return (
    <AuthProvider>
      <SafeAreaView style={styles.flex}>
        <StatusBar style="auto" />
        <Main />
      </SafeAreaView>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
