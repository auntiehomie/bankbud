export interface BankRate {
  _id: string;
  bankName: string;
  accountType: 'checking' | 'savings' | 'cd' | 'money-market';
  rate: number;
  apy?: number;
  minDeposit?: number;
  term?: number; // for CDs, in months
  features?: string[];
  submittedBy?: string;
  verifications: number;
  reports: number;
  lastVerified: string;
  location?: {
    city?: string;
    state?: string;
    zipCode?: string;
    region?: string;
  };
  availability: 'national' | 'regional' | 'local';
  dataSource: 'community' | 'scraped' | 'api';
  lastScraped?: string;
  scrapedUrl?: string;
  distance?: number; // distance in km from user's location
  branchAddress?: string; // nearest branch address
  phone?: string; // bank phone number
  institutionType?: 'bank' | 'credit-union';
  serviceModel?: 'online' | 'branch' | 'hybrid';
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  accountType: 'checking' | 'savings' | 'cd' | 'money-market';
  minRate?: number;
  maxMinDeposit?: number;
  preferredFeatures?: string[];
  location?: string;
  zipCode?: string;
}

export interface AIRecommendation {
  bankRate: BankRate;
  score: number;
  reasoning: string;
}

export interface CommunitySubmission {
  bankName: string;
  accountType: 'checking' | 'savings' | 'cd' | 'money-market';
  rate: number;
  apy?: number;
  minDeposit?: number;
  term?: number;
  features?: string[];
  source?: string;
  notes?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface ChatResponse {
  message: string;
  sessionId: string;
  suggestions?: string[];
  relatedRates?: BankRate[];
}

export interface ConversationHistory {
  messages: ChatMessage[];
  userPreferences?: {
    accountType?: string;
    budget?: number;
    goals?: string[];
    riskTolerance?: string;
  };
  summary?: string;
  lastActivity: Date;
}
