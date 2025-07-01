import { RateLimit } from '../types.js';
import dotenv from 'dotenv';

dotenv.config();

interface LoggingConfig {
  level: string;
}

interface ServerConfig {
  port: number;
}

interface BraveConfig {
  apiKey: string;
  baseUrl: string;
}

interface SearchConfig {
  maxQueryLength: number;
  maxResults: number;
  defaultResults: number;
  defaultSafeSearch: 'strict' | 'moderate' | 'off';
}

interface Config {
  logging: LoggingConfig;
  server: ServerConfig;
  rateLimit: RateLimit;
  search: SearchConfig;
  brave: BraveConfig;
}

const config: Config = {
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  },
  rateLimit: {
    // More lenient rate limits for testing
    perSecond: process.env.NODE_ENV === 'test' ? 5 : 20,
    perMonth: process.env.NODE_ENV === 'test' ? 1000 : 20000000,
  },
  search: {
    maxQueryLength: 300,
    maxResults: 10,
    defaultResults: 5,
    defaultSafeSearch: 'strict' as const,
  },
  brave: {
    apiKey: process.env.BRAVE_API_KEY || '',
    baseUrl: 'https://api.search.brave.com/res/v1/web/search',
  },
};

// Validate API key in production environments
if (process.env.NODE_ENV === 'production' && !config.brave.apiKey) {
  throw new Error(
    'BRAVE_API_KEY environment variable is required in production'
  );
}

export default config;
