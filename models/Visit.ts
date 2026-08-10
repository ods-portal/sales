import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IRescheduleHistoryEntry {
  rescheduledAt: Date;
  rescheduledBy: Types.ObjectId;
  rescheduledByName: string;
  rescheduledByRole: string;
  previousVisitDate: Date;
  newVisitDate: Date;
  previousFollowUpDate: Date;
  newFollowUpDate: Date;
  remarks: string;
}

export interface IVisit extends Document {
  slug: string;
  doctor: Types.ObjectId;
  salesPerson: Types.ObjectId;
  
  // Basic Details
  visitDate: Date;
  visitType: string;
  meetingMode?: string;
  
  // Meeting Details
  meetingSummary: string;
  keyDiscussionPoints?: string;
  doctorFeedback?: string;
  objectionsRaised?: string;
  requirementsDiscussed?: string;
  
  // Follow-up & Actions
  followUpDate: Date;
  nextAction?: string;
  pendingTasks?: string;
  supportRequired?: string;
  responsiblePerson?: string;
  targetCompletionDate?: Date;
  
  // Deliverables & Cases
  brochuresGiven?: boolean;
  sampleKitGiven?: boolean;
  priceListShared?: boolean;
  casePortfolioShared?: boolean;
  scannerDemoDone?: boolean;
  otherMaterialShared?: string;
  lastCaseReceivedDate?: Date;
  totalCasesSubmittedThisVisit?: number;
  
  // Attachments & Rating
  prescriptionCasePhotos?: string[];
  remarksBySalesManager?: string;
  doctorSatisfactionRating?: number;

  status: 'Completed' | 'Pending' | 'Overdue' | 'Cancelled';
  statusUpdatedAt?: Date;
  rescheduleHistory: IRescheduleHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const VisitSchema = new Schema<IVisit>(
  {
    slug: { type: String, required: true, unique: true },
    doctor: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
    salesPerson: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    
    // Basic Details
    visitDate: { type: Date, required: true },
    visitType: { type: String, required: true },
    meetingMode: { type: String },
    
    // Meeting Details
    meetingSummary: {
      type: String,
      required: true,
      minlength: [500, 'Meeting summary must be at least 500 characters'],
    },
    keyDiscussionPoints: { type: String },
    doctorFeedback: { type: String },
    objectionsRaised: { type: String },
    requirementsDiscussed: { type: String },
    
    // Follow-up & Actions
    followUpDate: { type: Date, required: true },
    nextAction: { type: String },
    pendingTasks: { type: String },
    supportRequired: { type: String },
    responsiblePerson: { type: String },
    targetCompletionDate: { type: Date },
    
    // Deliverables & Cases
    brochuresGiven: { type: Boolean, default: false },
    sampleKitGiven: { type: Boolean, default: false },
    priceListShared: { type: Boolean, default: false },
    casePortfolioShared: { type: Boolean, default: false },
    scannerDemoDone: { type: Boolean, default: false },
    otherMaterialShared: { type: String },
    lastCaseReceivedDate: { type: Date },
    totalCasesSubmittedThisVisit: { type: Number },
    
    // Attachments & Rating
    prescriptionCasePhotos: [{ type: String }],
    remarksBySalesManager: { type: String },
    doctorSatisfactionRating: { type: Number, min: 1, max: 5 },

    status: {
      type: String,
      enum: ['Completed', 'Pending', 'Overdue', 'Cancelled'],
      default: 'Pending',
    },
    statusUpdatedAt: { type: Date },
    rescheduleHistory: {
      type: [
        {
          rescheduledAt: { type: Date, required: true },
          rescheduledBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
          rescheduledByName: { type: String, required: true },
          rescheduledByRole: { type: String, required: true },
          previousVisitDate: { type: Date, required: true },
          newVisitDate: { type: Date, required: true },
          previousFollowUpDate: { type: Date, required: true },
          newFollowUpDate: { type: Date, required: true },
          remarks: { type: String, required: true, trim: true },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

VisitSchema.index({ slug: 1 });
VisitSchema.index({ doctor: 1 });
VisitSchema.index({ salesPerson: 1 });
VisitSchema.index({ visitDate: -1 });
VisitSchema.index({ status: 1 });
VisitSchema.index({ followUpDate: 1 });

const Visit: Model<IVisit> =
  mongoose.models.Visit || mongoose.model<IVisit>('Visit', VisitSchema);

export default Visit;
