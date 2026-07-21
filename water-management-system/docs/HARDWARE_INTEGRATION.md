# Hardware Integration — Tracking Liters Sold by a Machine

This covers how a physical water machine measures and reports how much
water it has dispensed, for sites without WiFi.

## 1. Measuring liters: the flow sensor

The core sensor is a **water flow meter** sitting in the pipe between
the tank/source and the dispensing nozzle. Two common options:

| Sensor | Flow range | Notes |
|---|---|---|
| Hall-effect (e.g. YF-S201, YF-B1) | up to ~30 L/min | Cheap, easy to wire, fine for household-scale taps |
| Larger hall-effect (e.g. YF-DN50) | up to ~200+ L/min | For higher-throughput ATM-style dispensers |
| Positive displacement / turbine meter | Wide range | More accurate, used in commercial metering, higher cost |

All of these output a **pulse train**: a spinning wheel with a magnet
passes a hall-effect sensor, producing one electrical pulse per
rotation. Liters are computed as:

```
liters = pulse_count / calibration_factor
```

The `calibration_factor` (pulses per liter) is sensor-specific and
should be verified by running a known volume (e.g. 5 L) through the
meter and counting pulses — don't trust the datasheet number blindly,
since it drifts with flow rate and installation.

### Wiring
- Signal wire → a GPIO on the microcontroller that supports **interrupts**
  (needed because pulses can arrive faster than a polling loop would
  catch them)
- The firmware increments a counter on each falling/rising edge
  (see `firmware/water_machine_cellular/water_machine_cellular.ino`)

## 2. Getting data off-site: cellular vs LoRa

You said the machines are at **remote sites without WiFi** — here's how
to choose between the two realistic options:

### Option A — Cellular module per machine (recommended default)
Each machine gets its own SIM card and a cellular module (SIM7000 for
NB-IoT/LTE-M, which is cheaper per byte and lower power than regular
4G; SIM800L as a 2G fallback where NB-IoT coverage doesn't reach).//
The machine posts directly to your Supabase Edge Function over HTTPS.

**Pros:** Simple — one machine, one internet connection, no extra
infrastructure. Works for machines scattered across a wide area.
**Cons:** Recurring SIM/data cost per machine; needs decent cellular
coverage at each site.

This is what the included firmware (`firmware/water_machine_cellular/`)
implements.

### Option B — LoRa + a single gateway
Machines carry a LoRa radio instead of a cellular modem and transmit
short packets (a few bytes: machine ID + total liters + battery) to a
**LoRaWAN gateway** placed centrally, which has one internet connection
(cellular, ethernet, or satellite) for the whole cluster.

**Pros:** Very low power (good for battery/solar sites), no per-machine
SIM cost, works over several km line-of-sight.
**Cons:** Needs a gateway with its own uplink and needs machines within
LoRa range of that gateway — good for a cluster of machines in one
area, not for machines scattered across a country.

**Recommendation:** if your machines are spread across many separate
remote locations, use cellular per machine (Option A). If you have
several machines clustered around one site (e.g. one estate/refugee
camp/campus) with a single site office that has connectivity, put a
LoRa gateway there and use Option B to cut data costs. You can mix
both — some machines cellular, some LoRa-to-gateway — since they both
ultimately call the same `ingest-reading` endpoint.

## 3. Report payload & endpoint

Every device, regardless of radio, sends the same JSON to the same
endpoint (`supabase/functions/ingest-reading/index.ts`):

```json
{
  "serial_number": "WM-0001",
  "liters_dispensed_total": 18452.3,
  "tank_level_percent": 62,
  "battery_voltage": 12.8,
  "signal_rssi": -87
}
```

Key design point: the device reports its **lifetime total**, not "how
much since last time." The server computes the delta. This means:
- A missed report doesn't lose data — the next report's delta just
  covers a longer period.
- A device can't be tricked into under- or over-reporting a single
  delta; the server always recomputes it from two lifetime totals.

Authentication is a shared secret sent in the `x-device-key` header
(`serial_number:secret`). For a production fleet, upgrade this to a
per-device secret (stored in the `machines` table) or HMAC-signed
payloads so that a compromised device doesn't expose the credential for
the whole fleet.

## 4. Report frequency & power budget

- **Every 15 minutes** is a reasonable default for a dispenser: frequent
  enough that "how much has this machine sold today" stays close to
  real-time, infrequent enough to keep cellular data and power use low.
- Cellular radio is the dominant power draw. If the site is
  solar/battery powered, keep the modem powered off between reports
  (see `MODEM_PWRKEY_PIN` handling in the firmware) and use the ESP32's
  deep sleep between cycles.
- For higher-value monitoring (e.g. leak/tamper detection) you can
  report more frequently, or have the firmware send an out-of-cycle
  report immediately when it detects an anomaly (e.g. continuous flow
  for longer than any single transaction should take — a leak or
  bypass).

## 5. Payments (optional)

If the machine accepts payment (coin acceptor, M-Pesa/mobile money
trigger, or a prepaid card/RFID reader), wire that device's "payment
accepted" signal to the same microcontroller so it can include
`amount_paid` and `payment_method` in the report — that's what lets the
dashboard show revenue, not just liters.

## 6. Calibration checklist (do this per machine model, not per unit)

1. Run exactly 5 L through the meter into a measuring container.
2. Record `totalPulses` from the firmware's debug output.
3. `calibration_factor = totalPulses / 5`.
4. Update `PULSES_PER_LITER` in the firmware.
5. Repeat at a low and a high flow rate — hall-effect sensors are
   often less linear at very low flow, which matters if your
   dispenser allows short "top-up" pours.

## 7. Provisioning a new machine via the dashboard

When you want to connect a new physical water machine:

### Step 1: Register the machine in the dashboard
1. Open the water utility dashboard (`http://localhost:5173`)
2. Navigate to **Operations** → **➕ Connect Machine**
3. Fill in the form:
   - **Machine Name**: e.g. "Downtown Market - Pump A"
   - **Serial Number**: e.g. "WM-2024-001" (must match the serial_number in the firmware)
   - **Installation Address**: e.g. "123 Main St, Downtown"
   - **Tank Capacity (L)**: e.g. 1000
   - **Daily Target (L)**: e.g. 500
4. Click "Next: Generate Credentials"

### Step 2: Copy credentials to the machine
The dashboard will display:
- **Serial Number**: For the `SERIAL_NUMBER` constant in firmware
- **Device Secret**: Unique per-machine (shown only once — copy immediately!)
- **Ingest Host**: The Supabase function endpoint
- **cURL Bench Test**: A ready-to-run command for testing

**Important:** The device secret is generated and hashed using bcrypt. This plaintext version is **never stored** — if you lose it, you must regenerate (see Step 4 below).

### Step 3a: Bench test (optional, recommended)
Before deploying to the field:

1. Copy the cURL command from the dashboard
2. Run it from your development machine to verify the endpoint is reachable:
   ```bash
   curl -X POST "https://your-project.supabase.co/functions/v1/ingest-reading" \
     -H "Content-Type: application/json" \
     -H "x-device-key: WM-2024-001:<device_secret>" \
     -d '{
       "serial_number": "WM-2024-001",
       "liters_dispensed_total": 100,
       "tank_level_percent": 85,
       "flow_rate_lpm": 2.5,
       "battery_voltage": 4.2,
       "signal_rssi": -75
     }'
   ```
3. If successful, you'll get back `{"ok":true,"liters_recorded":100}`

### Step 3b: Flash the firmware
1. Open `firmware/water_machine_cellular/water_machine_cellular.ino` in Arduino IDE
2. Update the constants at the top of the file:
   ```cpp
   #define SERIAL_NUMBER "WM-2024-001"
   #define DEVICE_SECRET "your-32-byte-hex-secret-from-dashboard"
   #define INGEST_HOST "https://your-project.supabase.co"
   #define INGEST_ENDPOINT "/functions/v1/ingest-reading"
   ```
3. Compile and flash to the ESP32 microcontroller on your water machine
4. Power on the machine and verify serial monitor shows:
   - Flow meter initialization
   - Cellular modem connection (taking ~30 sec on first boot)
   - First POST attempt to ingest-reading

### Step 4: Wait for connection confirmation
After you power on the machine:
1. The dashboard will show **Step 3: Waiting for Connection**
2. The machine will attempt to connect and send its first reading within
   the first report cycle (default 15 minutes, or immediately if you
   triggered a manual test)
3. Once the first reading arrives, the status will flip to **✓ Connected**
   (green), and the machine appears in the **🤖 Machines** list with
   status "connected" or "active"

### Step 5: Manage the machine (ongoing)
Navigate to **Operations** → **🤖 Machines** to:
- View all connected machines and their last-seen timestamps
- **Regenerate Secret** if the device is reflashed or the secret is
  compromised (generates a new secret, immediately invalidates the old one)
- **Activate** a machine that was in offline/waiting state
- **Mark Maintenance** to pause data collection (machine status → "under_maintenance")

### Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Dashboard step 2: "Serial already exists" | Serial number already registered | Use a unique serial number or delete/regenerate the old machine |
| Bench test cURL fails (401 Unauthorized) | Device secret doesn't match machine hash | Verify you copied the exact secret from the dashboard |
| Bench test cURL fails (403 Forbidden) | Machine status is not "active" or "connected" | Mark it "Activate" in the Machines list first |
| Step 3 never shows "Connected" | Machine not sending first reading | Check cellular coverage, modem logs, and firewall rules allowing outbound HTTPS |
| Machine sends readings but Dashboard doesn't update | Secret verification failing | Regenerate the secret and re-flash the firmware with the new value |

### Security notes

- Each device has a unique, per-machine `device_secret` that is bcrypt-hashed
  and stored in the `machines` table. The plaintext is **never stored or retrievable**.
- The `x-device-key` header format is `serial_number:device_secret` (colon-separated).
- The ingest-reading function verifies the secret using bcrypt.compare() before
  accepting any reading.
- If a device is suspected compromised, regenerate its secret immediately via
  the dashboard; the old secret is discarded.

