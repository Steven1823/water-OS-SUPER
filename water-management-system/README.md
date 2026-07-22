# 💧 Water Management System
**Real-time IoT Dashboard for Water Utility Management & Fleet Operations**

A complete enterprise water utility management platform with operator machine provisioning, real-time fleet monitoring, billing automation, and integrated cellular telemetry. Track liters sold, manage customers, generate bills, process payments, and self-provision new water machines—all from a secure dashboard backed by Supabase.

## 🎯 Features

### Dashboard & Operations
- **Real-time Machine Monitoring**: Live status, last-seen timestamps, tank levels
- **Connect Machine Wizard**: Dashboard-based provisioning without SQL (3-step: details → credentials → wait for connection)
- **Fleet Management**: View all machines, manage secrets, activate/deactivate, mark maintenance
- **Customer & Meter Tracking**: Manage customers, track meters, view readings history
- **Automated Billing**: Monthly billing engine with configurable tariff rates per customer type
- **Payment Processing**: Record and track payments (cash, M-Pesa, bank transfer, cheque)
- **Analytics Dashboard**: KPIs, revenue trends, consumption charts, payment method breakdown

### Security & Authentication
- **Per-Machine Device Secrets**: Each machine gets unique 32-byte random secret (bcrypt hashed, never stored plaintext)
- **Supabase Auth**: JWT-based authentication with staff/operator roles
- **Role-Based Access Control**: RLS policies on all tables (customers, meters, machines, bills, payments)
- **Secure Credentials**: Device secrets regenerable on-demand if compromised

### Firmware & Connectivity
- **Cellular Connectivity**: ESP32 + SIM7000 (NB-IoT/LTE-M) for remote sites
- **Flow Meter Integration**: Hall-effect sensor with pulse-counting (configurable calibration)
- **Power Optimization**: Deep sleep between 15-minute report cycles
- **Battery Monitoring**: Reports battery voltage, signal strength (RSSI)

## 📦 Project Structure

```
water-management-system/
├── src/                              # React + TypeScript frontend
│   ├── pages/                        # Page components (Dashboard, Customers, Machines, etc.)
│   │   ├── ConnectMachine.tsx       # 3-step machine provisioning wizard
│   │   ├── Machines.tsx              # Fleet management & machine list
│   │   ├── Dashboard.tsx             # KPI dashboard with real-time analytics
│   │   ├── Customers.tsx             # Customer management
│   │   ├── Meters.tsx                # Meter tracking
│   │   ├── Readings.tsx              # Historical readings
│   │   ├── Billing.tsx               # Bill management
│   │   ├── Payments.tsx              # Payment tracking
│   │   └── ... (Maintenance, Reports, Staff, Inventory)
│   ├── components/                   # Reusable components
│   │   ├── Layout.tsx                # Sidebar + top navigation
│   │   ├── StatCard.tsx              # KPI cards
│   │   ├── SalesChart.tsx            # Revenue/consumption charts
│   │   └── ... (AlertsPanel, LiquidGauge, MachineCard)
│   ├── hooks/                        # Real-time data hooks with Supabase subscriptions
│   │   ├── useMachines.ts            # Machine list + live updates
│   │   ├── useProvisionMachine.ts    # Provisioning status tracking
│   │   ├── useCustomers.ts           # Customer data
│   │   ├── useBills.ts               # Billing data
│   │   ├── usePayments.ts            # Payment data
│   │   └── ... (useMeterReadings, useDashboardMetrics)
│   ├── lib/
│   │   └── supabaseClient.ts         # Supabase client initialization
│   ├── styles/                       # CSS styling
│   │   ├── connect-machine.css       # Wizard styling
│   │   ├── list-page.css             # Table & modal styles
│   │   ├── layout.css                # Sidebar + navigation
│   │   └── dashboard.css             # Dashboard styling
│   ├── App.tsx                       # React Router setup (11 routes)
│   ├── main.tsx                      # Entry point
│   └── types.ts                      # TypeScript types
├── supabase/                         # Backend (Supabase)
│   ├── schema.sql                    # 10 tables + 10 analytics views with RLS
│   ├── functions/                    # Deno Edge Functions
│   │   ├── ingest-reading/           # Device telemetry endpoint (bcrypt secret verification)
│   │   ├── provision-machine/        # Machine provisioning (generates per-machine secrets)
│   │   ├── regenerate-secret/        # Secret rotation if compromised
│   │   └── generate-bills/           # Scheduled/on-demand billing engine
│   └── migrations/                   # 11 SQL migrations (customer types, machines, readings, etc.)
├── firmware/                         # ESP32 Arduino firmware
│   └── water_machine_cellular/
│       └── water_machine_cellular.ino  # Cellular modem + flow meter code
├── docs/                             # Documentation
│   ├── README.md                     # This file
│   ├── ARCHITECTURE.md               # System design & data flows
│   ├── HARDWARE_INTEGRATION.md       # Flow sensors, cellular, provisioning guide
│   ├── DEPLOYMENT_GUIDE.md           # Deployment & testing
│   ├── GENERATE_BILLS_EDGE_FUNCTION.md  # Billing function docs
│   └── IMPLEMENTATION_SUMMARY.md     # Project status summary
├── .env.example                      # Environment variables template
├── .gitignore                        # Git ignore (excludes .env, .vscode, node_modules)
├── package.json                      # Node.js dependencies
├── tsconfig.json                     # TypeScript config
├── vite.config.ts                    # Vite build config
└── index.html                        # HTML entry point
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account ([supabase.com](https://supabase.com))
- Arduino IDE (for firmware flashing)
- Git (for version control)

### 1. Clone & Setup
```bash
git clone https://github.com/YOUR_USERNAME/water-management-system.git
cd water-management-system
npm install
```

### 2. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Copy your **Project URL** and **Anon Key** from Settings → API
3. In VS Code, create `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
4. Fill in your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   # Passkey paid-access key configuration
   VITE_PASSKEY_ACCESS_KEY=YOUR_ISSUED_SECRET_KEY
   # Optional: comma-separated keys
   VITE_PASSKEY_ACCESS_KEYS=KEY_ONE,KEY_TWO,KEY_THREE
   ```

### 3. Deploy Database & Functions
```bash
# Log in to Supabase CLI
npx supabase login

# Link to your project
npx supabase link --project-ref YOUR_PROJECT_REF

# Run migrations (creates tables, views, RLS policies)
npm run db:migrate  # or manually run supabase/schema.sql in the SQL editor

# Deploy Edge Functions
npx supabase functions deploy ingest-reading
npx supabase functions deploy provision-machine
npx supabase functions deploy regenerate-secret
npx supabase functions deploy generate-bills
```

### 4. Run Development Server
```bash
npm run dev
```
Open http://localhost:5173 in your browser.

### 5. Provision Your First Machine
1. Navigate to **Operations** → **➕ Connect Machine**
2. Fill in machine details:
   - **Name**: "Test Machine"
   - **Serial Number**: "WM-TEST-001"
   - **Address**: "Test Location"
   - **Tank Capacity**: 1000 L
   - **Daily Target**: 500 L
3. Click **"Next: Generate Credentials"**
4. Copy the **Device Secret** (shown once only!)
5. Test with the provided cURL command:
   ```bash
   curl -X POST "https://your-project.supabase.co/functions/v1/ingest-reading" \
     -H "Content-Type: application/json" \
     -H "x-device-key: WM-TEST-001:<device-secret>" \
     -d '{
       "serial_number": "WM-TEST-001",
       "liters_dispensed_total": 100,
       "tank_level_percent": 85,
       "flow_rate_lpm": 2.5,
       "battery_voltage": 4.2,
       "signal_rssi": -75
     }'
   ```
6. Watch the dashboard update in real-time!

## 📊 Database Schema

### Core Tables
- **machines**: Water dispensing machines with per-machine device secrets
- **customers**: End customers (restaurants, shops, households)
- **meters**: Water meters assigned to customers
- **meter_readings**: Flow meter readings (timestamp, liters, tank level, battery)
- **sales**: Transaction-level sales (liters × tariff rate)
- **bills**: Monthly bills (generated by billing engine)
- **payments**: Payment records (cash, M-Pesa, bank, cheque)
- **employees**: Staff/operator accounts with roles
- **roles**: Role definitions (admin, staff, operator)
- **customer_types**: Tariff classifications (residential, commercial, industrial)

### Analytics Views
- `v_dashboard_summary`: 6 KPIs (total machines, revenue, consumption, etc.)
- `v_revenue_last_12_months`: Monthly revenue trend
- `v_consumption_last_12_months`: Monthly consumption trend
- `v_bill_status_breakdown`: Bills by status (pending, paid, overdue)
- `v_payment_method_breakdown`: Payments by method
- `v_customer_growth_last_12_months`: New customers per month
- `v_customer_receivables`: Aging unpaid bills
- `v_meters_by_customer`: Meters grouped by customer
- `v_repair_summary`: Maintenance tickets summary
- `v_leak_summary`: Leak reports summary

## 🔐 Security Notes

### ⚠️ NEVER Commit
- `.env` or `.env.local` files (contain Supabase keys)
- `.vscode/` folder (contains personal settings)
- `node_modules/` (generated)
- Any files matching `.gitignore`

### Environment Variables
```
# Frontend (safe to share, used by browser)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Backend (in Supabase console, not in .env)
SUPABASE_SERVICE_ROLE_KEY=... (Edge Function auth)
```

### Device Secrets
- Each machine has a **unique 32-byte random device secret**
- Secrets are **bcrypt hashed** (salt 12) before storage
- Plaintext secret is **shown once** during provisioning
- If lost, regenerate via "Manage" → "Regenerate Secret"
- Old secret is **immediately invalidated** (cannot be recovered)

### Role-Based Access Control
- **staff**: Can provision machines, regenerate secrets, manage fleet
- **operator**: Can view machines and readings
- **admin**: Full database access (rarely needed)
- **RLS policies**: All tables restrict access by role

## 🛠️ Development Commands

```bash
# Frontend
npm run dev              # Start dev server (http://localhost:5173)
npm run build            # Build for production (dist/)
npm run preview          # Preview production build
npm run lint             # Run ESLint

# TypeScript
npx tsc --noEmit        # Type check without emitting

# Supabase
npx supabase start      # Start local Supabase (Docker required)
npx supabase stop       # Stop local Supabase
npx supabase functions deploy <name>  # Deploy Edge Function
npx supabase functions list            # List all functions
```

## 📄 Documentation

- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System design, data flows, and database design
- **[HARDWARE_INTEGRATION.md](docs/HARDWARE_INTEGRATION.md)** - Flow sensors, cellular setup, machine provisioning guide
- **[DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md)** - Production deployment steps
- **[GENERATE_BILLS_EDGE_FUNCTION.md](docs/GENERATE_BILLS_EDGE_FUNCTION.md)** - Billing automation docs
- **[IMPLEMENTATION_SUMMARY.md](docs/IMPLEMENTATION_SUMMARY.md)** - Feature overview and status

## 🌐 Deployment

### Deploy Frontend
```bash
npm run build
# Option 1: Vercel (recommended for React/Vite)
vercel deploy --prod

# Option 2: Netlify
netlify deploy --prod --dir=dist

# Option 3: Supabase Hosting
supabase link --project-ref <your-project-ref>
supabase functions deploy
```

### Deploy Edge Functions
```bash
npx supabase functions deploy ingest-reading
npx supabase functions deploy provision-machine
npx supabase functions deploy regenerate-secret
npx supabase functions deploy generate-bills
```

### Schedule Billing (Optional)
In Supabase dashboard (Extensions → cron):
```sql
SELECT cron.schedule('generate-monthly-bills', '0 1 1 * *',
  $$SELECT http_post('https://your-project.functions.supabase.co/functions/v1/generate-bills',
    '{}',
    'application/json'
  )$$
);
```

## 📱 Firmware Setup

For ESP32 + SIM7000 machine:
1. Open `firmware/water_machine_cellular/water_machine_cellular.ino` in Arduino IDE
2. Update constants:
   ```cpp
   #define SERIAL_NUMBER "WM-TEST-001"           // from Connect Machine dashboard
   #define DEVICE_SECRET "your-32-byte-secret"   // from dashboard
   #define INGEST_HOST "your-project.supabase.co"
   ```
3. Install libraries: TinyGSM, ArduinoJson
4. Select Board: ESP32 Dev Module
5. Compile and upload to device
6. Monitor serial output for connectivity logs

See [HARDWARE_INTEGRATION.md](docs/HARDWARE_INTEGRATION.md) for wiring diagrams and sensor calibration.

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Missing VITE_SUPABASE_URL" | Create `.env.local` with Supabase credentials (cp .env.example .env.local) |
| Machine not connecting | Check serial number matches in firmware and dashboard; verify cellular coverage |
| "Invalid device secret" (401) | Regenerate secret via dashboard and re-flash firmware |
| Dashboard loads but no data | Check RLS policies; ensure user is authenticated and has proper role |
| Build fails (TypeScript errors) | Run `npm install` and `npx tsc --noEmit` to diagnose |
| Edge Function deploy fails | Run `npx supabase login` and `npx supabase link` first |

## 📝 Git Workflow

### Push to GitHub (One File at a Time)
```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit: water management system"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/water-management-system.git
git push -u origin main

# For future changes, push selectively:
git add src/pages/ConnectMachine.tsx
git commit -m "feat: add connect machine wizard"
git push

# Or push specific folders:
git add supabase/functions/provision-machine/
git commit -m "feat: provision-machine edge function"
git push
```

### .gitignore (Enforced Excludes)
```
# Never committed:
.env
.env.local
.vscode/
node_modules/
dist/
.idea/
*.log
```

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make changes and commit: `git commit -m "feat: description"`
3. Push to GitHub: `git push origin feature/your-feature`
4. Open a Pull Request

## 📄 License

MIT License — see LICENSE file for details

## 🆘 Support

For issues, documentation, or questions:
- Check [ARCHITECTURE.md](docs/ARCHITECTURE.md) for system overview
- See [HARDWARE_INTEGRATION.md](docs/HARDWARE_INTEGRATION.md) for device setup
- Review [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) for production setup
- Open an GitHub issue with detailed reproduction steps

---

**Built with ❤️ by Your Team** | Last Updated: 2026-07-21
