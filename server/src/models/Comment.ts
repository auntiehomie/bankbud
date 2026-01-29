import mongoose from 'mongoose';

export interface IComment {
  bankName: string;
  accountType: string;
  userName: string;
  userEmail: string;
  comment: string;
  rating: number; // 1-5 stars
  helpful: number;
  createdAt: Date;
}

const commentSchema = new mongoose.Schema<IComment>({
  bankName: {
    type: String,
    required: true,
    index: true
  },
  accountType: {
    type: String,
    required: true,
    enum: ['savings', 'high-yield-savings', 'cd', 'checking', 'money-market']
  },
  userName: {
    type: String,
    required: true,
    trim: true
  },
  userEmail: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  comment: {
    type: String,
    required: true,
    maxlength: 1000
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  helpful: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Compound index for efficient queries
commentSchema.index({ bankName: 1, accountType: 1, createdAt: -1 });
commentSchema.index({ helpful: -1 });

export const Comment = mongoose.model<IComment>('Comment', commentSchema);
