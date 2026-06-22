// Supabase client for the mobile app.
// Uses the public anon key only — never embed the service_role key here.
//
// The session is persisted in expo-secure-store (encrypted device keychain)
// instead of AsyncStorage, and Supabase refreshes the access token
// automatically (autoRefreshToken) so callers always get a fresh JWT.
import "react-native-url-polyfill/auto";
import * as SecureStore from "expo-secure-store";
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

const { supabaseUrl, supabaseAnonKey } = Constants.expoConfig.extra;

// Storage adapter backed by SecureStore.
// Note: SecureStore values are limited to ~2048 bytes. A Supabase session
// comfortably fits, but if you later add large custom claims and hit the limit,
// swap this for the chunked/encrypted "LargeSecureStore" from the Supabase docs.
const SecureStoreAdapter = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    // We parse the OAuth redirect URL manually on native (no browser URL bar).
    detectSessionInUrl: false,
  },
});
