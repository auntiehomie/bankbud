import mongoose from 'mongoose';

export interface IRateAlert {
  email: string;
  accountType: string;
  targetRate: number;
  frequency: 'daily' | 'weekly' | 'instant';
  active: boolean;
  lastNotified?: Date;
  createdAt: Date;
}

const rateAlertSchema = new mongoose.Schema<IRateAlert>({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  accountType: {
    type: String,
    required: true,
    enum: ['savings', 'high-yield-savings', 'cd', 'checking', 'money-market']
  },
  targetRate: {
    type: Number,
    required: true,
    min: 0,
    max: 20
  },
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'instant'],
    default: 'daily'
  },
  active: {
    type: Boolean,
    default: true
  },
  lastNotified: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for quick lookups
rateAlertSchema.index({ email: 1, active: 1 });
rateAlertSchema.index({ accountType: 1, active: 1 });

export const RateAlert = mongoose.model<IRateAlert>('RateAlert', rateAlertSchema);
