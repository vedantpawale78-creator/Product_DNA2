"use client";

import { Battery, TrendingUp, AlertTriangle } from "lucide-react";

interface RULCardProps {
  rulMonths: number | null;
  score: number;
}

export default function RULCard({ rulMonths, score }: RULCardProps) {
  if (rulMonths === null) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-center">
        <Battery className="w-12 h-12 mx-auto mb-3" style={{ color: "#64748b" }} />
        <p className="text-textSecondary">Insufficient data</p>
        <p className="text-xs text-textMuted mt-1">Run more scans for RUL estimate</p>
      </div>
    );
  }

  const years = Math.floor(rulMonths / 12);
  const months = rulMonths % 12;
  const display = years > 0
    ? `${years}y ${months}m`
    : `${months}m`;

  const isCritical = rulMonths < 6;
  const isWarning = rulMonths < 18;

  return (
    <div className={`rounded-xl border p-6 relative overflow-hidden ${isCritical ? "border-danger/30 bg-danger/5" : isWarning ? "border-warning/30 bg-warning/5" : "border-success/30 bg-success/5"}`}>
      <div className="absolute top-0 right-0 w-32 h-32 opacity-10" style={{ background: "radial-gradient(circle, currentColor 0%, transparent 70%)" }} />

      <div className="relative flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-textSecondary mb-2">
            <Battery className="w-4 h-4" />
            <span>Estimated Remaining Life</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold tabular-nums text-textPrimary">{display}</span>
            <span className="text-sm text-textMuted">remaining</span>
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-center justify-end gap-1.5 mb-1">
            {isCritical && <AlertTriangle className="w-4 h-4 text-danger" />}
            {isWarning && !isCritical && <AlertTriangle className="w-4 h-4 text-warning" />}
            {!isWarning && !isCritical && <TrendingUp className="w-4 h-4 text-success" />}
            <span className={`text-sm font-medium ${isCritical ? "text-danger" : isWarning ? "text-warning" : "text-success"}`}>
              {isCritical ? "Critical" : isWarning ? "Limited" : "Healthy"}
            </span>
          </div>
          <p className="text-xs text-textMuted">Based on battery cycles & component health</p>
        </div>
      </div>

      <div className="mt-4 relative">
        <div className="h-2 rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${Math.max(0, Math.min(100, (rulMonths / 48) * 100))}%`,
              backgroundColor: isCritical ? "#ef4444" : isWarning ? "#f59e0b" : "#10b981",
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-textMuted mt-1">
          <span>0m</span>
          <span>48m+</span>
        </div>
      </div>
    </div>
  );
}