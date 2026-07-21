# Architecture — Water Management System

## 1. Goal

Track and manage a fleet of water dispensing machines (e.g. water ATMs / kiosks):
- How many liters each machine has dispensed, in near real time
- Revenue collected per machine
- Machine health: online/offline, tank level, battery, faults
- A live dashboard for operators, built with Vite + React

## 2. High-level architecture

```
 ┌────────────────────┐      Cellular (NB-IoT/LTE-M/2G)      ┌─────────────────────────┐
 │  Water Machine      │ ───────────────────────────────────▶ │  Supabase Edge Function  │
 │  (ESP32 + flow      │        HTTPS POST /ingest-reading     │  "ingest-reading"        │
 │  sensor + SIM7000)  │ ◀─────────────────────────────────── │  (auth, validate, write) │
 └────────────────────┘             200 OK                    └───────────┬─────────────┘
                                                                            │
                                                                            ▼
                                                                ┌─────────────────────┐
                                                                │ Supabase Postgres    │
                                                                │ machines / readings  │
                                                                │ sales / alerts       │
                                                                └───────────┬─────────┘
                                                                            │ Realtime (websocket)
                                                                            ▼
                                                                ┌─────────────────────┐
                                                                │ Vite + React         │
                                                                │ Operator Dashboard   │
                                                                └─────────────────────┘
```

Why this shape:
- **Machines never talk to Postgres directly.** They call one narrow HTTPS
  endpoint (a Supabase Edge Function). This means a stolen/cloned device
  can't do anything except post readings for its own serial number, and
  we can change the database schema without touching firmware.
- **The Edge Function computes deltas server-side.** Devices report a
  lifetime pulse-counter total, not a "liters sold" figure — the server
  works out how much was dispensed since the last report. This makes it
  much harder for a tampered device to fake sales.
- **The dashboard never polls.** It subscribes to Postgres changes over
  Supabase Realtime, so new readings appear within roughly a second of
  being written.

## 3. Data model

See `supabase/schema.sql` for the full DDL. Summary:

| Table | Purpose |
|---|---|
| `machines` | One row per physical unit: serial number, location, tank capacity, current status |
| `readings` | Raw telemetry, one row per report cycle (append-only, source of truth) |
| `sales` | Derived "a sale happened" records — liters + amount paid, linked back to the reading that produced them |
| `alerts` | Low tank, offline, fault, tamper, low battery |
| `v_machine_today` (view) | Convenience rollup the dashboard queries directly |

Keeping `readings` (raw) separate from `sales` (derived) matters: if you
later change how you price water, or discover a bug in delta
calculation, you can recompute `sales` from `readings` without having
lost any source data.

## 4. Frontend (Vite + React + TypeScript)

```
src/
  lib/supabaseClient.ts   Supabase client, reads VITE_SUPABASE_URL / ANON_KEY
  types.ts                Types mirroring the DB schema
  hooks/
    useMachines.ts         Fleet list + today's totals, realtime-subscribed
    useMachineSales.ts      Sales history for the selected machine
  components/
    Dashboard.tsx           Page layout
    MachineCard.tsx          Fleet list item
    LiquidGauge.tsx           Animated tank/progress gauge
    SalesChart.tsx             Hourly dispensed-liters trend
    StatCard.tsx                 Small KPI tiles
    AlertsPanel.tsx                Live alert feed
```

State management is intentionally just React hooks + Supabase Realtime —
no Redux/Zustand needed at this scale. If the fleet grows into the
hundreds of machines with many simultaneous dashboard users, consider
`@tanstack/react-query` for caching/retry, but it isn't needed yet.

## 5. Why Supabase for this use case

- **Postgres**, so you get real relational integrity (foreign keys
  between machines/readings/sales) instead of hand-rolling it.
- **Realtime** out of the box — the dashboard's "live" feel comes for
  free from Postgres logical replication, no separate MQTT broker or
  WebSocket server to run.
- **Edge Functions** give you a secure place to authenticate devices and
  run business logic (delta calculation, alerting) without standing up
  a separate backend service.
- **Row Level Security** lets you scope what operators/dashboards can
  see (e.g. per-region access) directly in the database.

## 6. Scaling notes

- One `readings` row per machine per report interval is cheap — even at
  a 5-minute interval and 1,000 machines that's ~288k rows/day, which
  Postgres handles easily. Add a retention job or a `readings_archive`
  table if you want to prune raw telemetry after a few months while
  keeping `sales` forever.
- If you outgrow a single Postgres instance's write throughput, batch
  the machine reports into an ingest queue (e.g. Supabase's `pgmq` or an
  external message queue) in front of the Edge Function.
- For sites with many machines close together, consider a LoRa mesh to
  a single gateway with one cellular/ethernet uplink instead of a SIM
  card per machine — see `docs/HARDWARE_INTEGRATION.md`.
