import Perplexity from '@perplexity-ai/perplexity_ai';
import { fetchRSSFallbackRates } from './rssFeedService.js';
import { getBankRateUrl } from '../config/bankRateUrls.js';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

if (!PERPLEXITY_API_KEY) {
  throw new Error('PERPLEXITY_API_KEY is not set in environment variables');
}

const client = new Perplexity({
  apiKey: PERPLEXITY_API_KEY
});

export async function searchBankRatesWithPerplexity({ bankName, accountType = 'savings', zipCode }: { bankName?: string; accountType?: string; zipCode?: string }): Promise<any[]> {
  const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  
  // Get the specific URL for this bank and account type
  const specificUrl = bankName ? getBankRateUrl(bankName, accountType as any) : null;
  
  // Build focused query
  const query = specificUrl 
    ? `Visit ${specificUrl} - what is the current ${accountType} account APY shown on this page today?`
    : `What is ${bankName}'s current ${accountType} account APY as of today ${currentDate}?`;

  try {
    // Use chat completions with web search enabled
    const response = await client.chat.completions.create({
      model: 'sonar',
      messages: [
        { 
          role: 'user', 
          content: query
        }
      ],
      stream: false,
    });
    
    // Extract response
    const content = response.choices?.[0]?.message?.content;
    const text = typeof content === 'string' ? content : '';
    
    if (!text) {
      console.error('No response from Perplexity');
      return [];
    }
    
    // Log full response for debugging
    console.log(`\n📝 Full Perplexity response for ${bankName}:`);
    console.log(text);
    console.log('---');
    
    // Parse the text response to extract rate information
    const rateData: any = {
      bankName: bankName,
      accountType: accountType,
      sourceUrl: specificUrl || '',
      rateInfo: text, // Store full response
      fullResponse: text, // Keep full text for display
      apy: null,
      rate: null,
      dataFreshness: 'perplexity-search',
      lastChecked: new Date().toISOString()
    };
    
    // Check if AI indicated it couldn't find current data
    if (text.match(/cannot find|unable to locate|no current|not available|as of.*202[0-4]/i)) {
      rateData.rateInfo = '⚠️ Current rate data unavailable. ' + rateData.rateInfo;
    }
    
    // Try to extract APY/rate from text using regex
    const apyMatch = text.match(/(\d+\.?\d*)\s*%?\s*(?:APY|apy)/i);
    const rateRangeMatch = text.match(/(\d+\.?\d*)\s*%?\s*-\s*(\d+\.?\d*)\s*%?\s*(?:APY|apy)/i);
    
    if (rateRangeMatch) {
      // Found a range like "3.20%-3.82% APY"
      rateData.apy = parseFloat(rateRangeMatch[2]); // Use the higher end
      rateData.rate = parseFloat(rateRangeMatch[2]);
      rateData.rateRange = `${rateRangeMatch[1]}%-${rateRangeMatch[2]}%`;
    } else if (apyMatch) {
      // Found a single rate like "3.50% APY"
      rateData.apy = parseFloat(apyMatch[1]);
      rateData.rate = parseFloat(apyMatch[1]);
    }
    
    // Extract URL
    const urlMatch = text.match(/https?:\/\/[^\s\]]+/);
    if (urlMatch) {
      rateData.sourceUrl = urlMatch[0];
    }
    
    console.log(`Parsed ${bankName}: APY=${rateData.apy || 'N/A'}, URL=${rateData.sourceUrl || 'N/A'}`);
    
    // FALLBACK: If Perplexity didn't find reliable data, try Puppeteer scraping
    if (!rateData.apy || !rateData.sourceUrl || rateData.rateInfo.includes('⚠️')) {
      console.log(`⚠️ Perplexity data unreliable for ${bankName}, trying Puppeteer fallback...`);
      try {
        const rssFallbackRates = await fetchRSSFallbackRates();
        const fallbackRate = rssFallbackRates.find(
          r => bankName && (
            r.bankName.toLowerCase().includes(bankName.toLowerCase()) || 
            bankName.toLowerCase().includes(r.bankName.toLowerCase())
          )
        );
        
        if (fallbackRate) {
          console.log(`✓ Found Puppeteer fallback rate for ${bankName}: ${fallbackRate.apy}%`);
          rateData.apy = fallbackRate.apy;
          rateData.rate = fallbackRate.apy;
          rateData.sourceUrl = fallbackRate.sourceUrl;
          rateData.dataFreshness = 'puppeteer-scraped';
          rateData.rateInfo = `Rate from Bankrate/NerdWallet (${new Date().toLocaleDateString()})`;
        }
      } catch (fallbackError) {
        console.error('Puppeteer fallback failed:', fallbackError);
      }
    }
    
    // Add warning in rateInfo if no URL was found (suggests data may be unreliable)
    if (!rateData.sourceUrl) {
      rateData.rateInfo = '⚠️ No source URL found - please verify rate directly. ' + rateData.rateInfo;
      console.warn(`Warning: No source URL found for ${bankName}`);
    }
    
    return [rateData];
  } catch (error: any) {
    console.error('Error calling Perplexity API:', error?.message || error);
    return [];
  }
}
