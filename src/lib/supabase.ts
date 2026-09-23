import { createClient, SupabaseClient } from "@supabase/supabase-js";

interface Device {
  id: string;
  device_id: string;
  nickname: string | null;
  baseline_snapshot: any;
  created_at: string;
}

interface Scan {
  id: string;
  device_id: string;
  snapshot: any;
  flags: any[];
  created_at: string;
}

interface TrustScore {
  id: string;
  device_id: string;
  score: number;
  breakdown: any[];
  rul_months: number | null;
  created_at: string;
}

function getSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  return url;
}

function getSupabaseAnonKey() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return key;
}

function getSupabaseServiceKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  return key;
}

let _supabase: SupabaseClient | null = null;
let _supabaseAdmin: SupabaseClient | null = null;

function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey());
  }
  return _supabase;
}

function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(getSupabaseUrl(), getSupabaseServiceKey(), {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _supabaseAdmin;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return getSupabase()[prop as keyof SupabaseClient];
  },
});

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return getSupabaseAdmin()[prop as keyof SupabaseClient];
  },
});

export async function getSingleDevice(): Promise<Device | null> {
  const { data, error } = await supabase
    .from("device")
    .select("*")
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return data;
}

export async function createOrGetDevice(deviceId: string, baselineSnapshot: any, nickname?: string): Promise<Device> {
  const { data: existing } = await supabase
    .from("device")
    .select("*")
    .eq("device_id", deviceId)
    .single();

  if (existing) {
    return existing;
  }

  const { data, error } = await supabaseAdmin
    .from("device")
    .insert({
      device_id: deviceId,
      baseline_snapshot: baselineSnapshot,
      nickname: nickname || "My Laptop",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function insertScan(deviceId: string, snapshot: any, flags: any[]): Promise<Scan> {
  const { data, error } = await supabaseAdmin
    .from("scans")
    .insert({
      device_id: deviceId,
      snapshot,
      flags,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function insertTrustScore(
  deviceId: string,
  score: number,
  breakdown: any[],
  rulMonths: number | null
): Promise<TrustScore> {
  const { data, error } = await supabaseAdmin
    .from("trust_scores")
    .insert({
      device_id: deviceId,
      score,
      breakdown,
      rul_months: rulMonths,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getScans(deviceId: string, limit = 50): Promise<Scan[]> {
  const { data, error } = await supabase
    .from("scans")
    .select("*")
    .eq("device_id", deviceId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function getLatestTrustScore(deviceId: string): Promise<TrustScore | null> {
  const { data, error } = await supabase
    .from("trust_scores")
    .select("*")
    .eq("device_id", deviceId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
}

export async function getLatestScan(deviceId: string): Promise<Scan | null> {
  const { data, error } = await supabase
    .from("scans")
    .select("*")
    .eq("device_id", deviceId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
}