import mongoose, { Schema, Document } from 'mongoose';

export interface IBankRate extends Document {
  bankName: string;
  accountType: 'checking' | 'savings' | 'cd' | 'money-market';
  rate: number;
  apy?: number;
  minDeposit?: number;
  term?: number;
  features?: string[];
  submittedBy?: string;
  verifications: number;
  reports: number;
  lastVerified: Date;
  source?: string;
  notes?: string;
  location?: {
    city?: string;
    state?: string;
    zipCode?: string;
    region?: string;
  };
  availability: 'national' | 'regional' | 'local';
  dataSource: 'community' | 'scraped' | 'api';
  lastScraped?: Date;
  scrapedUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BankRateSchema = new Schema<IBankRate>(
  {
    bankName: {
      type: String,
      required: true,
      trim: true,
    },
    accountType: {
      type: String,
      required: true,
      enum: ['checking', 'savings', 'cd', 'money-market'],
    },
    rate: {
      type: Number,
      required: true,
      min: 0,
    },
    apy: {
      type: Number,
      min: 0,
    },
    minDeposit: {
      type: Number,
      min: 0,
    },
    term: {
      type: Number,
      min: 1,
    },
    features: [{
      type: String,
    }],
    submittedBy: {
      type: String,
    },
    verifications: {
      type: Number,
      default: 0,
    },
    reports: {
      type: Number,
      default: 0,
    },
    lastVerified: {
      type: Date,
      default: Date.now,
    },
    source: {
      type: String,
    },
    notes: {
      type: String,
    },
    location: {
      city: String,
      state: String,
      zipCode: String,
      region: String,
    },
    availability: {
      type: String,
      enum: ['national', 'regional', 'local'],
      default: 'national',
    },
    dataSource: {
      type: String,
      enum: ['community', 'scraped', 'api'],
      default: 'community',
    },
    lastScraped: {
      type: Date,
    },
    scrapedUrl: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
BankRateSchema.index({ accountType: 1, rate: -1 });
BankRateSchema.index({ bankName: 1 });
BankRateSchema.index({ verifications: -1 });

export default mongoose.model<IBankRate>('BankRate', BankRateSchema);
