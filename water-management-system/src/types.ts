export type MachineStatus = "online" | "offline" | "maintenance" | "fault";

export interface Machine {
  id: string;
  serial_number: string;
  name: string;
  location_lat: number | null;
  location_lng: number | null;
  address: string | null;
  tank_capacity_liters: number;
  status: MachineStatus;
  last_seen_at: string | null;
  daily_target_liters: number | null;
}

export interface Reading {
  id: number;
  machine_id: string;
  liters_dispensed_total: number;
  liters_since_last_report: number;
  tank_level_percent: number | null;
  flow_rate_lpm: number | null;
  battery_voltage: number | null;
  signal_rssi: number | null;
  reported_at: string;
}

export interface Sale {
  id: number;
  machine_id: string;
  liters: number;
  amount_paid: number | null;
  payment_method: string | null;
  sold_at: string;
}

export interface Alert {
  id: number;
  machine_id: string;
  type: "offline" | "low_tank" | "fault" | "tamper" | "low_battery";
  message: string | null;
  resolved: boolean;
  created_at: string;
}

export interface MachineToday {
  machine_id: string;
  name: string;
  status: MachineStatus;
  last_seen_at: string | null;
  liters_today: number;
  revenue_today: number;
}
