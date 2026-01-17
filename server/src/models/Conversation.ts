import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface IConversation extends Document {
  sessionId: string;
  userPreferences?: {
    accountType?: string;
    budget?: number;
    goals?: string[];
    riskTolerance?: string;
  };
  messages: IMessage[];
  summary?: string;
  createdAt: Date;
  updatedAt: Date;
  lastActivity: Date;
}

const MessageSchema = new Schema<IMessage>({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const ConversationSchema = new Schema<IConversation>({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userPreferences: {
    accountType: String,
    budget: Number,
    goals: [String],
    riskTolerance: String
  },
  messages: [MessageSchema],
  summary: String,
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update lastActivity on save
ConversationSchema.pre('save', function(next) {
  this.lastActivity = new Date();
  next();
});

const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);

export default Conversation;
