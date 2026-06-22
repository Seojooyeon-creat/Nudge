// Injects environment variables into the Expo config at build/start time.
// Values come from a local `.env` file (see .env.example) loaded by dotenv.
import "dotenv/config";
import appJson from "./app.json";

export default ({ config }) => ({
  ...config,
  ...appJson.expo,
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000",
  },
});
