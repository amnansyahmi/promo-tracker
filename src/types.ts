export enum PromoType {
  GIVEAWAY = 'Giveaway',
  CONTEST = 'Contest',
  SPEND_AND_WIN = 'Spend and Win',
  CASHBACK = 'Cashback',
  VOUCHER = 'Voucher',
  DISCOUNT = 'Discount',
  FREEBIE = 'Freebie',
  LUCKY_DRAW = 'Lucky Draw',
  REFERRAL = 'Referral Campaign',
  BANK_PROMO = 'Bank Card Promo',
  EWALLET_PROMO = 'E-wallet Promo',
  TELCO_PROMO = 'Telco Promo',
  RETAIL_PROMO = 'Retail Promo',
  FNB_PROMO = 'Food & Beverage Promo',
  TRAVEL_PROMO = 'Travel Promo',
  SHOPPING_PROMO = 'Shopping Promo',
  APP_EXCLUSIVE = 'App-exclusive Promo',
  SOCIAL_MEDIA = 'Social Media Giveaway',
}

export enum ExpiryStatus {
  ACTIVE = 'Active',
  ENDING_SOON = 'Ending Soon',
  EXPIRED = 'Expired',
  UNKNOWN = 'Unknown',
}

export enum Status {
  DRAFT = 'Draft',
  PENDING_REVIEW = 'Pending Review',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  EXPIRED = 'Expired',
}

export enum UserRole {
  GUEST = 'guest',
  USER = 'user',
  ADMIN = 'admin',
}

export interface Promo {
  id?: string;
  title: string;
  brandName: string;
  promoType: string;
  category: string;
  country: string;
  state?: string;
  sourcePlatform?: string;
  sourceUrl?: string;
  sourceName?: string;
  imageUrl?: string;
  startDate?: string | null;
  endDate?: string | null;
  expiryStatus: ExpiryStatus;
  rewardTitle?: string;
  rewardValue?: string;
  rewardDescription?: string;
  requiredSpendAmount?: string;
  requiredPurchase?: boolean;
  entryMethod?: string;
  howToJoinSteps?: string[];
  eligibility?: string[];
  termsAndConditionsSummary?: string[];
  fullTermsUrl?: string;
  importantExclusions?: string[];
  winnerSelectionMethod?: string;
  winnerAnnouncementDate?: string;
  claimMethod?: string;
  difficultyLevel?: 'Easy' | 'Medium' | 'Hard';
  costLevel?: 'Free' | 'Requires Spend' | 'Requires Purchase' | 'Requires Deposit' | 'Unknown';
  chanceLevel?: 'Low' | 'Medium' | 'High' | 'Unknown';
  trustLevel?: 'Official' | 'Verified' | 'User Submitted' | 'Unverified' | 'Suspicious';
  tipsToWin?: string[];
  aiSummary?: string;
  aiConfidenceScore?: number;
  duplicateGroupId?: string;
  status: Status;
  createdByUserId?: string;
  reviewedByAdminId?: string;
  createdAt: string;
  updatedAt: string;
  lastCheckedAt?: string;
}

export interface Profile {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
}

export interface PromoSubmission {
  id?: string;
  submittedBy: string;
  sourceUrl?: string;
  uploadedImageUrl?: string;
  rawText?: string;
  aiExtractedJson?: any;
  status: 'Pending' | 'Approved' | 'Rejected';
  adminNotes?: string;
  createdAt: string;
}

export interface SavedPromo {
  id?: string;
  userId: string;
  promoId: string;
  savedAt: string;
}

export interface PromoEntry {
  id?: string;
  userId: string;
  promoId: string;
  enteredAt: string;
  status: 'Entered' | 'Completed' | 'Pending Winner';
  proofUrl?: string; // For receipt/proof of entry
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: string;
  link?: string;
}
