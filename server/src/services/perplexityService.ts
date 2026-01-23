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
  
  // Enhanced prompt with specific URL if available
  const urlInstruction = specificUrl 
    ? `\n\nIMPORTANT: Go DIRECTLY to this URL where they publish their ${accountType} rates:\n${specificUrl}\n\nDo NOT go to the homepage. Go to the URL above and read the current rate from that page.`
    : `\n\nFind and navigate to ${bankName}'s ${accountType} rates page (usually at /savings, /checking, or /cd).`;
  
  const prompt = `IMPORTANT: You must visit the ACTUAL bank website to get the CURRENT ${currentDate} rate. Do not use cached or training data.

TASK: Visit ${bankName}'s official website RIGHT NOW and find their current ${accountType} account APY as displayed on their site TODAY (${currentDate}).
${urlInstruction}

REQUIRED STEPS:
1. Go directly to the specific rates page (URL provided above if available)
2. Find the EXACT current APY shown on the page TODAY
3. Read the minimum deposit requirement
4. Note any important features or requirements
5. Copy the exact URL where you found this information

Bank: ${bankName}
Account Type: ${accountType}
Today's Date: ${currentDate}

Provide:
- The EXACT APY shown on their website TODAY (not an old rate)
- The specific URL where you found this rate
- Minimum deposit requirement
- Any important features or requirements

If the rate page shows "as of [date]", include that date. If you can only find older data, explicitly state that and provide the date of that data.`;

  try {
    const response = await client.chat.completions.create({
      model: 'sonar',
      messages: [
        { role: 'system', content: 'You are a real-time web researcher. You MUST visit actual websites and provide current information as of today. Never use cached or training data for financial rates.' },
        { role: 'user', content: prompt }
      ],
      stream: false
    });
    
    // Perplexity SDK returns the answer in response.choices[0].message.content
    const content = response.choices?.[0]?.message?.content;
    const text = typeof content === 'string' ? content : '';
    
    if (!text) {
      console.error('No response from Perplexity');
      return [];
    }
    
    // Parse the text response to extract rate information
    const rateData: any = {
      bankName: bankName,
      accountType: accountType,
      sourceUrl: '',
      rateInfo: text.substring(0, 500), // Store first 500 chars for display
      apy: null,
      rate: null,
      dataFreshness: 'ai-generated',
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
        console.error('Puppeteer fallback also failed:', fallbackError);
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
