import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDropdown extends Document {
  group: string;
  label: string;
  value: string;
  order: number;
  isSystem: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DropdownSchema = new Schema<IDropdown>(
  {
    group: { type: String, required: true },
    label: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
    order: { type: Number, default: 0 },
    isSystem: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

DropdownSchema.index({ group: 1, value: 1 }, { unique: true });
DropdownSchema.index({ group: 1, order: 1 });

const Dropdown: Model<IDropdown> =
  mongoose.models.Dropdown || mongoose.model<IDropdown>('Dropdown', DropdownSchema);

export default Dropdown;
