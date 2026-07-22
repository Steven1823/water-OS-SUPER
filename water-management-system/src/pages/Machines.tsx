import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMachines } from "../hooks/useMachines";
import { supabase } from "../lib/supabaseClient";
import "../styles/list-page.css";

export function MachinesPage() {
  const navigate = useNavigate();
  const { machines, loading, error, refresh } = useMachines();
  const [managingId, setManagingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const statusBadgeClass = (status: string) => {
    switch (status) {
      case "active":
      case "online":
        return "badge-success";
      case "connected":
        return "badge-info";
      case "offline":
        return "badge-warning";
      case "under_maintenance":
      case "maintenance":
      case "fault":
        return "badge-danger";
      default:
        return "badge-secondary";
    }
  };

  const handleManageClick = (machineId: string) => {
    setManagingId(machineId);
    setShowModal(true);
  };

  const handleRegenerateSecret = async () => {
    if (!managingId) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("Not authenticated");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/regenerate-secret`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            machine_id: managingId,
            reason: "regenerate_via_dashboard",
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to regenerate secret");
      }

      const data = await response.json();
      alert(
        `New secret generated. Copy it immediately:\n\n${data.device_secret}\n\nThis will not be shown again.`
      );
      setShowModal(false);
      refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error regenerating secret");
    }
  };

  const handleMarkMaintenance = async () => {
    if (!managingId) return;
    try {
      const { error: updateError } = await supabase
        .from("machines")
        .update({ status: "under_maintenance" })
        .eq("id", managingId);

      if (updateError) throw updateError;
      setShowModal(false);
      refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error updating status");
    }
  };

  const handleActivate = async () => {
    if (!managingId) return;
    try {
      const { error: updateError } = await supabase
        .from("machines")
        .update({ status: "active" })
        .eq("id", managingId);

      if (updateError) throw updateError;
      setShowModal(false);
      refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error updating status");
    }
  };

  return (
    <div className="page-section">
      <div className="page-header">
        <h1>Water Machines</h1>
        <button
          className="btn btn-primary"
          onClick={() => navigate("/connect-machine")}
        >
          + Connect New Machine
        </button>
      </div>

      {loading && <p className="loading">Loading machines...</p>}
      {error && <p className="error-message">Error: {error}</p>}

      {!loading && !error && machines.length === 0 && (
        <p className="empty-state">No machines connected yet.</p>
      )}

      {!loading && !error && machines.length > 0 && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Serial Number</th>
                <th>Name</th>
                <th>Address</th>
                <th>Status</th>
                <th>Tank Capacity</th>
                <th>Last Seen</th>
                <th>Provisioned</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {machines.map((machine) => (
                <tr key={machine.id}>
                  <td className="font-weight-600">{machine.serial_number}</td>
                  <td>{machine.name || "-"}</td>
                  <td>{machine.address || "-"}</td>
                  <td>
                    <span
                      className={`badge ${statusBadgeClass(machine.status)}`}
                    >
                      {machine.status}
                    </span>
                  </td>
                  <td>{machine.tank_capacity_liters}L</td>
                  <td>
                    {machine.last_seen_at
                      ? new Date(machine.last_seen_at).toLocaleString()
                      : "Never"}
                  </td>
                  <td>
                    {machine.device_provisioned_at
                      ? new Date(machine.device_provisioned_at).toLocaleDateString()
                      : "-"}
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleManageClick(machine.id)}
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Management Modal */}
      {showModal && managingId && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Manage Machine</h2>
            <p>
              Select an action for machine{" "}
              {machines.find((m) => m.id === managingId)?.serial_number}
            </p>
            <div className="modal-actions">
              <button
                className="btn btn-primary"
                onClick={handleRegenerateSecret}
              >
                Regenerate Secret
              </button>
              <button className="btn btn-secondary" onClick={handleActivate}>
                Activate
              </button>
              <button
                className="btn btn-warning"
                onClick={handleMarkMaintenance}
              >
                Mark Maintenance
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
