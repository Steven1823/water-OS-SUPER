import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useProvisionMachine } from "../hooks/useProvisionMachine";
import "../styles/connect-machine.css";

type Step = "form" | "credentials" | "waiting";

interface CredentialsResponse {
  success: boolean;
  machine_id: string;
  serial_number: string;
  device_secret: string;
  ingest_host: string;
}

export default function ConnectMachine() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    serial_number: "",
    address: "",
    tank_capacity_liters: 1000,
    daily_target_liters: 500,
  });

  // Credentials state
  const [credentials, setCredentials] = useState<CredentialsResponse | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Provisioning state
  const { status: provisioningStatus, loading: waitingForConnection } =
    useProvisionMachine(credentials?.machine_id || null);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  };

  const handleProvisionMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Get current user's session token
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/provision-machine`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to provision machine");
      }

      const data: CredentialsResponse = await response.json();
      setCredentials(data);
      setStep("credentials");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleNext = () => {
    if (credentials) {
      setStep("waiting");
    }
  };

  const handleBack = () => {
    if (step === "credentials") {
      setStep("form");
    } else if (step === "waiting") {
      setStep("credentials");
    }
  };

  const handleComplete = () => {
    navigate("/machines");
  };

  const curlCommand =
    credentials &&
    `curl -X POST "${credentials.ingest_host}/functions/v1/ingest-reading" \\
  -H "Content-Type: application/json" \\
  -H "x-device-key: ${credentials.serial_number}:${credentials.device_secret}" \\
  -d '{
    "serial_number": "${credentials.serial_number}",
    "liters_dispensed_total": 100,
    "tank_level_percent": 85,
    "flow_rate_lpm": 2.5,
    "battery_voltage": 4.2,
    "signal_rssi": -75
  }'`;

  return (
    <div className="connect-machine-container">
      <div className="connect-machine-card">
        {/* Progress indicator */}
        <div className="progress-steps">
          <div className={`step ${step === "form" || step === "credentials" || step === "waiting" ? "active" : ""}`}>
            <div className="step-number">1</div>
            <div className="step-label">Machine Details</div>
          </div>
          <div className="progress-line" />
          <div className={`step ${step === "credentials" || step === "waiting" ? "active" : ""}`}>
            <div className="step-number">2</div>
            <div className="step-label">Credentials</div>
          </div>
          <div className="progress-line" />
          <div className={`step ${step === "waiting" ? "active" : ""}`}>
            <div className="step-number">3</div>
            <div className="step-label">Waiting</div>
          </div>
        </div>

        {/* Error display */}
        {error && <div className="error-banner">{error}</div>}

        {/* Step 1: Form */}
        {step === "form" && (
          <form onSubmit={handleProvisionMachine} className="provision-form">
            <h2>Register New Water Machine</h2>
            <p className="form-subtitle">
              Enter the details of the water dispensing machine you want to connect.
            </p>

            <div className="form-group">
              <label htmlFor="name">Machine Name *</label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="e.g., Downtown Market - Pump A"
                value={formData.name}
                onChange={handleFormChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="serial_number">Serial Number *</label>
              <input
                id="serial_number"
                name="serial_number"
                type="text"
                placeholder="e.g., WM-2024-001"
                value={formData.serial_number}
                onChange={handleFormChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="address">Installation Address *</label>
              <input
                id="address"
                name="address"
                type="text"
                placeholder="e.g., 123 Main St, Downtown"
                value={formData.address}
                onChange={handleFormChange}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="tank_capacity_liters">Tank Capacity (L) *</label>
                <input
                  id="tank_capacity_liters"
                  name="tank_capacity_liters"
                  type="number"
                  min="100"
                  max="10000"
                  value={formData.tank_capacity_liters}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="daily_target_liters">Daily Target (L) *</label>
                <input
                  id="daily_target_liters"
                  name="daily_target_liters"
                  type="number"
                  min="100"
                  max="5000"
                  value={formData.daily_target_liters}
                  onChange={handleFormChange}
                  required
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate("/machines")}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? "Provisioning..." : "Next: Generate Credentials"}
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Credentials */}
        {step === "credentials" && credentials && (
          <div className="credentials-display">
            <h2>Machine Credentials</h2>
            <p className="credentials-subtitle">
              Save these credentials to your machine. The device secret will <strong>not</strong> be shown again.
            </p>

            <div className="credential-box">
              <div className="credential-field">
                <label>Serial Number</label>
                <div className="credential-value-wrapper">
                  <input
                    type="text"
                    value={credentials.serial_number}
                    readOnly
                    className="credential-value"
                  />
                  <button
                    className={`copy-btn ${copied === "serial" ? "copied" : ""}`}
                    onClick={() =>
                      handleCopy(credentials.serial_number, "serial")
                    }
                  >
                    {copied === "serial" ? "✓ Copied" : "Copy"}
                  </button>
                </div>
              </div>

              <div className="credential-field">
                <label>Device Secret (⚠️ Never stored, shown once)</label>
                <div className="credential-value-wrapper">
                  <input
                    type="text"
                    value={credentials.device_secret}
                    readOnly
                    className="credential-value secret"
                  />
                  <button
                    className={`copy-btn ${copied === "secret" ? "copied" : ""}`}
                    onClick={() =>
                      handleCopy(credentials.device_secret, "secret")
                    }
                  >
                    {copied === "secret" ? "✓ Copied" : "Copy"}
                  </button>
                </div>
              </div>

              <div className="credential-field">
                <label>Ingest Host</label>
                <div className="credential-value-wrapper">
                  <input
                    type="text"
                    value={credentials.ingest_host}
                    readOnly
                    className="credential-value"
                  />
                  <button
                    className={`copy-btn ${copied === "host" ? "copied" : ""}`}
                    onClick={() =>
                      handleCopy(credentials.ingest_host, "host")
                    }
                  >
                    {copied === "host" ? "✓ Copied" : "Copy"}
                  </button>
                </div>
              </div>
            </div>

            <div className="curl-command-section">
              <h3>Bench Test (cURL)</h3>
              <p>Run this command to test the device endpoint:</p>
              <div className="curl-command-wrapper">
                <pre className="curl-command">{curlCommand}</pre>
                <button
                  className={`copy-btn ${copied === "curl" ? "copied" : ""}`}
                  onClick={() => handleCopy(curlCommand || "", "curl")}
                >
                  {copied === "curl" ? "✓ Copied" : "Copy Command"}
                </button>
              </div>
            </div>

            <div className="warning-box">
              <div className="warning-icon">⚠️</div>
              <div className="warning-text">
                <strong>Important:</strong> This is the only time the device secret will be
                displayed. Store it securely on your machine immediately. If lost, you'll
                need to regenerate a new secret.
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleBack}
              >
                Back
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleNext}
              >
                Next: Wait for Connection
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Waiting */}
        {step === "waiting" && credentials && (
          <div className="waiting-display">
            <h2>Waiting for Connection</h2>
            <p className="waiting-subtitle">
              Configure the machine with the credentials above and power it on.
              It will appear here when it sends its first reading.
            </p>

            <div className="connection-status">
              {provisioningStatus?.state === "connected" ? (
                <div className="status-success">
                  <div className="status-icon">✓</div>
                  <div className="status-message">
                    <h3>Machine Connected!</h3>
                    <p>
                      {credentials.serial_number} is reporting data successfully.
                    </p>
                    <p className="connected-time">
                      Connected at{" "}
                      {provisioningStatus.connectedAt &&
                        new Date(provisioningStatus.connectedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="status-waiting">
                  <div className="spinner"></div>
                  <div className="status-message">
                    <h3>Listening for {credentials.serial_number}...</h3>
                    <p>
                      The machine will send its first reading shortly after power-on.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="waiting-tips">
              <h3>Troubleshooting</h3>
              <ul>
                <li>Ensure the machine has power and cellular connectivity</li>
                <li>Verify credentials are correctly flashed to the device</li>
                <li>Check the machine's network logs for connectivity errors</li>
                <li>Test the curl command from your development environment</li>
              </ul>
            </div>

            <div className="form-actions">
              {provisioningStatus?.state === "connected" ? (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleBack}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleComplete}
                  >
                    View Machine in Dashboard
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleBack}
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled
                  >
                    {waitingForConnection ? "Waiting..." : "Waiting for connection..."}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
