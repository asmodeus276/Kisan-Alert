import { createClient } from "@supabase/supabase-js";

// Safe wrapper to prevent runtime crashes in Node.js where import.meta.env does not exist
const getEnvVar = (key: string): string => {
  const viteEnv = (typeof import.meta !== "undefined" && (import.meta as any).env) ? (import.meta as any).env : null;
  if (viteEnv && viteEnv[key]) {
    return viteEnv[key];
  }
  if (typeof process !== "undefined" && process.env && process.env[key]) {
    return process.env[key] || "";
  }
  // Also support server process.env for non-VITE prefixed counterparts
  const cleanKey = key.replace(/^VITE_/, "");
  if (typeof process !== "undefined" && process.env && process.env[cleanKey]) {
    return process.env[cleanKey] || "";
  }
  return "";
};

const supabaseUrl = getEnvVar("VITE_SUPABASE_URL");
const supabaseAnonKey = getEnvVar("VITE_SUPABASE_ANON_KEY");

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseConfigured = (): boolean => {
  return !!supabase;
};

