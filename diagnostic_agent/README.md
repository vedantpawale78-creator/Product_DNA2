# ProductDNA Diagnostic Agent

Standalone Python script that collects real hardware diagnostics from a single laptop and sends them to the ProductDNA API.

## Requirements

- Python 3.8+
- Windows: `wmi` package (installed via requirements.txt)
- Linux: `smartctl` (smartmontools), `dmidecode`, `lsblk`, `lspci` (system packages)

## Installation

```bash
cd diagnostic_agent
pip install -r requirements.txt

# Linux additional packages:
# Ubuntu/Debian: sudo apt install smartmontools dmidecode util-linux pciutils
# Arch: sudo pacman -S smartmontools dmidecode util-linux pciutils
# Fedora: sudo dnf install smartmontools dmidecode util-linux pciutils
```

## Configuration

Edit `config.json`:
```json
{
  "api_url": "https://your-vercel-app.vercel.app/api/scan",
  "device_id": ""
}
```

- `api_url`: Your deployed Vercel URL + `/api/scan`
- `device_id`: Leave empty - will be auto-generated from machine UUID on first run

## Usage

Run manually:
```bash
python diagnostic_agent.py
```

### Windows Task Scheduler (periodic scans)

1. Open Task Scheduler
2. Create Basic Task → Name: "ProductDNA Scan"
3. Trigger: Daily (or your preferred interval)
4. Action: Start a Program
   - Program: `python.exe` (full path, e.g., `C:\Python311\python.exe`)
   - Arguments: `C:\path\to\diagnostic_agent\diagnostic_agent.py`
   - Start in: `C:\path\to\diagnostic_agent`

### Linux cron (periodic scans)

```bash
crontab -e
# Run daily at 3 AM
0 3 * * * /usr/bin/python3 /path/to/diagnostic_agent/diagnostic_agent.py >> /var/log/productdna.log 2>&1
```

## What It Collects

- **CPU**: Model, cores, clock speeds, processor ID
- **Motherboard**: Manufacturer, product, serial, version
- **RAM**: Per-module manufacturer, part number, serial, capacity, speed
- **Storage**: Model, serial, size, interface type, SMART health data
- **Battery**: Design capacity, current capacity, health %, cycle count
- **Temperatures**: All available thermal sensors
- **GPU**: Model, driver version, VRAM

## First Run

On first run, the agent:
1. Generates a `device_id` from machine UUID (Windows) or `/etc/machine-id` (Linux)
2. Saves it to `config.json`
3. This becomes THE device this passport tracks forever

## Output

Posts JSON to `api_url`:
```json
{
  "device_id": "uuid-from-hardware",
  "timestamp": "2024-01-15T10:30:00Z",
  "os": {...},
  "cpu": {...},
  "motherboard": {...},
  "ram": [...],
  "storage": [...],
  "battery": {...},
  "temperatures": {...},
  "gpu": [...],
  "smart_data": [...]
}
```