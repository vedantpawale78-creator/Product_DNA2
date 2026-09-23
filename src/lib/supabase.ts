import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function getSingleDevice() {
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

export async function createOrGetDevice(deviceId: string, baselineSnapshot: any, nickname?: string) {
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

export async function insertScan(deviceId: string, snapshot: any, flags: any[]) {
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
) {
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

export async function getScans(deviceId: string, limit = 50) {
  const { data, error } = await supabase
    .from("scans")
    .select("*")
    .eq("device_id", deviceId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function getLatestTrustScore(deviceId: string) {
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

export async function getLatestScan(deviceId: string) {
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