# ProductDNA Web Application

Next.js 14 (App Router) + TypeScript + Tailwind CSS + Supabase deployment for Vercel.

## Architecture

- **Single Device Passport**: Tracks exactly ONE laptop per deployment
- **Real-time Trust Score**: Rule-based scoring with explainable breakdown
- **Scan History**: Vertical timeline of all diagnostic scans
- **RUL Estimate**: Remaining Useful Life from battery cycles + component health

## Tech Stack

- Next.js 14 (App Router, Server Components)
- TypeScript
- Tailwind CSS (dark, premium theme)
- Supabase (PostgreSQL + RLS)
- Vercel (deployment)

## Database Schema

Run `supabase/schema.sql` in Supabase SQL Editor. Creates:

- `device` — single device record (device_id, baseline_snapshot, nickname)
- `scans` — historical snapshots with detection flags
- `trust_scores` — computed scores with breakdown + RUL

## Environment Variables

Create `.env.local` from `.env.local.example`:

```bash
cp .env.local.example .env.local
```

Required:
- `NEXT_PUBLIC_SUPABASE_URL` — from Supabase Settings → API
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase Settings → API
- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase Settings → API (keep secret!)

## Local Development

```bash
cd webapp
npm install
npm run dev
```

Open http://localhost:3000

## Deployment to Vercel

### 1. Create Supabase Project

1. Go to https://supabase.com → New Project
2. Wait for database to be ready
3. Go to SQL Editor → Run `supabase/schema.sql`
4. Go to Settings → API → Copy:
   - Project URL
   - `anon` public key
   - `service_role` secret key

### 2. Deploy to Vercel

1. Push this repo to GitHub
2. Go to Vercel → Add New Project → Import from GitHub
3. Configure:
   - Framework Preset: Next.js
   - Root Directory: `webapp`
4. Add Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon key
   - `SUPABASE_SERVICE_ROLE_KEY` = your service role key
5. Deploy

### 3. Configure Diagnostic Agent

After deployment, you'll get a URL like `https://productdna-xyz.vercel.app`

Edit `diagnostic_agent/config.json`:
```json
{
  "api_url": "https://productdna-xyz.vercel.app/api/scan",
  "device_id": ""
}
```

### 4. Run First Scan

On your laptop:
```bash
cd diagnostic_agent
pip install -r requirements.txt
python diagnostic_agent.py
```

This will:
1. Generate a `device_id` from your hardware UUID
2. Collect full system diagnostics
3. POST to `/api/scan` → creates device passport + baseline + first trust score

### 5. View Dashboard

Refresh your Vercel URL. You should see:
- Device header with hardware info
- Trust Score gauge (starts at 100)
- "Why This Score" breakdown
- Scan history timeline
- RUL estimate card

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/passport` | Create/get device passport (run once) |
| GET | `/api/passport` | Get device + scans + trust score |
| POST | `/api/scan` | Accept diagnostic JSON, compute score |

## Trust Score Logic

Located at `src/lib/trust-score.ts`. Pure TypeScript, no ML.

**Scoring (starts at 100):**
- Unverified component change: -15
- Abnormal battery drop: -10
- Thermal anomaly (>85°C): -8
- Normal wear: 0
- Verified maintenance: +5

**Breakdown**: Returns `{factor, points, reason}` array for explainability.

**RUL Estimate**: From battery cycle count (1000 cycles = ~36 months baseline) + component health.

## Project Structure

```
webapp/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── passport/route.ts  # POST create, GET fetch
│   │   │   └── scan/route.ts      # POST accept scan
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx               # Dashboard (Server Component)
│   ├── components/
│   │   ├── TrustScoreGauge.tsx    # Animated SVG circular gauge
│   │   ├── ScoreBreakdown.tsx     # Expandable factor cards
│   │   ├── ScanTimeline.tsx       # Vertical timeline
│   │   ├── RULCard.tsx            # Remaining Useful Life
│   │   └── DeviceHeader.tsx       # Device info + nickname edit
│   └── lib/
│       ├── supabase.ts            # Supabase clients + queries
│       └── trust-score.ts         # Scoring logic
├── supabase/
│   └── schema.sql                 # Database schema + RLS
├── .env.local.example
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
└── postcss.config.js
```

## Customization

### Change Accent Color

Edit `tailwind.config.ts`:
```ts
accent: "#your-color",
accentDim: "#your-color33",
```

### Adjust Score Weights

Edit `src/lib/trust-score.ts`:
```ts
const FLAG_WEIGHTS = {
  component_changed: { points: -15, severity: "high" },
  battery_degraded: { points: -10, severity: "medium" },
  // ...
};
```

### Add New Flag Types

1. Add to `FlagType` union in `trust-score.ts`
2. Add weight, label, icon, color
3. Add detection logic in `compareSnapshots()`

## Troubleshooting

**"No device passport found"**
- Run diagnostic agent first
- Check API URL in config.json matches deployed Vercel URL

**Supabase connection errors**
- Verify env vars in Vercel dashboard
- Check RLS policies allow anon read / service_role write

**Scan not appearing**
- Check browser devtools Network tab for `/api/scan` response
- Verify `device_id` in diagnostic JSON matches passport

**Trust score not updating**
- Check `/api/scan` response for `score` and `breakdown`
- Verify `trust_scores` table has new row

## Security Notes

- RLS policies: anon can READ, only service_role can WRITE
- Service role key ONLY in server-side code (API routes)
- Never expose service role key to client
- Device ID tied to hardware UUID — cannot be spoofed easily

## License

MIT