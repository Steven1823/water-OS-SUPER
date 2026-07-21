import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

interface Machine {
  id: string;
  serial_number: string;
  name: string;
  address: string;
  tank_capacity_liters: number;
  daily_target_liters: number;
  status: "offline" | "connected" | "active" | "under_maintenance";
  last_seen_at: string | null;
  device_provisioned_at: string | null;
  device_provisioned_by: string | null;
}

interface ProvisioningStatus {
  state: "provisioning" | "waiting_for_connection" | "connected";
  machineId: string;
  serialNumber: string;
  connectedAt?: string;
}

export function useProvisionMachine(machineId: string | null) {
  const [status, setStatus] = useState<ProvisioningStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!machineId) {
      setStatus(null);
      return;
    }

    setLoading(true);

    // Subscribe to machines table changes
    const machineSubscription = supabase
      .from("machines")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "machines",
        filter: `id=eq.${machineId}`,
      } as any,
      (payload: any) => {
        const machine: Machine = payload.new;
        if (
          machine.status === "connected" ||
          machine.status === "active"
        ) {
          setStatus({
            state: "connected",
            machineId: machine.id,
            serialNumber: machine.serial_number,
            connectedAt: new Date().toISOString(),
          });
        } else if (machine.status === "offline") {
          setStatus({
            state: "waiting_for_connection",
            machineId: machine.id,
            serialNumber: machine.serial_number,
          });
        }
      }
    )
      .subscribe((status: any) => {
        if (status === "CHANNEL_ERROR") {
          setError("Failed to subscribe to machine updates");
          setLoading(false);
        } else if (status === "SUBSCRIBED") {
          setLoading(false);
        }
      });

    // Subscribe to readings table - when first reading arrives, machine is truly connected
    const readingsSubscription = supabase
      .from("readings")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "readings",
        filter: `machine_id=eq.${machineId}`,
      } as any,
      () => {
        // First reading arrived - machine is connected
        setStatus((prev) =>
          prev
            ? {
                ...prev,
                state: "connected",
                connectedAt: new Date().toISOString(),
              }
            : null
        );
      }
    )
      .subscribe();

    return () => {
      supabase.removeChannel(machineSubscription);
      supabase.removeChannel(readingsSubscription);
    };
  }, [machineId]);

  const refresh = async () => {
    if (!machineId) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("machines")
        .select("*")
        .eq("id", machineId)
        .single();

      if (data) {
        if (data.status === "connected" || data.status === "active") {
          setStatus({
            state: "connected",
            machineId: data.id,
            serialNumber: data.serial_number,
            connectedAt: new Date().toISOString(),
          });
        } else {
          setStatus({
            state: "waiting_for_connection",
            machineId: data.id,
            serialNumber: data.serial_number,
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return { status, loading, error, refresh };
}
