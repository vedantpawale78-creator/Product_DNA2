"use client";

import { useState } from "react";
import { Edit2, Save, X, Cpu, HardDrive, MemoryStick, Battery, Thermometer } from "lucide-react";

interface DeviceHeaderProps {
  device: {
    device_id: string;
    nickname: string | null;
    baseline_snapshot: any;
    created_at: string;
  };
  onUpdateNickname: (nickname: string) => Promise<void>;
}

export default function DeviceHeader({ device, onUpdateNickname }: DeviceHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState(device.nickname || "My Laptop");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onUpdateNickname(nickname);
    setEditing(false);
    setSaving(false);
  };

  const baseline = device.baseline_snapshot;
  const cpuName = baseline.cpu?.name || baseline.cpu?.Name || "Unknown CPU";
  const mbName = baseline.motherboard?.product || baseline.motherboard?.Product || "Unknown Motherboard";
  const ramCount = baseline.ram?.length || 0;
  const storageCount = baseline.storage?.length || 0;
  const batteryHealth = baseline.battery?.health_percent;

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center border border-accent/30">
              <Cpu className="w-8 h-8" style={{ color: "#00d4ff" }} />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-accent border-2 border-background flex items-center justify-center">
              <span className="text-xs font-bold text-background">1</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              {editing ? (
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  autoFocus
                  className="bg-background border border-border rounded-lg px-3 py-1.5 text-textPrimary focus:outline-none focus:border-accent"
                  style={{ minWidth: 200 }}
                />
              ) : (
                <h1 className="text-2xl font-bold text-textPrimary" onDoubleClick={() => setEditing(true)}>
                  {nickname}
                </h1>
              )}
              {editing ? (
                <div className="flex items-center gap-1">
                  <button onClick={handleSave} disabled={saving} className="p-1.5 rounded-lg hover:bg-accent/20 text-accent transition-colors" aria-label="Save">
                    <Save className="w-4 h-4" />
                  </button>
                  <button onClick={() => { setNickname(device.nickname || "My Laptop"); setEditing(false); }} className="p-1.5 rounded-lg hover:bg-danger/20 text-danger transition-colors" aria-label="Cancel">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg hover:bg-surfaceElevated text-textMuted transition-colors" aria-label="Edit nickname">
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-sm text-textMuted mt-1">Device ID: <code className="font-mono text-xs">{device.device_id.slice(0, 8)}...{device.device_id.slice(-8)}</code></p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-textMuted">
          <span className="px-2 py-1 rounded-full bg-surfaceElevated border border-border">
            Registered {new Date(device.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-4 border-t border-border">
        <StatItem icon={Cpu} label="CPU" value={cpuName.length > 20 ? cpuName.slice(0, 20) + "..." : cpuName} />
        <StatItem icon={MemoryStick} label="RAM" value={`${ramCount} module${ramCount !== 1 ? "s" : ""}`} />
        <StatItem icon={HardDrive} label="Storage" value={`${storageCount} drive${storageCount !== 1 ? "s" : ""}`} />
        <StatItem icon={Battery} label="Battery" value={batteryHealth ? `${batteryHealth}%` : "N/A"} />
        <StatItem icon={Thermometer} label="Thermal" value="Monitored" />
      </div>
    </div>
  );
}

function StatItem({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-surfaceElevated/50 border border-border/50">
      <Icon className="w-5 h-5 text-accent" />
      <div className="min-w-0">
        <p className="text-xs text-textMuted uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium text-textPrimary truncate">{value}</p>
      </div>
    </div>
  );
}