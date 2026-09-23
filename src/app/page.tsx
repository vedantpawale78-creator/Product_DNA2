import { getSingleDevice, getScans, getLatestTrustScore } from "@/lib/supabase";
import DeviceHeader from "@/components/DeviceHeader";
import TrustScoreGauge from "@/components/TrustScoreGauge";
import ScoreBreakdown from "@/components/ScoreBreakdown";
import ScanTimeline from "@/components/ScanTimeline";
import RULCard from "@/components/RULCard";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const device = await getSingleDevice();

  if (!device) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center border border-accent/30">
            <svg className="w-12 h-12" style={{ color: "#00d4ff" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-textPrimary mb-2">No Device Passport Found</h1>
          <p className="text-textSecondary mb-6">Run the diagnostic agent on your laptop to create the initial passport.</p>
          <div className="bg-surface border border-border rounded-xl p-4 text-left text-sm">
            <p className="font-medium text-textPrimary mb-2">Quick setup:</p>
            <ol className="space-y-1 text-textSecondary">
              <li>1. Deploy this app to Vercel</li>
              <li>2. Run Supabase SQL schema</li>
              <li>3. Set API URL in diagnostic_agent/config.json</li>
              <li>4. Run: <code className="font-mono bg-background px-1.5 py-0.5 rounded">python diagnostic_agent.py</code></li>
              <li>5. Refresh this page</li>
            </ol>
          </div>
        </div>
      </main>
    );
  }

  const [scans, latestScore] = await Promise.all([
    getScans(device.device_id),
    getLatestTrustScore(device.device_id),
  ]);

  const currentScore = latestScore?.score ?? 100;
  const breakdown = latestScore?.breakdown ?? [];
  const rulMonths = latestScore?.rul_months ?? null;

  return (
    <main className="min-h-screen pb-12">
      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
        <header className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold text-textPrimary tracking-tight">ProductDNA</h1>
              <p className="text-textSecondary mt-1">Digital Product Passport — Single Device Trust Tracker</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-textMuted">
              <span className="relative flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface border border-border">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                Live
              </span>
            </div>
          </div>
        </header>

        <DeviceHeader device={device} onUpdateNickname={async () => {}} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          <div className="lg:col-span-1 space-y-6">
            <section className="rounded-2xl border border-border bg-surface p-6 animate-fade-in">
              <TrustScoreGauge score={currentScore} size={240} />
            </section>

            <section className="rounded-2xl border border-border bg-surface p-6 animate-slide-up" style={{ animationDelay: "100ms" }}>
              <RULCard rulMonths={rulMonths} score={currentScore} />
            </section>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <section className="rounded-2xl border border-border bg-surface p-6 animate-slide-up" style={{ animationDelay: "200ms" }}>
              <h2 className="text-lg font-semibold text-textPrimary mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m-6 11a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Why This Score
              </h2>
              <ScoreBreakdown breakdown={breakdown} />
            </section>

            <section className="rounded-2xl border border-border bg-surface p-6 animate-slide-up" style={{ animationDelay: "300ms" }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-textPrimary flex items-center gap-2">
                  <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </path>
                </svg>
                Scan History
              </h2>
              <div className="flex items-center gap-2 text-sm text-textMuted">
                <span className="px-2 py-1 rounded-full bg-surfaceElevated border border-border">{scans.length} scans</span>
              </div>
            </div>
              <ScanTimeline scans={scans} />
            </section>
          </div>
        </div>

        <footer className="mt-12 pt-8 border-t border-border/50 text-center text-sm text-textMuted">
          <p>ProductDNA — AI-powered Digital Product Passport</p>
          <p className="mt-1">Tracking device integrity since {new Date(device.created_at).toLocaleDateString()}</p>
        </footer>
      </div>
    </main>
  );
}