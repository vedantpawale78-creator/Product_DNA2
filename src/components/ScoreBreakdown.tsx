"use client";

import { useState } from "react";
import { BreakdownItem } from "@/lib/trust-score";
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle, MinusCircle, Info } from "lucide-react";

interface ScoreBreakdownProps {
  breakdown: BreakdownItem[];
}

export default function ScoreBreakdown({ breakdown }: ScoreBreakdownProps) {
  const [expanded, setExpanded] = useState<Map<number, boolean>>(new Map());

  const getIcon = (points: number) => {
    if (points < 0) return <AlertCircle className="w-5 h-5 text-danger" />;
    if (points > 0) return <CheckCircle className="w-5 h-5 text-success" />;
    return <MinusCircle className="w-5 h-5 text-warning" />;
  };

  const getSeverityColor = (points: number) => {
    if (points < -10) return "bg-danger/20 border-danger/30";
    if (points < 0) return "bg-warning/20 border-warning/30";
    if (points > 0) return "bg-success/20 border-success/30";
    return "bg-surfaceElevated border-border";
  };

  const getPointsLabel = (points: number) => {
    if (points > 0) return `+${points}`;
    return `${points}`;
  };

  if (breakdown.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-center">
        <Info className="w-10 h-10 mx-auto mb-3" style={{ color: "#64748b" }} />
        <p className="text-textSecondary">No factors affecting score</p>
        <p className="text-xs text-textMuted mt-1">Run a scan to see breakdown</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {breakdown.map((item, index) => (
        <div
          key={`${item.factor}-${index}`}
          className={`rounded-xl border p-4 transition-all ${getSeverityColor(item.points)}`}
        >
          <button
            onClick={() => {
              const newExpanded = new Map(expanded);
              newExpanded.set(index, !expanded.get(index));
              setExpanded(newExpanded);
            }}
            className="flex items-start gap-3 w-full text-left"
            aria-expanded={expanded.get(index) || false}
          >
            <div className="flex-shrink-0 mt-0.5">{getIcon(item.points)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-textPrimary truncate pr-2">{item.factor}</h4>
                <span
                  className="font-mono font-semibold text-sm flex-shrink-0"
                  style={{ color: item.points < 0 ? "#ef4444" : item.points > 0 ? "#10b981" : "#f59e0b" }}
                >
                  {getPointsLabel(item.points)} pts
                </span>
              </div>
              <p className="text-sm text-textSecondary mt-1 line-clamp-2">{item.reason}</p>
            </div>
            <div className="flex-shrink-0">
              {expanded.get(index) ? (
                <ChevronUp className="w-5 h-5 text-textMuted" />
              ) : (
                <ChevronDown className="w-5 h-5 text-textMuted" />
              )}
            </div>
          </button>

          {expanded.get(index) && (
            <div className="mt-3 pt-3 border-t border-border/50 animate-slide-up">
              <div className="grid gap-2 sm:grid-cols-2 text-sm">
                <div>
                  <span className="text-textMuted">Factor:</span>
                  <span className="ml-2 font-medium text-textPrimary">{item.factor}</span>
                </div>
                <div>
                  <span className="text-textMuted">Impact:</span>
                  <span className="ml-2 font-mono font-semibold" style={{ color: item.points < 0 ? "#ef4444" : item.points > 0 ? "#10b981" : "#f59e0b" }}>
                    {getPointsLabel(item.points)} points
                  </span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-textMuted">Details:</span>
                  <p className="mt-1 text-textSecondary">{item.reason}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}