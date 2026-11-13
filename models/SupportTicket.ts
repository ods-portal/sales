import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ISupportStatusHistoryEntry {
  status: string;
  previousStatus?: string;
  assignedToName?: string;
  note?: string;
  changedAt: Date;
  changedBy: Types.ObjectId;
  changedByName: string;
  changedByRole: string;
}

export interface ISupportTicket extends Document {
  ticketNo: string;
  doctor: Types.ObjectId;
  patientId: string;
  reason: string;
  concern: string;
  actionTaken?: string;
  images: string[];
  videos: string[];
  assignedTo?: Types.ObjectId;
  assignedToName?: string;
  status: string;
  statusHistory: ISupportStatusHistoryEntry[];
  closedAt?: Date;
  closedBy?: Types.ObjectId;
  closedByName?: string;
  createdBy: Types.ObjectId;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
}

const StatusHistorySchema = new Schema<ISupportStatusHistoryEntry>(
  {
    status: { type: String, required: true },
    previousStatus: String,
    assignedToName: String,
    note: String,
    changedAt: { type: Date, required: true, default: Date.now },
    changedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    changedByName: { type: String, required: true },
    changedByRole: { type: String, required: true },
  },
  { _id: false }
);

const SupportTicketSchema = new Schema<ISupportTicket>(
  {
    ticketNo: { type: String, required: true, unique: true },
    doctor: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
    patientId: { type: String, required: true, trim: true },
    reason: { type: String, required: true, trim: true },
    concern: { type: String, required: true, trim: true },
    actionTaken: { type: String, trim: true },
    images: { type: [String], default: [] },
    videos: { type: [String], default: [] },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedToName: String,
    status: { type: String, required: true },
    statusHistory: { type: [StatusHistorySchema], default: [] },
    closedAt: Date,
    closedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    closedByName: String,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdByName: { type: String, required: true },
  },
  { timestamps: true }
);

SupportTicketSchema.index({ status: 1, createdAt: -1 });
SupportTicketSchema.index({ assignedTo: 1, status: 1 });
SupportTicketSchema.index({ doctor: 1 });
SupportTicketSchema.index({ patientId: 1 });

const SupportTicket: Model<ISupportTicket> =
  mongoose.models.SupportTicket || mongoose.model<ISupportTicket>('SupportTicket', SupportTicketSchema);

export default SupportTicket;
