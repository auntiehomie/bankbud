import axios from 'axios';

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;

interface ScraperApiResponse {
  html: string;
  url: string;
}

/**
 * Use ScraperAPI to fetch a URL with JavaScript rendering and anti-bot bypass
 */
export async function fetchWithScraperApi(url: string): Promise<string> {
  if (!SCRAPER_API_KEY) {
    throw new Error('SCRAPER_API_KEY is not set');
  }

  try {
    console.log(`🔧 ScraperAPI: Fetching ${url}`);
    
    // ScraperAPI endpoint with parameters
    const scraperUrl = `http://api.scraperapi.com/?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(url)}&render=true`;
    
    const response = await axios.get(scraperUrl, {
      timeout: 30000, // 30 second timeout
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    console.log(`✅ ScraperAPI: Successfully fetched ${url}`);
    return response.data;
  } catch (error: any) {
    console.error(`❌ ScraperAPI error for ${url}:`, error.message);
    throw error;
  }
}

/**
 * Extract APY/rate information from HTML content using regex patterns
 */
export function extractRateFromHtml(html: string, bankName: string): { apy: number | null; rateInfo: string } {
  // Common patterns for APY on bank websites
  const patterns = [
    // "4.50% APY" or "4.50 % APY"
    /(\d+\.?\d*)\s*%\s*(?:APY|apy)/gi,
    // "APY: 4.50%" or "APY 4.50%"
    /(?:APY|apy)[:\s]+(\d+\.?\d*)\s*%/gi,
    // Rate ranges like "3.00% - 4.50% APY"
    /(\d+\.?\d*)\s*%?\s*-\s*(\d+\.?\d*)\s*%\s*(?:APY|apy)/gi,
    // Interest rate: 4.50%
    /(?:interest rate|annual percentage yield)[:\s]+(\d+\.?\d*)\s*%/gi,
  ];

  const matches: number[] = [];
  const matchedText: string[] = [];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      // Get the highest rate if it's a range
      const rate = match[2] ? parseFloat(match[2]) : parseFloat(match[1]);
      if (!isNaN(rate) && rate > 0 && rate < 20) { // Sanity check
        matches.push(rate);
        matchedText.push(match[0]);
      }
    }
  }

  if (matches.length === 0) {
    return {
      apy: null,
      rateInfo: `No rate information found on page for ${bankName}`
    };
  }

  // Take the highest rate found (usually the best offer)
  const highestRate = Math.max(...matches);
  
  return {
    apy: highestRate,
    rateInfo: `Found rate ${highestRate}% APY via ScraperAPI. Matched patterns: ${matchedText.slice(0, 3).join(', ')}`
  };
}

/**
 * Scrape a bank's rate page and extract APY information
 */
export async function scrapeBankRate(url: string, bankName: string, accountType: string = 'savings'): Promise<{
  apy: number | null;
  rate: number | null;
  rateInfo: string;
  sourceUrl: string;
  dataSource: 'scraped';
}> {
  try {
    const html = await fetchWithScraperApi(url);
    const { apy, rateInfo } = extractRateFromHtml(html, bankName);

    return {
      apy,
      rate: apy,
      rateInfo,
      sourceUrl: url,
      dataSource: 'scraped'
    };
  } catch (error: any) {
    console.error(`Failed to scrape ${bankName}:`, error.message);
    return {
      apy: null,
      rate: null,
      rateInfo: `ScraperAPI failed: ${error.message}`,
      sourceUrl: url,
      dataSource: 'scraped'
    };
  }
}
