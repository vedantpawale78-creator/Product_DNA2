"use client";

import { useEffect, useRef, useState } from "react";
import { getScoreColor, getScoreLabel } from "@/lib/trust-score";

interface TrustScoreGaugeProps {
  score: number;
  size?: number;
  strokeWidth?: number;
}

export default function TrustScoreGauge({
  score,
  size = 200,
  strokeWidth = 12,
}: TrustScoreGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);
  const color = getScoreColor(score);
  const label = getScoreLabel(score);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);

  useEffect(() => {
    const duration = 1500;
    const startTime = Date.now();
    const startScore = 0;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(startScore + (score - startScore) * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [score]);

  useEffect(() => {
    if (svgRef.current) {
      const circle = svgRef.current.querySelector(".gauge-progress");
      if (circle) {
        circle.setAttribute("stroke-dashoffset", offset.toString());
      }
    }
  }, [offset]);

  return (
    <div className="relative flex flex-col items-center">
      <svg ref={svgRef} width={size} height={size} className="transform -rotate-90">
        <circle
          className="gauge-bg"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1a2234"
          strokeWidth={strokeWidth}
        />
        <circle
          className="gauge-progress"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          style={{
            transition: "stroke-dashoffset 1.5s ease-out",
            filter: `drop-shadow(0 0 8px ${color})`,
          }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span
          className="text-4xl font-bold tabular-nums"
          style={{ color: color }}
        >
          {animatedScore}
        </span>
        <span className="text-xs font-medium uppercase tracking-wider mt-1" style={{ color: color }}>
          {label}
        </span>
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm" style={{ color: "#94a3b8" }}>Trust Score</p>
      </div>
    </div>
  );
}