import { NextRequest, NextResponse } from "next/server";
import { getSingleDevice, createOrGetDevice } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { device_id, baseline_snapshot, nickname } = body;

    if (!device_id || !baseline_snapshot) {
      return NextResponse.json(
        { error: "device_id and baseline_snapshot are required" },
        { status: 400 }
      );
    }

    const device = await createOrGetDevice(device_id, baseline_snapshot, nickname);

    return NextResponse.json({
      success: true,
      device: {
        id: device.id,
        device_id: device.device_id,
        nickname: device.nickname,
        created_at: device.created_at,
      },
    });
  } catch (error) {
    console.error("POST /api/passport error:", error);
    return NextResponse.json(
      { error: "Failed to create/get device passport" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const device = await getSingleDevice();

    if (!device) {
      return NextResponse.json(
        { error: "No device passport found. Run the diagnostic agent first." },
        { status: 404 }
      );
    }

    const { getScans, getLatestTrustScore } = await import("@/lib/supabase");
    const [scans, latestScore] = await Promise.all([
      getScans(device.device_id),
      getLatestTrustScore(device.device_id),
    ]);

    return NextResponse.json({
      device: {
        id: device.id,
        device_id: device.device_id,
        nickname: device.nickname,
        baseline_snapshot: device.baseline_snapshot,
        created_at: device.created_at,
      },
      scans: scans.map((s) => ({
        id: s.id,
        flags: s.flags,
        created_at: s.created_at,
      })),
      trust_score: latestScore
        ? {
            score: latestScore.score,
            breakdown: latestScore.breakdown,
            rul_months: latestScore.rul_months,
            created_at: latestScore.created_at,
          }
        : null,
    });
  } catch (error) {
    console.error("GET /api/passport error:", error);
    return NextResponse.json(
      { error: "Failed to fetch device passport" },
      { status: 500 }
    );
  }
}