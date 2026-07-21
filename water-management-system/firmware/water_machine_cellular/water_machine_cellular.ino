/*
  Water Machine Telemetry Firmware
  ---------------------------------
  Board:      ESP32 (any dev board with a spare UART for the modem)
  Modem:      SIM7000 series (NB-IoT/LTE-M/2G fallback) via TinyGSM
              — swap in SIM800L (2G-only) if that's what you have; the
                TinyGSM abstraction keeps the rest of this file identical.
  Sensor:     Hall-effect water flow sensor (e.g. YF-S201 / YF-DN50 for
              higher flow rates) wired to an interrupt-capable GPIO.
  Power:      Designed to run from a 12V solar + battery supply with the
              ESP32 in deep sleep between report cycles to save power —
              cellular is the power-hungry part, so we batch reports.

  Libraries (Arduino Library Manager):
    - TinyGSM        (vshymanskyy/TinyGSM)
    - ArduinoHttpClient   OR use TinyGsmClientSecure directly for HTTPS
    - ArduinoJson

  Wiring (typical):
    Flow sensor signal -> GPIO 27 (interrupt, pulled up)
    Flow sensor VCC    -> 5V, GND -> GND
    SIM7000 TX  -> ESP32 RX2 (GPIO16)
    SIM7000 RX  -> ESP32 TX2 (GPIO17)
    SIM7000 PWRKEY -> GPIO4
    Optional ultrasonic/pressure tank-level sensor -> ADC pin (GPIO34)
*/

#define TINY_GSM_MODEM_SIM7000
#include <TinyGsmClient.h>
#include <ArduinoJson.h>
#include <esp_sleep.h>

// ---------------- CONFIG ----------------------------------------------
// NOTE: SERIAL_NUMBER and DEVICE_SECRET are generated via the
// "Connect Machine" flow in the dashboard (http://localhost:5173).
// Do NOT manually set these — use the dashboard to provision the machine
// and copy the generated values here.
//
// To provision:
// 1. Dashboard → Operations → Connect Machine
// 2. Fill in machine details and click "Generate Credentials"
// 3. Copy SERIAL_NUMBER, DEVICE_SECRET, and INGEST_HOST from the credentials display
// 4. Paste them below
// 5. Compile and flash to the ESP32
//
const char* APN            = "your-apn-here";           // from your SIM/telco
const char* SERIAL_NUMBER  = "WM-0001";                  // from dashboard Connect Machine flow
const char* DEVICE_SECRET  = "your-long-random-string";  // from dashboard (32-byte hex, shown once)
const char* INGEST_HOST    = "your-project-ref.functions.supabase.co";  // from dashboard
const char* INGEST_PATH    = "/ingest-reading";

const int   FLOW_SENSOR_PIN   = 27;
const int   MODEM_PWRKEY_PIN  = 4;
const float PULSES_PER_LITER  = 450.0;   // calibrate for your specific sensor
const uint64_t REPORT_INTERVAL_SEC = 15 * 60; // report every 15 minutes

// ---------------- STATE (persisted across deep sleep) -----------------
RTC_DATA_ATTR unsigned long totalPulses = 0;       // survives deep sleep
RTC_DATA_ATTR double litersDispensedTotal = 0.0;   // lifetime counter

volatile unsigned long pulseCountThisWake = 0;

HardwareSerial SerialAT(2);
TinyGsm modem(SerialAT);
TinyGsmClientSecure gsmClient(modem);

void IRAM_ATTR onFlowPulse() {
  pulseCountThisWake++;
}

void setup() {
  Serial.begin(115200);
  pinMode(FLOW_SENSOR_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_PIN), onFlowPulse, FALLING);

  // While awake between deep-sleep cycles, just count pulses for a
  // fixed window, then send. In production you'd size this window to
  // your report interval; for clarity this example wakes, counts for
  // the full interval with the radio off, then transmits.
  delay(REPORT_INTERVAL_SEC * 1000UL);

  noInterrupts();
  unsigned long pulses = pulseCountThisWake;
  pulseCountThisWake = 0;
  interrupts();

  totalPulses += pulses;
  double litersSinceLast = pulses / PULSES_PER_LITER;
  litersDispensedTotal += litersSinceLast;

  float tankLevelPercent = readTankLevelPercent(); // implement per your sensor
  float batteryVoltage   = readBatteryVoltage();

  bool sent = sendReading(litersDispensedTotal, tankLevelPercent, batteryVoltage);
  Serial.printf("Report sent: %s | total=%.2f L | delta=%.2f L\n",
                sent ? "OK" : "FAILED", litersDispensedTotal, litersSinceLast);

  // Deep sleep is skipped in this simplified loop; add
  // esp_sleep_enable_timer_wakeup(...) + esp_deep_sleep_start() here
  // for a real low-power deployment.
}

void loop() {
  // Intentionally empty — setup() runs the full sense/report cycle.
  // For a deep-sleep design, setup() would end with esp_deep_sleep_start().
}

// ---------------- Cellular + HTTPS POST --------------------------------
bool sendReading(double litersTotal, float tankLevelPercent, float batteryVoltage) {
  SerialAT.begin(9600, SERIAL_8N1, 26, 27); // adjust pins to your wiring
  pinMode(MODEM_PWRKEY_PIN, OUTPUT);
  digitalWrite(MODEM_PWRKEY_PIN, LOW);
  delay(1000);
  digitalWrite(MODEM_PWRKEY_PIN, HIGH);
  delay(3000);

  if (!modem.restart()) {
    Serial.println("Modem restart failed");
    return false;
  }
  if (!modem.waitForNetwork(60000)) {
    Serial.println("No cellular network");
    return false;
  }
  if (!modem.gprsConnect(APN)) {
    Serial.println("APN connect failed");
    return false;
  }

  StaticJsonDocument<256> doc;
  doc["serial_number"] = SERIAL_NUMBER;
  doc["liters_dispensed_total"] = litersTotal;
  doc["tank_level_percent"] = tankLevelPercent;
  doc["battery_voltage"] = batteryVoltage;
  doc["signal_rssi"] = modem.getSignalQuality();

  String body;
  serializeJson(doc, body);

  if (!gsmClient.connect(INGEST_HOST, 443)) {
    Serial.println("TLS connect failed");
    return false;
  }

  String authHeader = String(SERIAL_NUMBER) + ":" + String(DEVICE_SECRET);

  gsmClient.print(String("POST ") + INGEST_PATH + " HTTP/1.1\r\n");
  gsmClient.print(String("Host: ") + INGEST_HOST + "\r\n");
  gsmClient.print("Content-Type: application/json\r\n");
  gsmClient.print("x-device-key: " + authHeader + "\r\n");
  gsmClient.print("Content-Length: " + String(body.length()) + "\r\n");
  gsmClient.print("Connection: close\r\n\r\n");
  gsmClient.print(body);

  unsigned long start = millis();
  while (gsmClient.connected() && millis() - start < 15000) {
    if (gsmClient.available()) {
      String line = gsmClient.readStringUntil('\n');
      if (line.startsWith("HTTP/1.1 200")) {
        gsmClient.stop();
        modem.gprsDisconnect();
        return true;
      }
    }
  }

  gsmClient.stop();
  modem.gprsDisconnect();
  return false;
}

// ---------------- Sensor helpers ---------------------------------------
float readTankLevelPercent() {
  // Example: ultrasonic distance sensor on ADC/trigger pins, or a
  // 4-20mA pressure transducer through a current-sense resistor.
  // Replace with your actual sensor read + calibration curve.
  return -1; // -1 = "not fitted"
}

float readBatteryVoltage() {
  int raw = analogRead(35); // through a voltage divider sized to your battery
  return (raw / 4095.0) * 3.3 * 2.0; // adjust divider ratio
}
