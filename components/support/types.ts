export interface TicketDoctor {
  _id: string;
  name: string;
  slug: string;
  city?: string;
  area?: string;
  speciality?: string;
  phone?: string;
  clinicName?: string;
}

export interface TicketHistoryEntry {
  status: string;
  previousStatus?: string;
  assignedToName?: string;
  note?: string;
  changedAt: string;
  changedByName: string;
  changedByRole: string;
}

export interface SupportTicket {
  _id: string;
  ticketNo: string;
  doctor: TicketDoctor | null;
  patientId: string;
  reason: string;
  concern: string;
  actionTaken?: string;
  images: string[];
  videos: string[];
  assignedTo?: string;
  assignedToName?: string;
  status: string;
  statusHistory?: TicketHistoryEntry[];
  closedAt?: string;
  closedByName?: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupportEmployee {
  _id: string;
  name: string;
  email: string;
}
