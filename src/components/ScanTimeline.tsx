"use client";

import { format, formatDistanceToNow } from "date-fns";
import { AlertCircle, CheckCircle, Clock, Info } from "lucide-react";

interface Scan {
  id: string;
  flags: Array<{
    type: string;
    component?: string;
    details?: string;
    severity: string;
  }>;
  created_at: string;
}

interface ScanTimelineProps {
  scans: Scan[];
}

const FLAG_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  component_changed: AlertCircle,
  battery_degraded: AlertCircle,
  thermal_anomaly: AlertCircle,
  normal_wear: Info,
  verified_maintenance: CheckCircle,
};

const FLAG_COLORS: Record<string, string> = {
  component_changed: "text-danger",
  battery_degraded: "text-warning",
  thermal_anomaly: "text-warning",
  normal_wear: "text-textMuted",
  verified_maintenance: "text-success",
};

const FLAG_LABELS: Record<string, string> = {
  component_changed: "Component Changed",
  battery_degraded: "Battery Degraded",
  thermal_anomaly: "Thermal Anomaly",
  normal_wear: "Normal Wear",
  verified_maintenance: "Verified Maintenance",
};

export default function ScanTimeline({ scans }: ScanTimelineProps) {
  if (scans.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <Clock className="w-12 h-12 mx-auto mb-3" style={{ color: "#64748b" }} />
        <p className="text-textSecondary">No scans yet</p>
        <p className="text-xs text-textMuted mt-1">Run the diagnostic agent to record your first scan</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
      {scans.map((scan, index) => (
        <div key={scan.id} className="relative pl-16 pb-8 last:pb-0">
          <div className="absolute left-0 top-1 flex items-center justify-center w-12 h-12">
            <div
              className="relative z-10 rounded-full w-3 h-3 border-4 border-background"
              style={{
                backgroundColor: scan.flags.some((f) => f.severity === "high") ? "#ef4444" :
                  scan.flags.some((f) => f.severity === "medium") ? "#f59e0b" : "#10b981",
                boxShadow: "0 0 0 2px currentColor",
              }}
            />
          </div>

          <div className="rounded-xl border border-border bg-surface p-4 hover:border-accent/30 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-textPrimary">
                    {format(new Date(scan.created_at), "MMM d, yyyy HH:mm")}
                  </span>
                  <span className="text-xs text-textMuted">
                    ({formatDistanceToNow(new Date(scan.created_at), { addSuffix: true })})
                  </span>
                </div>

                {scan.flags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {scan.flags.map((flag, flagIndex) => {
                      const Icon = FLAG_ICONS[flag.type] || Info;
                      return (
                        <span
                          key={`${flag.type}-${flagIndex}`}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${FLAG_COLORS[flag.type]} bg-opacity-10`}
                          style={{ backgroundColor: `${FLAG_COLORS[flag.type]}1A` }}
                        >
                          <Icon className="w-3 h-3" />
                          {flag.component ? `${FLAG_LABELS[flag.type]}: ${flag.component}` : FLAG_LABELS[flag.type]}
                        </span>
                      );
                    })}
                  </div>
                )}

                {scan.flags.length === 0 && (
                  <p className="mt-3 text-sm text-textMuted">No anomalies detected — system clean</p>
                )}
              </div>

              {index === 0 && (
                <span className="flex-shrink-0 px-2 py-1 rounded-full text-xs font-medium bg-success/20 text-success border border-success/30">
                  Latest
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}