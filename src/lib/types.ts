// ─── Waitlist ─────────────────────────────────────────────────────────────────

export interface WaitlistFormData {
  firstName: string;
  email: string;
  universityName: string;
  phone: string;
  level: string;
  country: string;
}

export interface WaitlistFormErrors {
  firstName?: string;
  email?: string;
  universityName?: string;
  phone?: string;
  level?: string;
  country?: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export interface ApiResponse<T = void> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  meta?: {
    total?: number;
    totalPages?: number;
    page?: number;
    limit?: number;
    [key: string]: unknown;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Geo ──────────────────────────────────────────────────────────────────────

export interface GeoResult {
  name: string;
  code: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponseData extends AuthTokens {
  user?: AuthUserSummary;
  isNewUser?: boolean;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  accountType: 'Undergraduate' | 'Law School Student';
  referralCode?: string;
}

export interface VerifyEmailRequest {
  email: string;
  otp: string;
}

export interface AuthTokens {
  accessToken?: string;
  refreshToken?: string;
  token?: string;
}

export interface AuthUserSummary {
  firstName?: string;
  lastName?: string;
  email?: string;
  avatar?: string;
  username?: string;
  role?: string;
}

export interface VerifyEmailResponseData extends AuthTokens {
  user?: AuthUserSummary;
}

export interface VerifyOtpResponse {
  resetToken: string;
}

// ─── Health ───────────────────────────────────────────────────────────────────

export interface HealthResponse {
  success: boolean;
  message: string;
  timestamp: string;
}

// ─── Library / Uploads ────────────────────────────────────────────────────────

export interface PresignedUrlRequest {
  fileName: string;
  mimeType: string;
  folder?: 'DOCUMENTS' | 'LIBRARY' | 'AVATARS';
}

export interface PresignedUrlResponse {
  uploadUrl: string; // presigned PUT URL for direct S3 upload
  s3Key: string;
  s3Url: string;
  expiresIn: number;
}

export interface UploadCompleteRequest {
  title: string;
  subject?: string;
  s3Key: string;
  s3Url: string;
  fileSize: number;
}

export type DocumentContentKind =
  | 'pdf'
  | 'text'
  | 'html'
  | 'markdown'
  | 'json'
  | 'xml'
  | 'rtf'
  | 'image'
  | 'office'
  | 'binary';

export interface LibraryDocument {
  _id: string;
  id?: string; // Mongoose virtual — not always present; use _id
  title: string;
  subject?: string;
  type?: string;
  s3Url?: string;
  s3Key?: string;
  fileSize?: number;
  isBookmarked?: boolean;
  uploadedBy?: string;
  description?: string;
  isVerified?: boolean;
  /** Which viewer to use — from GET /library/:id */
  contentKind?: DocumentContentKind | string;
  hasTranscript?: boolean;
  createdAt: string;
  updatedAt?: string;
  metadata?: {
    court?: string;
    year?: number;
    citation?: string;
    jurisdiction?: string;
    description?: string;
    contentKind?: DocumentContentKind | string;
  };
}

export interface SignedUrlData {
  signedUrl: string;
  expiresIn: number;
  contentKind?: DocumentContentKind | string;
  s3Key?: string;
}

export interface DocumentTextData {
  text: string;
  contentKind: DocumentContentKind | string;
  cached: boolean;
}

export interface BookmarkData {
  bookmarked: boolean;
}

// ─── User ─────────────────────────────────────────────────────────────────────

export interface UpdateBioDataRequest {
  username?: string;
  firstName?: string;
  lastName?: string;
  country?: string;
  city?: string;
  schoolName?: string;
  levelYear?: string;
  matricNumber?: string;
  phoneNumber?: string;
}

export interface UpdateAvatarRequest {
  avatar: string;
  s3Key: string;
}

export interface AvatarUrlData {
  avatarUrl?: string;
  signedUrl?: string;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface SubjectMastery {
  subject: string;
  score: number;
  questionsAttempted?: number;
}

export interface ActivityItem {
  _id: string;
  /** 'quiz' | 'case' | 'ai_session' | 'socratic' | 'document' */
  type: string;
  title: string;
  subtitle: string;
  createdAt: string;
  /** In-app destination for this entry; absent when it has no detail view. */
  link?: string;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  deadline?: string;
  isCompleted: boolean;
}

/** `GET /dashboard` returns streak as an object, not a bare count. */
export interface DashboardStreak {
  current?: number;
  longest?: number;
  datesStudied?: string[];
}

export interface DashboardData {
  streak?: DashboardStreak;
  lastStudyDate?: string;
  /** Empty object (not an array) until the user has mastery data. */
  subjectMastery?: SubjectMastery[] | Record<string, never>;
  recentActivity?: unknown[];
  activeGoals?: Goal[];
  reasoningScore?: { latest: number };
  stats?: Record<string, number>;
  weakAreas?: unknown[];
  /** Not returned by `/dashboard` — the profile comes from `/auth/me`. */
  user?: AuthUserSummary;
}

// ─── Questions ────────────────────────────────────────────────────────────────

export interface Question {
  id: string;
  _id?: string;
  subject: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | string;
  type: string;
  prompt?: string;
  text?: string;
  scenario?: string;
  estimatedMinutes?: number;
  modelAnswer?: string;
}

export interface QuestionAttempt {
  id: string;
  _id?: string;
  questionId: string;
  answer: string;
  scores: {
    issueIdentification: number;
    ruleStatement: number;
    application: number;
    conclusion: number;
    total: number;
  };
  aiFeedback: string;
  modelAnswer?: string;
  createdAt: string;
}

/** API may return the attempt nested with gradingResult */
export interface QuestionSubmitResult {
  attempt?: QuestionAttempt;
  gradingResult?: {
    scores?: QuestionAttempt['scores'];
    feedback?: { overall?: string };
    modelAnswerHints?: string;
  };
}

// ─── Notes ────────────────────────────────────────────────────────────────────

export interface NoteTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  category?: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  subject?: string;
  tags?: string[];
  folder?: string;
  source?: string;
  qualityScore?: number;
  qualityFeedback?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface NoteAnalysis {
  qualityScore: number;
  qualityFeedback: string;
}

export interface CreateNoteRequest {
  title: string;
  content: string;
  subject?: string;
  tags?: string[];
  folder?: string;
  source?: string;
}

// ─── Case Explainer ───────────────────────────────────────────────────────────

export interface RelatedCase {
  citation: string;
  description?: string;
  relation?: string;
}

export interface CaseExplanation {
  id: string;
  _id?: string;
  citation?: string;
  documentId?: string;
  facts?: string;
  issue?: string;
  holding?: string;
  reasoning?: string;
  significance?: string;
  relatedCases?: RelatedCase[];
  practiceQuestions?: string[];
  status?: 'pending' | 'processing' | 'complete' | 'error';
  progress?: number;
  createdAt?: string;
}

export interface CaseHistoryItem {
  id: string;
  citation?: string;
  title?: string;
  documentId?: string;
  status?: string;
  createdAt: string;
}

export interface ExplainCaseRequest {
  documentId?: string;
  /** Preferred by API; also send as `text` for older clients. */
  caseText?: string;
  text?: string;
  citation?: string;
}

// ─── Research ─────────────────────────────────────────────────────────────────

export interface ResearchResult {
  documentId: string;
  title: string;
  matchScore: number;
  relevanceScore?: number;
  snippet?: string;
  excerpt?: string;
  subject?: string;
  type?: string;
  courtLevel?: string;
  citation?: string;
}

export interface ResearchSession {
  id: string;
  query: string;
  refinedQuery?: string;
  results: ResearchResult[];
  memo?: string;
  createdAt: string;
}

export interface SearchResearchRequest {
  query?: string;
  jurisdiction?: string;
  courtLevel?: string;
  subject?: string;
}

export interface SearchResearchResponse {
  sessionId: string;
  refinedQuery: string;
  results: ResearchResult[];
}

// ─── AI Chat ──────────────────────────────────────────────────────────────────

export interface AiConversation {
  sessionId: string;
  title?: string;
  messageCount: number;
  lastMessage?: string;
  createdAt: string;
}

export interface AiConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface AiConversationDetail extends AiConversation {
  messages: AiConversationMessage[];
  /** Socratic-only fields, present when `mode` is 'socratic'. */
  topic?: string;
  hintsUsed?: number;
}

export interface AiChatRequest {
  message: string;
  sessionId?: string;
}

export interface AiChatResponse {
  reply: string;
  sessionId: string;
}

export interface SocraticStartRequest {
  topic: string;
  subject?: string;
}

export interface SocraticStartResponse {
  sessionId: string;
  question: string;
}

export interface SocraticRespondRequest {
  sessionId: string;
  /** Preferred field expected by the API */
  response: string;
  /** Alias kept for older clients */
  message?: string;
}

// ─── Achievements ─────────────────────────────────────────────────────────────

export interface Achievement {
  id: string;
  name: string;
  category: 'streak' | 'quiz' | 'learning' | 'research' | 'special' | string;
  earned: boolean;
}

export interface AchievementsData {
  badges: Achievement[];
  currentStreak: number;
  longestStreak: number;
}

// ─── Reasoning Score ──────────────────────────────────────────────────────────

export interface ReasoningScoreEntry {
  overall: number;
  calculatedAt: string;
}

export interface ReasoningScoreData {
  latest: ReasoningScoreEntry | null;
  history: ReasoningScoreEntry[];
}

// ─── Progress / Question Stats ────────────────────────────────────────────────

/** Shape returned by GET /questions/stats */
export interface QuestionStats {
  total?: number;
  totalAttempted?: number;
  averageScore?: number;
  bySubject?: Record<string, { count: number; avgScore: number }>;
  subjectBreakdown?: Record<string, { attempted: number; averageScore: number }>;
  topSubject?: string;
  recentAttempts?: number;
}

// ─── Toast Notifications ──────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}
