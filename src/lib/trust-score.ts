export type FlagType =
  | "component_changed"
  | "battery_degraded"
  | "thermal_anomaly"
  | "normal_wear"
  | "verified_maintenance";

export interface Flag {
  type: FlagType;
  component?: string;
  details?: string;
  severity: "high" | "medium" | "low" | "info";
}

export interface BreakdownItem {
  factor: string;
  points: number;
  reason: string;
}

export interface TrustScoreResult {
  score: number;
  breakdown: BreakdownItem[];
  rulMonths: number | null;
}

const FLAG_WEIGHTS: Record<FlagType, { points: number; severity: Flag["severity"] }> = {
  component_changed: { points: -15, severity: "high" },
  battery_degraded: { points: -10, severity: "medium" },
  thermal_anomaly: { points: -8, severity: "medium" },
  normal_wear: { points: 0, severity: "low" },
  verified_maintenance: { points: 5, severity: "info" },
};

const FLAG_LABELS: Record<FlagType, string> = {
  component_changed: "Unverified Component Change",
  battery_degraded: "Abnormal Battery Degradation",
  thermal_anomaly: "Thermal Anomaly Detected",
  normal_wear: "Normal Wear",
  verified_maintenance: "Verified Maintenance",
};

export function compareSnapshots(baseline: any, current: any): Flag[] {
  const flags: Flag[] = [];

  const baselineCpu = baseline.cpu?.processor_id || baseline.cpu?.ProcessorId;
  const currentCpu = current.cpu?.processor_id || current.cpu?.ProcessorId;
  if (baselineCpu && currentCpu && baselineCpu !== currentCpu) {
    flags.push({
      type: "component_changed",
      component: "CPU",
      details: `Processor ID changed from ${baselineCpu} to ${currentCpu}`,
      severity: "high",
    });
  }

  const baselineMbSerial = baseline.motherboard?.serial_number || baseline.motherboard?.SerialNumber;
  const currentMbSerial = current.motherboard?.serial_number || current.motherboard?.SerialNumber;
  if (baselineMbSerial && currentMbSerial && baselineMbSerial !== currentMbSerial) {
    flags.push({
      type: "component_changed",
      component: "Motherboard",
      details: `Motherboard serial changed from ${baselineMbSerial} to ${currentMbSerial}`,
      severity: "high",
    });
  }

  const baselineRamSerials = new Set(
    (baseline.ram || []).map((m: any) => m.serial_number || m.SerialNumber).filter(Boolean)
  );
  const currentRamSerials = new Set(
    (current.ram || []).map((m: any) => m.serial_number || m.SerialNumber).filter(Boolean)
  );
  const addedRam = [...currentRamSerials].filter((s) => !baselineRamSerials.has(s));
  const removedRam = [...baselineRamSerials].filter((s) => !currentRamSerials.has(s));
  if (addedRam.length > 0 || removedRam.length > 0) {
    flags.push({
      type: "component_changed",
      component: "RAM",
      details: `Modules changed: ${addedRam.length} added, ${removedRam.length} removed`,
      severity: "high",
    });
  }

  const baselineStorageSerials = new Set(
    (baseline.storage || []).map((d: any) => d.serial_number || d.SerialNumber).filter(Boolean)
  );
  const currentStorageSerials = new Set(
    (current.storage || []).map((d: any) => d.serial_number || d.SerialNumber).filter(Boolean)
  );
  const addedStorage = [...currentStorageSerials].filter((s) => !baselineStorageSerials.has(s));
  const removedStorage = [...baselineStorageSerials].filter((s) => !currentStorageSerials.has(s));
  if (addedStorage.length > 0 || removedStorage.length > 0) {
    flags.push({
      type: "component_changed",
      component: "Storage",
      details: `Drives changed: ${addedStorage.length} added, ${removedStorage.length} removed`,
      severity: "high",
    });
  }

  const baselineBatteryHealth = baseline.battery?.health_percent;
  const currentBatteryHealth = current.battery?.health_percent;
  const baselineCycles = baseline.battery?.cycle_count || 0;
  const currentCycles = current.battery?.cycle_count || 0;

  if (
    typeof baselineBatteryHealth === "number" &&
    typeof currentBatteryHealth === "number"
  ) {
    const drop = baselineBatteryHealth - currentBatteryHealth;
    const cycleIncrease = currentCycles - baselineCycles;

    if (drop > 5 && cycleIncrease < 50) {
      flags.push({
        type: "battery_degraded",
        component: "Battery",
        details: `Health dropped ${drop.toFixed(1)}% with only ${cycleIncrease} cycles`,
        severity: "medium",
      });
    } else if (drop > 10) {
      flags.push({
        type: "battery_degraded",
        component: "Battery",
        details: `Health dropped ${drop.toFixed(1)}% (${cycleIncrease} cycles)`,
        severity: "medium",
      });
    } else if (drop > 0) {
      flags.push({
        type: "normal_wear",
        component: "Battery",
        details: `Normal degradation: ${drop.toFixed(1)}% over ${cycleIncrease} cycles`,
        severity: "low",
      });
    }
  }

  const currentTemps = current.temperatures || {};
  for (const [zone, sensors] of Object.entries(currentTemps)) {
    if (Array.isArray(sensors)) {
      for (const sensor of sensors) {
        if (typeof sensor.current === "number" && sensor.current > 85) {
          flags.push({
            type: "thermal_anomaly",
            component: zone,
            details: `Temperature ${sensor.current.toFixed(1)}°C exceeds 85°C threshold`,
            severity: "medium",
          });
        }
      }
    }
  }

  const baselineGpu = baseline.gpu?.[0]?.name || baseline.gpu?.[0]?.pci_info;
  const currentGpu = current.gpu?.[0]?.name || current.gpu?.[0]?.pci_info;
  if (baselineGpu && currentGpu && baselineGpu !== currentGpu) {
    flags.push({
      type: "component_changed",
      component: "GPU",
      details: `GPU changed from ${baselineGpu} to ${currentGpu}`,
      severity: "high",
    });
  }

  return flags;
}

export function calculateTrustScore(
  flags: Flag[],
  previousScore: number = 100
): TrustScoreResult {
  const breakdown: BreakdownItem[] = [];
  let score = previousScore;

  const flagsByType = new Map<FlagType, Flag[]>();
  for (const flag of flags) {
    const existing = flagsByType.get(flag.type) || [];
    existing.push(flag);
    flagsByType.set(flag.type, existing);
  }

  for (const [type, typeFlags] of flagsByType) {
    const weight = FLAG_WEIGHTS[type];
    const totalPoints = weight.points * typeFlags.length;
    score += totalPoints;

    if (typeFlags.length > 0) {
      const flag = typeFlags[0];
      breakdown.push({
        factor: FLAG_LABELS[type],
        points: totalPoints,
        reason: typeFlags.map((f) => f.details).join("; "),
      });
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const rulMonths = estimateRUL(flags, score);

  return { score, breakdown, rulMonths };
}

function estimateRUL(flags: Flag[], currentScore: number): number | null {
  const batteryFlag = flags.find((f) => f.type === "battery_degraded" || f.type === "normal_wear");
  const storageFlag = flags.find((f) => f.component === "Storage");

  let baseMonths = 36;

  if (currentScore >= 80) baseMonths = 36;
  else if (currentScore >= 50) baseMonths = 24;
  else baseMonths = 12;

  if (batteryFlag) {
    const cycles = extractCycles(batteryFlag.details);
    if (cycles > 0) {
      const remainingCycles = Math.max(0, 1000 - cycles);
      const monthsFromCycles = (remainingCycles / 1000) * 36;
      baseMonths = Math.min(baseMonths, monthsFromCycles);
    }
  }

  if (storageFlag && storageFlag.type === "component_changed") {
    baseMonths = Math.min(baseMonths, 6);
  }

  return Math.max(0, Math.round(baseMonths));
}

function extractCycles(details?: string): number {
  if (!details) return 0;
  const match = details.match(/(\d+)\s*cycles?/i);
  return match ? parseInt(match[1], 10) : 0;
}

export function getScoreColor(score: number): string {
  if (score >= 80) return "#10b981";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

export function getScoreLabel(score: number): string {
  if (score >= 80) return "Trusted";
  if (score >= 50) return "Caution";
  return "Critical";
}