// Auth state for the whole app.
//
// Exposes: { user, session, loading, signInWithGoogle, signOut }
//   - session : the Supabase session (tokens), persisted in SecureStore
//   - user    : the Nudge profile row from our backend (username, avatar, …)
//   - loading : true while we determine the initial auth state (splash)
//
// Sign-in uses Supabase's signInWithOAuth (Google) opened in a secure browser
// tab via expo-web-browser. Token refresh is handled automatically by the
// Supabase client (autoRefreshToken in src/lib/supabase.js).
import React, { createContext, useContext, useEffect, useState } from "react";
import * as WebBrowser from "expo-web-browser";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import { supabase } from "../lib/supabase";
import { api } from "../api/client";

// Required on Android to dismiss the auth browser tab once it redirects back.
WebBrowser.maybeCompleteAuthSession();

// The OAuth return URL. Must match what's registered in Supabase Redirect URLs
// and the app's URL scheme (app.json `scheme` → Info.plist CFBundleURLSchemes).
// NOTE: we hardcode this instead of using expo-auth-session's makeRedirectUri()
// because inside a development build makeRedirectUri() resolves to a localhost /
// exp dev-server URL, which breaks the OAuth round-trip (the browser tries to
// load localhost after Google sign-in and fails).
const redirectTo = "com.nudgeapp://auth/callback";

const AuthContext = createContext({
  user: null,
  session: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  updateUser: () => {},
});

// Turn the OAuth redirect URL into a real Supabase session.
async function createSessionFromUrl(url) {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) throw new Error(errorCode);

  // PKCE flow returns an authorization `code`; implicit returns tokens directly.
  if (params.code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) throw error;
    return data.session;
  }
  const { access_token, refresh_token } = params;
  if (!access_token) return null;
  const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) throw error;
  return data.session;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Whenever the session changes, bootstrap / refresh the Nudge profile.
  useEffect(() => {
    if (!session) {
      setUser(null);
      return;
    }
    // POST /auth/google is idempotent: it creates the profile on first login
    // (username defaults to the Google display name) and returns it thereafter.
    api
      .googleAuth(session.access_token)
      .then(setUser)
      .catch(() => setUser(null));
  }, [session]);

  // Load any persisted session, then keep in sync with Supabase auth events.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type === "success") {
      const next = await createSessionFromUrl(result.url);
      setSession(next);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  }

  // Merge partial fields into the locally cached profile (e.g. after a PATCH).
  function updateUser(patch) {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signInWithGoogle, signOut, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
