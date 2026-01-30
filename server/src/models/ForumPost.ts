import mongoose from 'mongoose';

export interface IForumReply {
  userName: string;
  userEmail: string;
  content: string;
  helpful: number;
  createdAt: Date;
}

export interface IForumPost {
  title: string;
  content: string;
  userName: string;
  userEmail: string;
  category: string;
  views: number;
  replies: IForumReply[];
  helpful: number;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const replySchema = new mongoose.Schema<IForumReply>({
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
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },
  helpful: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const forumPostSchema = new mongoose.Schema<IForumPost>({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    maxlength: 5000
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
  category: {
    type: String,
    required: true,
    enum: ['savings', 'checking', 'cd', 'money-market', 'credit-union', 'online-banking', 'general', 'tips', 'questions']
  },
  views: {
    type: Number,
    default: 0
  },
  replies: [replySchema],
  helpful: {
    type: Number,
    default: 0
  },
  isPinned: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
forumPostSchema.index({ category: 1, createdAt: -1 });
forumPostSchema.index({ isPinned: -1, createdAt: -1 });
forumPostSchema.index({ views: -1 });
forumPostSchema.index({ helpful: -1 });

export const ForumPost = mongoose.model<IForumPost>('ForumPost', forumPostSchema);
