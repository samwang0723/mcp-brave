export interface WebSearchArgs {
  query: string;
  count?: number;
  safeSearch?: 'strict' | 'moderate' | 'off';
}

export interface SearchResult {
  title: string;
  description: string;
  url: string;
  resultType?: 'web' | 'news' | 'video';
}

export interface BraveBaseResult {
  title: string;
  url: string;
  description: string;
  thumbnail?: {
    src: string;
    original?: string;
  };
}

export interface BraveWebResult extends BraveBaseResult {
  snippet?: string;
  date?: string;
  source?: string;
}

export interface BraveNewsResult extends BraveBaseResult {
  source?: string;
  page_age?: string;
  age?: string;
  breaking?: boolean;
  extra_snippets?: string[];
}

export interface BraveVideoResult extends BraveBaseResult {
  duration?: string;
  creator?: string;
  publisher?: string;
  page_age?: string;
}

export interface BraveMixedItem {
  type: string;
  index?: number;
  all?: boolean;
}

export interface BraveMixed {
  main: BraveMixedItem[];
}

export interface BraveSearchResponse {
  web?: BraveWebResult[] | null;
  news?: {
    type: string;
    results: BraveNewsResult[];
  };
  videos?: {
    type: string;
    results: BraveVideoResult[];
  };
  mixed?: BraveMixed;
  query: string;
  total: number;
  page: number;
  results: number;
  type: string;
}

export interface RateLimit {
  perSecond: number;
  perMonth: number;
}

export interface RequestCount {
  second: number;
  month: number;
  lastReset: number;
}
