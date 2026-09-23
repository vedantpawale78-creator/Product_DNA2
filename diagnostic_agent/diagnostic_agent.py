#!/usr/bin/env python3
"""
ProductDNA Diagnostic Agent
Collects real system hardware data, detects tampering/changes, and sends to API.
Single-device passport - tracks ONE laptop only.
"""

import os
import json
import uuid
import platform
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List

try:
    import psutil
except ImportError:
    psutil = None

try:
    import wmi
except ImportError:
    wmi = None

try:
    import requests
except ImportError:
    requests = None


CONFIG_FILE = Path(__file__).parent / "config.json"
DEFAULT_API_URL = "https://your-vercel-app.vercel.app/api/scan"


def load_config() -> Dict[str, Any]:
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE, "r") as f:
            return json.load(f)
    return {}


def save_config(config: Dict[str, Any]) -> None:
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=2)


def get_or_create_device_id(config: Dict[str, Any]) -> str:
    if "device_id" in config and config["device_id"]:
        return config["device_id"]

    device_id = None

    if platform.system() == "Windows":
        try:
            import wmi as wmi_module
            c = wmi_module.WMI()
            for system in c.Win32_ComputerSystemProduct():
                if system.UUID:
                    device_id = system.UUID
                    break
        except Exception:
            pass

    if not device_id:
        try:
            with open("/etc/machine-id", "r") as f:
                device_id = f.read().strip()
        except Exception:
            pass

    if not device_id:
        try:
            with open("/var/lib/dbus/machine-id", "r") as f:
                device_id = f.read().strip()
        except Exception:
            pass

    if not device_id:
        device_id = str(uuid.uuid4())

    config["device_id"] = device_id
    save_config(config)
    return device_id


def run_command(cmd: List[str]) -> Optional[str]:
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            return result.stdout.strip()
    except Exception:
        pass
    return None


def parse_smartctl_output(output: str) -> Dict[str, Any]:
    data = {}
    for line in output.split("\n"):
        if ":" in line:
            key, value = line.split(":", 1)
            data[key.strip()] = value.strip()
    return data


def get_linux_smart_data() -> List[Dict[str, Any]]:
    drives = []
    for block_device in Path("/sys/block").glob("sd*"):
        device = f"/dev/{block_device.name}"
        output = run_command(["smartctl", "-A", device])
        if output:
            parsed = parse_smartctl_output(output)
            parsed["device"] = device
            drives.append(parsed)
    return drives


def get_windows_smart_data() -> List[Dict[str, Any]]:
    drives = []
    if not wmi:
        return drives
    try:
        c = wmi.WMI()
        for disk in c.Win32_DiskDrive():
            smart_data = {
                "device": disk.DeviceID,
                "model": disk.Model,
                "serial": disk.SerialNumber,
                "size": disk.Size,
                "interface": disk.InterfaceType,
            }
            drives.append(smart_data)
    except Exception:
        pass
    return drives


def get_cpu_info() -> Dict[str, Any]:
    info = {}
    if platform.system() == "Windows" and wmi:
        try:
            c = wmi.WMI()
            for cpu in c.Win32_Processor():
                info = {
                    "name": cpu.Name,
                    "manufacturer": cpu.Manufacturer,
                    "max_clock_speed": cpu.MaxClockSpeed,
                    "current_clock_speed": cpu.CurrentClockSpeed,
                    "number_of_cores": cpu.NumberOfCores,
                    "number_of_logical_processors": cpu.NumberOfLogicalProcessors,
                    "processor_id": cpu.ProcessorId,
                    "socket": cpu.SocketDesignation,
                }
                break
        except Exception:
            pass
    else:
        try:
            with open("/proc/cpuinfo", "r") as f:
                content = f.read()
            for line in content.split("\n"):
                if ":" in line:
                    key, value = line.split(":", 1)
                    key = key.strip()
                    value = value.strip()
                    if key in ["model name", "vendor_id", "cpu family", "model", "stepping", "cpu MHz", "cache size"]:
                        info[key.replace(" ", "_")] = value
        except Exception:
            pass

    if psutil:
        info["physical_cores"] = psutil.cpu_count(logical=False)
        info["logical_cores"] = psutil.cpu_count(logical=True)
        info["cpu_freq"] = psutil.cpu_freq()._asdict() if psutil.cpu_freq() else None

    return info


def get_motherboard_info() -> Dict[str, Any]:
    info = {}
    if platform.system() == "Windows" and wmi:
        try:
            c = wmi.WMI()
            for board in c.Win32_BaseBoard():
                info = {
                    "manufacturer": board.Manufacturer,
                    "product": board.Product,
                    "serial_number": board.SerialNumber,
                    "version": board.Version,
                }
                break
        except Exception:
            pass
    else:
        try:
            output = run_command(["dmidecode", "-t", "baseboard"])
            if output:
                for line in output.split("\n"):
                    if ":" in line:
                        key, value = line.split(":", 1)
                        key = key.strip().lower().replace(" ", "_")
                        value = value.strip()
                        if key in ["manufacturer", "product_name", "serial_number", "version"]:
                            info[key] = value
        except Exception:
            pass
    return info


def get_ram_info() -> List[Dict[str, Any]]:
    modules = []
    if platform.system() == "Windows" and wmi:
        try:
            c = wmi.WMI()
            for mem in c.Win32_PhysicalMemory():
                modules.append({
                    "manufacturer": mem.Manufacturer,
                    "part_number": mem.PartNumber,
                    "serial_number": mem.SerialNumber,
                    "capacity": mem.Capacity,
                    "speed": mem.Speed,
                    "device_locator": mem.DeviceLocator,
                })
        except Exception:
            pass
    else:
        try:
            output = run_command(["dmidecode", "-t", "memory"])
            if output:
                current = {}
                for line in output.split("\n"):
                    line = line.strip()
                    if line.startswith("Memory Device"):
                        if current:
                            modules.append(current)
                        current = {}
                    elif ":" in line:
                        key, value = line.split(":", 1)
                        key = key.strip().lower().replace(" ", "_")
                        value = value.strip()
                        if key in ["manufacturer", "part_number", "serial_number", "size", "speed", "locator"]:
                            current[key] = value
                if current:
                    modules.append(current)
        except Exception:
            pass
    return modules


def get_storage_info() -> List[Dict[str, Any]]:
    drives = []
    if platform.system() == "Windows" and wmi:
        try:
            c = wmi.WMI()
            for disk in c.Win32_DiskDrive():
                drives.append({
                    "device_id": disk.DeviceID,
                    "model": disk.Model,
                    "serial_number": disk.SerialNumber,
                    "size": disk.Size,
                    "interface": disk.InterfaceType,
                    "media_type": disk.MediaType,
                })
        except Exception:
            pass
    else:
        try:
            output = run_command(["lsblk", "-J", "-o", "NAME,MODEL,SERIAL,SIZE,TYPE,MOUNTPOINT"])
            if output:
                data = json.loads(output)
                for block in data.get("blockdevices", []):
                    if block.get("type") == "disk":
                        drives.append({
                            "name": block.get("name"),
                            "model": block.get("model"),
                            "serial": block.get("serial"),
                            "size": block.get("size"),
                        })
        except Exception:
            pass
    return drives


def get_battery_info() -> Dict[str, Any]:
    info = {}
    if platform.system() == "Windows" and wmi:
        try:
            c = wmi.WMI()
            for battery in c.Win32_Battery():
                info = {
                    "name": battery.Name,
                    "chemistry": battery.Chemistry,
                    "design_capacity": battery.DesignCapacity,
                    "full_charge_capacity": battery.FullChargeCapacity,
                    "cycle_count": getattr(battery, "CycleCount", None),
                }
                if info.get("design_capacity") and info.get("full_charge_capacity"):
                    info["health_percent"] = round(
                        (info["full_charge_capacity"] / info["design_capacity"]) * 100, 1
                    )
                break
        except Exception:
            pass
    else:
        try:
            bat_path = Path("/sys/class/power_supply")
            if bat_path.exists():
                for bat in bat_path.glob("BAT*"):
                    info = {}
                    for file in bat.glob("*"):
                        try:
                            info[file.name] = file.read_text().strip()
                        except Exception:
                            pass
                    if "energy_full_design" in info and "energy_full" in info:
                        info["health_percent"] = round(
                            (int(info["energy_full"]) / int(info["energy_full_design"])) * 100, 1
                        )
                    if "charge_full_design" in info and "charge_full" in info:
                        info["health_percent"] = round(
                            (int(info["charge_full"]) / int(info["charge_full_design"])) * 100, 1
                        )
                    if "cycle_count" in info:
                        info["cycle_count"] = int(info["cycle_count"])
                    break
        except Exception:
            pass

    if psutil:
        try:
            battery = psutil.sensors_battery()
            if battery:
                info["percent"] = battery.percent
                info["power_plugged"] = battery.power_plugged
        except Exception:
            pass

    return info


def get_temperature_info() -> Dict[str, Any]:
    temps = {}
    if psutil:
        try:
            sensors = psutil.sensors_temperatures()
            for name, entries in sensors.items():
                temps[name] = []
                for entry in entries:
                    temps[name].append({
                        "label": entry.label,
                        "current": entry.current,
                        "high": entry.high,
                        "critical": entry.critical,
                    })
        except Exception:
            pass

    if platform.system() == "Windows" and wmi:
        try:
            c = wmi.WMI(namespace="root\\wmi")
            for thermal in c.MSAcpi_ThermalZoneTemperature():
                temps[f"thermal_zone_{thermal.InstanceName}"] = [{
                    "current": (thermal.CurrentTemperature / 10.0) - 273.15,
                }]
        except Exception:
            pass

    return temps


def get_gpu_info() -> List[Dict[str, Any]]:
    gpus = []
    if platform.system() == "Windows" and wmi:
        try:
            c = wmi.WMI()
            for gpu in c.Win32_VideoController():
                gpus.append({
                    "name": gpu.Name,
                    "driver_version": gpu.DriverVersion,
                    "video_processor": gpu.VideoProcessor,
                    "adapter_ram": gpu.AdapterRAM,
                })
        except Exception:
            pass
    else:
        try:
            output = run_command(["lspci", "-nn"])
            if output:
                for line in output.split("\n"):
                    if "VGA" in line or "3D" in line or "Display" in line:
                        gpus.append({"pci_info": line.strip()})
        except Exception:
            pass
    return gpus


def collect_diagnostics() -> Dict[str, Any]:
    config = load_config()
    device_id = get_or_create_device_id(config)

    timestamp = datetime.utcnow().isoformat() + "Z"

    data = {
        "device_id": device_id,
        "timestamp": timestamp,
        "os": {
            "system": platform.system(),
            "release": platform.release(),
            "version": platform.version(),
            "machine": platform.machine(),
            "processor": platform.processor(),
        },
        "cpu": get_cpu_info(),
        "motherboard": get_motherboard_info(),
        "ram": get_ram_info(),
        "storage": get_storage_info(),
        "battery": get_battery_info(),
        "temperatures": get_temperature_info(),
        "gpu": get_gpu_info(),
    }

    if platform.system() == "Linux":
        data["smart_data"] = get_linux_smart_data()
    elif platform.system() == "Windows":
        data["smart_data"] = get_windows_smart_data()

    return data


def send_to_api(data: Dict[str, Any], api_url: str) -> bool:
    if not requests:
        print("ERROR: 'requests' library not installed. Install with: pip install requests")
        return False

    try:
        response = requests.post(api_url, json=data, timeout=30)
        response.raise_for_status()
        print(f"SUCCESS: Scan sent to API. Response: {response.status_code}")
        if response.text:
            print(f"Response: {response.text}")
        return True
    except requests.exceptions.RequestException as e:
        print(f"ERROR: Failed to send scan to API: {e}")
        return False


def main():
    print("=" * 60)
    print("ProductDNA Diagnostic Agent")
    print("=" * 60)

    config = load_config()
    api_url = config.get("api_url", DEFAULT_API_URL)

    if api_url == DEFAULT_API_URL:
        print(f"WARNING: Using default API URL. Set your deployed URL in {CONFIG_FILE}")
        print(f"         Edit config.json and add: {{\"api_url\": \"https://your-app.vercel.app/api/scan\"}}")

    print(f"Device ID: {config.get('device_id', 'Not set (will generate)')}")
    print(f"API URL: {api_url}")
    print("-" * 60)

    print("Collecting diagnostics...")
    diagnostics = collect_diagnostics()

    print(f"Collected data for device: {diagnostics['device_id']}")
    print(f"Timestamp: {diagnostics['timestamp']}")
    print(f"OS: {diagnostics['os']['system']} {diagnostics['os']['release']}")
    print(f"CPU: {diagnostics['cpu'].get('name', 'Unknown')}")
    print(f"Motherboard: {diagnostics['motherboard'].get('product', 'Unknown')}")
    print(f"RAM Modules: {len(diagnostics['ram'])}")
    print(f"Storage Devices: {len(diagnostics['storage'])}")
    print(f"Battery Health: {diagnostics['battery'].get('health_percent', 'N/A')}%")
    print(f"GPU Count: {len(diagnostics['gpu'])}")
    print("-" * 60)

    print("Sending to API...")
    success = send_to_api(diagnostics, api_url)

    if success:
        print("Scan completed successfully!")
    else:
        print("Scan failed. Check API URL and network connectivity.")
        sys.exit(1)


if __name__ == "__main__":
    main()