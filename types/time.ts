export interface Customer {
  id: string;
  name: string;
  archived?: boolean;
  invoiceRef?: string;
  notes?: string;
  rate?: number;
  currency?: string;
  vat?: number;
  billingAddress?: string;
  costPlace?: string;
}

export interface Project {
  id: string;
  customerId: string;
  name: string;
  code?: string;
  notes?: string;
}

export interface TimeEntry {
  id: string;
  customerId: string;
  projectId?: string; // Optional project reference
  start: string;
  end?: string;
  durationMinutes?: number;
  note?: string;
}

export interface ActiveTimer {
  customerId: string;
  projectId?: string;
  note?: string;
  startTime: string;
  pausedAt?: string;
  pausedDuration: number; // Total paused time in milliseconds
}
