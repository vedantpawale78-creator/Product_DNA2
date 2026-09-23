import { NextRequest, NextResponse } from "next/server";
import { getSingleDevice, insertScan, insertTrustScore, getLatestScan } from "@/lib/supabase";
import { compareSnapshots, calculateTrustScore } from "@/lib/trust-score";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const device = await getSingleDevice();
    if (!device) {
      return NextResponse.json(
        { error: "No device passport found. Create one via POST /api/passport first." },
        { status: 404 }
      );
    }

    const diagnosticData = body;
    const deviceId = device.device_id;

    if (diagnosticData.device_id !== deviceId) {
      return NextResponse.json(
        { error: "Device ID mismatch. This passport tracks a different device." },
        { status: 400 }
      );
    }

    const baselineSnapshot = device.baseline_snapshot;
    const flags = compareSnapshots(baselineSnapshot, diagnosticData);

    const previousScan = await getLatestScan(deviceId);
    const previousScore = previousScan
      ? await calculatePreviousScore(deviceId)
      : 100;

    const { score, breakdown, rulMonths } = calculateTrustScore(flags, previousScore);

    await Promise.all([
      insertScan(deviceId, diagnosticData, flags),
      insertTrustScore(deviceId, score, breakdown, rulMonths),
    ]);

    return NextResponse.json({
      success: true,
      scan: {
        flags,
        score,
        breakdown,
        rul_months: rulMonths,
      },
    });
  } catch (error) {
    console.error("POST /api/scan error:", error);
    return NextResponse.json(
      { error: "Failed to process scan" },
      { status: 500 }
    );
  }
}

async function calculatePreviousScore(deviceId: string): Promise<number> {
  const { supabaseAdmin } = await import("@/lib/supabase");
  const { data } = await supabaseAdmin
    .from("trust_scores")
    .select("score")
    .eq("device_id", deviceId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  return data?.score ?? 100;
}