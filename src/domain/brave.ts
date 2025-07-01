import {
  WebSearchArgs,
  RequestCount,
  SearchResult,
  BraveSearchResponse,
  BraveWebResult,
  BraveNewsResult,
  BraveVideoResult,
} from '../types.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';

// Rate limit status
const requestCount: RequestCount = {
  second: 0,
  month: 0,
  lastReset: Date.now(),
};

/**
 * Sanitize and URL-encode the search query for safe use in URLs
 * @param query Raw search query
 * @returns URL-safe encoded query
 */
function sanitizeQuery(query: string): string {
  // Remove potentially harmful characters and normalize whitespace
  const sanitized = query
    .trim()
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, config.search.maxQueryLength);

  // Return the sanitized query (URL encoding will be handled by searchParams.set)
  return sanitized;
}

/**
 * Check and update rate limit
 * @throws {Error} Throws error when rate limit is exceeded
 */
export function checkRateLimit(): void {
  const now = Date.now();
  logger.debug('Rate limit check - Current counts:', requestCount);

  // Reset per-second counter
  if (now - requestCount.lastReset > 1000) {
    requestCount.second = 0;
    requestCount.lastReset = now;
  }

  // Check limits
  if (
    requestCount.second >= config.rateLimit.perSecond ||
    requestCount.month >= config.rateLimit.perMonth
  ) {
    const error = new Error('Rate limit exceeded');
    logger.error('Rate limit exceeded:', requestCount);
    throw error;
  }

  // Update counters
  requestCount.second++;
  requestCount.month++;
}

/**
 * Type guard: check if arguments match WebSearchArgs interface
 */
export function isWebSearchArgs(args: unknown): args is WebSearchArgs {
  if (typeof args !== 'object' || args === null) {
    return false;
  }

  const { query } = args as Partial<WebSearchArgs>;

  if (typeof query !== 'string') {
    return false;
  }

  if (query.length > config.search.maxQueryLength) {
    return false;
  }

  return true;
}

/**
 * Extract and normalize results from all sections of Brave Search API response
 */
function extractBraveResults(
  data: BraveSearchResponse,
  count: number
): SearchResult[] {
  const allResults: SearchResult[] = [];

  // Extract web results
  const webResults: SearchResult[] = [];
  if (Array.isArray(data.web)) {
    webResults.push(
      ...data.web.map((result: BraveWebResult) => ({
        title: result.title,
        description: result.description || result.snippet || '',
        url: result.url,
        resultType: 'web' as const,
      }))
    );
  } else if (data.web !== null && data.web !== undefined) {
    logger.warn(
      'Brave API returned malformed web section - expected array or null'
    );
  }

  // Extract news results
  const newsResults: SearchResult[] = [];
  if (data.news?.results && Array.isArray(data.news.results)) {
    newsResults.push(
      ...data.news.results.map((result: BraveNewsResult) => ({
        title: result.title,
        description: result.description,
        url: result.url,
        resultType: 'news' as const,
      }))
    );
  } else if (data.news && !Array.isArray(data.news.results)) {
    logger.warn(
      'Brave API returned malformed news section - expected results array'
    );
  }

  // Extract video results
  const videoResults: SearchResult[] = [];
  if (data.videos?.results && Array.isArray(data.videos.results)) {
    videoResults.push(
      ...data.videos.results.map((result: BraveVideoResult) => ({
        title: result.title,
        description: result.description,
        url: result.url,
        resultType: 'video' as const,
      }))
    );
  } else if (data.videos && !Array.isArray(data.videos.results)) {
    logger.warn(
      'Brave API returned malformed videos section - expected results array'
    );
  }

  // Handle mixed ordering if available
  if (data.mixed?.main && Array.isArray(data.mixed.main)) {
    logger.debug('Using mixed ordering from Brave API');

    for (const mixedItem of data.mixed.main) {
      let sourceResults: SearchResult[] = [];

      switch (mixedItem.type) {
        case 'web':
          sourceResults = webResults;
          break;
        case 'news':
          sourceResults = newsResults;
          break;
        case 'videos':
          sourceResults = videoResults;
          break;
        default:
          logger.warn(`Unknown mixed result type: ${mixedItem.type}`);
          continue;
      }

      if (mixedItem.all) {
        // Add all results from this section
        allResults.push(...sourceResults);
      } else if (typeof mixedItem.index === 'number') {
        // Add specific result by index
        if (mixedItem.index >= 0 && mixedItem.index < sourceResults.length) {
          allResults.push(sourceResults[mixedItem.index]);
        } else {
          logger.warn(
            `Mixed ordering index out of bounds: ${mixedItem.index} for type ${mixedItem.type}`
          );
        }
      }

      // Stop if we've reached the requested count
      if (allResults.length >= count) {
        break;
      }
    }
  } else {
    // Fallback to simple concatenation
    logger.debug('No mixed ordering available, using simple concatenation');
    allResults.push(...webResults, ...newsResults, ...videoResults);
  }

  // Log processing summary
  const processedSections = [];
  if (webResults.length > 0)
    processedSections.push(`web: ${webResults.length}`);
  if (newsResults.length > 0)
    processedSections.push(`news: ${newsResults.length}`);
  if (videoResults.length > 0)
    processedSections.push(`videos: ${videoResults.length}`);

  if (processedSections.length > 0) {
    logger.debug(`Processed sections - ${processedSections.join(', ')}`);
  }

  // Limit results to requested count
  return allResults.slice(0, count);
}

/**
 * Fetch results from Brave Search API
 */
async function fetchBraveSearchResults(
  query: string,
  count: number
): Promise<SearchResult[]> {
  const url = new URL(config.brave.baseUrl);
  url.searchParams.set('q', query);
  url.searchParams.set('count', count.toString());
  url.searchParams.set('safesearch', 'strict');

  const response = await fetch(url.toString(), {
    headers: {
      'X-Subscription-Token': config.brave.apiKey,
      Accept: 'application/json',
      'Accept-Encoding': 'gzip',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Brave Search API: Unauthorized - check your API key');
    }
    if (response.status === 429) {
      throw new Error('Brave Search API: Rate limit exceeded');
    }
    throw new Error(
      `Brave Search API error: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as BraveSearchResponse;

  // Extract results from all sections
  return extractBraveResults(data, count);
}

/**
 * Perform a web search using Brave Search
 * @param query Search query
 * @param count Number of results
 * @param safeSearch Safe search level
 * @returns Formatted search results
 */
export async function performWebSearch(
  query: string,
  count: number = config.search.defaultResults,
  safeSearch: 'strict' | 'moderate' | 'off' = config.search.defaultSafeSearch
): Promise<string> {
  logger.debug(
    `Performing search - Query: "${query}", Count: ${count}, SafeSearch: ${safeSearch}`
  );

  try {
    checkRateLimit();

    // Sanitize the query for URL safety
    const sanitizedQuery = sanitizeQuery(query);

    // Fetch results from Brave Search API
    const results = await fetchBraveSearchResults(sanitizedQuery, count);

    if (results.length === 0) {
      logger.info(`No results found for query: "${query}"`);
      return `No results found for "${query}". Try using different keywords or check your spelling.`;
    }

    logger.info(`Found ${results.length} results for query: "${query}"`);

    // Format results
    return formatSearchResults(query, results);
  } catch (error) {
    logger.error(`Search failed - Query: "${query}"`, error);

    // Return a more user-friendly error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    return `Sorry, there was an error performing your search for "${query}". Error: ${errorMessage}.`;
  }
}

/**
 * Format search results as Markdown
 */
export function formatSearchResults(
  query: string,
  results: SearchResult[]
): string {
  const formattedResults = results
    .map((r: SearchResult, index: number) => {
      // Get emoji based on result type
      let emoji = '🌐'; // Default for web
      if (r.resultType === 'news') {
        emoji = '📰';
      } else if (r.resultType === 'video') {
        emoji = '🎬';
      }

      // Build the main title line
      let resultText = `### ${index + 1}. ${emoji} ${r.title}`;

      // Add description
      if (r.description) {
        resultText += `\n${r.description}`;
      }

      // Add the URL link
      resultText += `\n[Read more](${r.url})`;

      return resultText;
    })
    .join('\n\n');

  return `Search results for "${query}" (${results.length} results)\n\n${formattedResults}`;
}
