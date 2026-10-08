import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IDoctor extends Document {
  // 1. Doctor Information
  name: string;
  slug: string;
  previousSlugs: string[];
  speciality: string;
  phone: string;
  email: string;
  clinicName?: string;
  clinicAddress: string;
  city?: string;
  area?: string;
  state?: string;
  assignedRep: Types.ObjectId;

  // 2. Practice Profile
  currentAlignerBrands?: string[];
  monthlyAlignerCases?: number;
  lifetimeCasesSubmitted?: number;
  otherOrthoSystems?: string[];
  decisionMaker?: string;

  // 3. Doctor Categorization
  category: string;
  potentialRating?: string;
  status?: string;

  // 4. Opportunity Tracking
  probabilityOfConversion?: number;
  expectedFirstCaseDate?: Date;
  expectedMonthlyCaseVolume?: number;
  estimatedMonthlyRevenuePotential?: number;

  // 5. Competitor Information
  currentBrand?: string;
  currentPricing?: number;
  doctorLikes?: string;
  doctorPainPoints?: string;
  reasonForNotSwitching?: string;
  reasonForNotSwitchingDetails?: string;

  // 6. Attachments
  clinicPhotograph?: string; // URL/Path
  doctorPhotograph?: string; // URL/Path
  doctorPhotoConsent: boolean;
  visitingCard?: string; // URL/Path
  documents?: string[]; // Array of URLs/Paths

  // 7. Additional Info
  doctorBirthday?: Date;
  clinicAnniversary?: Date;
  preferredCommunication?: string;
  bestTimeToVisit?: string;
  decisionStage?: string;

  createdAt: Date;
  updatedAt: Date;
}

const DoctorSchema = new Schema<IDoctor>(
  {
    // 1. Doctor Information
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true },
    previousSlugs: [{ type: String }],
    speciality: { type: String },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    clinicName: { type: String, trim: true },
    clinicAddress: { type: String, required: true },
    city: { type: String },
    area: { type: String },
    state: { type: String },
    assignedRep: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    // 2. Practice Profile
    currentAlignerBrands: [{ type: String }],
    monthlyAlignerCases: { type: Number },
    lifetimeCasesSubmitted: { type: Number, default: 0 },
    otherOrthoSystems: [{ type: String }],
    decisionMaker: { type: String },

    // 3. Doctor Categorization
    category: { type: String, required: true },
    potentialRating: { type: String },
    status: { type: String, default: 'Prospect' },

    // 4. Opportunity Tracking
    probabilityOfConversion: { type: Number, min: 0, max: 100 },
    expectedFirstCaseDate: { type: Date },
    expectedMonthlyCaseVolume: { type: Number },
    estimatedMonthlyRevenuePotential: { type: Number },

    // 5. Competitor Information
    currentBrand: { type: String },
    currentPricing: { type: Number },
    doctorLikes: { type: String },
    doctorPainPoints: { type: String },
    reasonForNotSwitching: { type: String },
    reasonForNotSwitchingDetails: { type: String },

    // 6. Attachments
    clinicPhotograph: { type: String },
    doctorPhotograph: { type: String },
    doctorPhotoConsent: { type: Boolean, default: false },
    visitingCard: { type: String },
    documents: [{ type: String }],

    // 7. Additional Info
    doctorBirthday: { type: Date },
    clinicAnniversary: { type: Date },
    preferredCommunication: { type: String },
    bestTimeToVisit: { type: String },
    decisionStage: { type: String },
  },
  { timestamps: true }
);

DoctorSchema.index({ slug: 1 });
DoctorSchema.index({ previousSlugs: 1 });
DoctorSchema.index({ assignedRep: 1 });
DoctorSchema.index({ status: 1 });
DoctorSchema.index({ category: 1 });
DoctorSchema.index({ city: 1 });
DoctorSchema.index({ area: 1 });
DoctorSchema.index({ name: 'text', city: 'text', speciality: 'text' });

if (mongoose.models.Doctor && !mongoose.models.Doctor.schema.path('area')) {
  mongoose.deleteModel('Doctor');
}

const Doctor: Model<IDoctor> =
  mongoose.models.Doctor || mongoose.model<IDoctor>('Doctor', DoctorSchema);

export default Doctor;
