export interface ContentAnalysis {
  summary: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  keyInsights: string[];
  confidence: number;
  actionableItems: string[];
  categories: string[];
}

export interface ExtractedData {
  title: string;
  url: string;
  mainContent: string;
  forms: FormData[];
  metadata: PageMetadata;
  timestamp: number;
}

export interface FormData {
  id: string;
  action: string;
  fields: FormField[];
}

export interface FormField {
  name: string;
  type: string;
  value: string;
  label: string;
}

export interface PageMetadata {
  platform: string;
  contentType: string;
  wordCount: number;
  hasInteractiveElements: boolean;
}

export interface AnalysisState {
  analysis: ContentAnalysis | null;
  loading: boolean;
  error: string | null;
  lastAnalyzed: string | null;
}

export interface RateLimitEntry {
  timestamp: number;
  count: number;
}

export type MessageType = 
  | 'EXTRACT_CONTENT'
  | 'ANALYZE_CONTENT'
  | 'CONTENT_CHANGED';

export interface ChromeMessage {
  type: MessageType;
  data?: any;
  url?: string;
}