import mongoose, { Schema, Document } from 'mongoose';

export interface IAdminConfig extends Document {
  key: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

const AdminConfigSchema = new Schema<IAdminConfig>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },
    value: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IAdminConfig>('AdminConfig', AdminConfigSchema);
