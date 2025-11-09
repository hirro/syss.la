export interface Customer {
  id: string;
  name: string;
  archived?: boolean;
  invoiceRef?: string;
  notes?: string;
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
  projectId: string;
  start: string;
  end?: string;
  durationMinutes?: number;
  note?: string;
}
