import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// Add stealth plugin to bypass Cloudflare
puppeteer.use(StealthPlugin());

interface RateFeedItem {
  bankName: string;
  accountType: 'savings' | 'checking' | 'cd' | 'money-market';
  apy: number;
  sourceUrl: string;
  pubDate: Date;
}

/**
 * Use Puppeteer to bypass Cloudflare and scrape Bankrate
 */
export async function fetchBankrateRSSData(): Promise<RateFeedItem[]> {
  const rates: RateFeedItem[] = [];
  let browser;
  
  try {
    console.log('Launching browser for Bankrate scraping...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    const url = 'https://www.bankrate.com/banking/savings/rates/';
    console.log('Navigating to Bankrate...');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Extract rate data from the page
    const scrapedRates = await page.evaluate(() => {
      const results: any[] = [];
      
      // Look for rate tables and structured data
      document.querySelectorAll('tr, [class*="rate"], [class*="bank"]').forEach((elem) => {
        const text = elem.textContent || '';
        const lowerText = text.toLowerCase();
        
        // Match bank names
        const bankMatch = lowerText.match(/(marcus|ally|synchrony|discover|capital one|american express|cit bank|barclays|citizens)/i);
        // Match APY values
        const apyMatch = text.match(/(\d+\.\d+)%?\s*(?:apy|rate)/i);
        
        if (bankMatch && apyMatch) {
          const apy = parseFloat(apyMatch[1]);
          if (apy > 0 && apy < 20) {
            results.push({
              bankName: bankMatch[1],
              apy: apy
            });
          }
        }
      });
      
      return results;
    });
    
    // Convert to RateFeedItem format
    scrapedRates.forEach(item => {
      rates.push({
        bankName: item.bankName,
        accountType: 'savings',
        apy: item.apy,
        sourceUrl: url,
        pubDate: new Date()
      });
    });
    
    console.log(`✓ Scraped ${rates.length} rates from Bankrate using Puppeteer`);
    
  } catch (error) {
    console.error('Puppeteer Bankrate scraping error:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  return rates;
}

/**
 * Use Puppeteer to bypass Cloudflare and scrape NerdWallet
 */
export async function fetchNerdWalletData(): Promise<RateFeedItem[]> {
  const rates: RateFeedItem[] = [];
  let browser;
  
  try {
    console.log('Launching browser for NerdWallet scraping...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    const url = 'https://www.nerdwallet.com/best/banking/high-yield-online-savings-accounts';
    console.log('Navigating to NerdWallet...');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Extract rate data
    const scrapedRates = await page.evaluate(() => {
      const results: any[] = [];
      
      document.querySelectorAll('[class*="product"], [class*="bank"], article').forEach((elem) => {
        const text = elem.textContent || '';
        
        const bankMatch = text.match(/(Marcus|Ally|Synchrony|Discover|Capital One|American Express|CIT Bank|Barclays|Citizens)/i);
        const apyMatch = text.match(/(\d+\.\d+)%?\s*(?:APY|apy)/i);
        
        if (bankMatch && apyMatch) {
          const apy = parseFloat(apyMatch[1]);
          if (apy > 0 && apy < 20) {
            results.push({
              bankName: bankMatch[1],
              apy: apy
            });
          }
        }
      });
      
      return results;
    });
    
    scrapedRates.forEach(item => {
      rates.push({
        bankName: item.bankName,
        accountType: 'savings',
        apy: item.apy,
        sourceUrl: url,
        pubDate: new Date()
      });
    });
    
    console.log(`✓ Scraped ${rates.length} rates from NerdWallet using Puppeteer`);
    
  } catch (error) {
    console.error('Puppeteer NerdWallet scraping error:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  return rates;
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
