import axios from 'axios';
import * as cheerio from 'cheerio';

interface RateFeedItem {
  bankName: string;
  accountType: 'savings' | 'checking' | 'cd' | 'money-market';
  apy: number;
  sourceUrl: string;
  pubDate: Date;
}

/**
 * Parse Bankrate RSS feeds for current rate information
 * Fallback data source when AI searches fail
 */
export async function fetchBankrateRSSData(): Promise<RateFeedItem[]> {
  const rates: RateFeedItem[] = [];
  
  try {
    // Bankrate's savings rates page (they don't have a direct RSS, so we scrape their rate table)
    const savingsUrl = 'https://www.bankrate.com/banking/savings/rates/';
    const response = await axios.get(savingsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    
    // Parse Bankrate's rate comparison table
    $('table tr, .rate-table tr, [class*="rate"] tr').each((i, elem) => {
      try {
        const $row = $(elem);
        const text = $row.text().toLowerCase();
        
        // Look for bank names and APY values
        const bankMatch = text.match(/(marcus|ally|synchrony|discover|capital one|american express|cit bank|barclays|citizens access)/i);
        const apyMatch = text.match(/(\d+\.\d+)%?\s*(?:apy|rate)/i);
        
        if (bankMatch && apyMatch) {
          const apy = parseFloat(apyMatch[1]);
          if (apy > 0 && apy < 20) { // Sanity check
            rates.push({
              bankName: bankMatch[1],
              accountType: 'savings',
              apy,
              sourceUrl: savingsUrl,
              pubDate: new Date()
            });
          }
        }
      } catch (err) {
        // Skip rows that don't parse
      }
    });
    
    console.log(`Fetched ${rates.length} rates from Bankrate RSS`);
    return rates;
    
  } catch (error) {
    console.error('Error fetching Bankrate data:', error);
    return rates;
  }
}

/**
 * Fetch from NerdWallet's rate comparison page
 */
export async function fetchNerdWalletData(): Promise<RateFeedItem[]> {
  const rates: RateFeedItem[] = [];
  
  try {
    const url = 'https://www.nerdwallet.com/best/banking/high-yield-online-savings-accounts';
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    
    // Parse NerdWallet's structured rate data
    $('[class*="product"], [class*="bank"], article').each((i, elem) => {
      try {
        const $elem = $(elem);
        const text = $elem.text();
        
        const bankMatch = text.match(/(Marcus|Ally|Synchrony|Discover|Capital One|American Express|CIT Bank|Barclays|Citizens Access)/i);
        const apyMatch = text.match(/(\d+\.\d+)%?\s*(?:APY|apy)/i);
        
        if (bankMatch && apyMatch) {
          const apy = parseFloat(apyMatch[1]);
          if (apy > 0 && apy < 20) {
            rates.push({
              bankName: bankMatch[1],
              accountType: 'savings',
              apy,
              sourceUrl: url,
              pubDate: new Date()
            });
          }
        }
      } catch (err) {
        // Skip elements that don't parse
      }
    });
    
    console.log(`Fetched ${rates.length} rates from NerdWallet`);
    return rates;
    
  } catch (error) {
    console.error('Error fetching NerdWallet data:', error);
    return rates;
  }
}

/**
 * Combined RSS/scraping fallback - tries multiple sources
 */
export async function fetchRSSFallbackRates(): Promise<RateFeedItem[]> {
  const allRates: RateFeedItem[] = [];
  
  // Try Bankrate
  const bankrateRates = await fetchBankrateRSSData();
  allRates.push(...bankrateRates);
  
  // Try NerdWallet
  const nerdwalletRates = await fetchNerdWalletData();
  allRates.push(...nerdwalletRates);
  
  // Deduplicate by bank name (keep highest APY)
  const rateMap = new Map<string, RateFeedItem>();
  for (const rate of allRates) {
    const key = rate.bankName.toLowerCase();
    const existing = rateMap.get(key);
    if (!existing || rate.apy > existing.apy) {
      rateMap.set(key, rate);
    }
  }
  
  return Array.from(rateMap.values());
}
