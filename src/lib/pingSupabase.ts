import { supabase } from "./supabase";

const PING_LOG_KEY = "supabase_ping_log";
const LAST_PING_KEY = "supabase_last_ping";
const MAX_LOG_ENTRIES = 20;
const PING_INTERVAL_MS = 2 * 24 * 60 * 60 * 1000; // 2 days

export interface PingEntry {
  timestamp: string;  // ISO string
  success: boolean;
  latencyMs: number | null;
  error?: string;
}

export function getPingLog(): PingEntry[] {
  try {
    const raw = localStorage.getItem(PING_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePingEntry(entry: PingEntry): PingEntry[] {
  const log = getPingLog();
  const updated = [entry, ...log].slice(0, MAX_LOG_ENTRIES);
  localStorage.setItem(PING_LOG_KEY, JSON.stringify(updated));
  localStorage.setItem(LAST_PING_KEY, entry.timestamp);
  return updated;
}

export async function pingSupabase(): Promise<PingEntry> {
  const start = Date.now();
  try {
    const { error } = await supabase.from("vendors").select("count").limit(1);
    const latencyMs = Date.now() - start;
    const entry: PingEntry = {
      timestamp: new Date().toISOString(),
      success: !error,
      latencyMs,
      error: error?.message,
    };
    savePingEntry(entry);
    return entry;
  } catch (e: unknown) {
    const entry: PingEntry = {
      timestamp: new Date().toISOString(),
      success: false,
      latencyMs: null,
      error: e instanceof Error ? e.message : "Error desconocido",
    };
    savePingEntry(entry);
    return entry;
  }
}

export function getLastPingTime(): Date | null {
  const raw = localStorage.getItem(LAST_PING_KEY);
  return raw ? new Date(raw) : null;
}

/** Runs a ping only if 2 days have passed since the last one (or never pinged). */
export async function runPingIfDue(): Promise<PingEntry | null> {
  const last = getLastPingTime();
  if (!last || Date.now() - last.getTime() >= PING_INTERVAL_MS) {
    return pingSupabase();
  }
  return null;
}
