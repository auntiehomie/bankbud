import Perplexity from '@perplexity-ai/perplexity_ai';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

if (!PERPLEXITY_API_KEY) {
  throw new Error('PERPLEXITY_API_KEY is not set in environment variables');
}

const client = new Perplexity({
  apiKey: PERPLEXITY_API_KEY
});

export async function searchBankRatesWithPerplexity({ bankName, accountType = 'savings', zipCode }: { bankName?: string; accountType?: string; zipCode?: string }): Promise<any[]> {
  const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const prompt = `Find ${bankName}'s current ${accountType} account APY/interest rate as of ${currentDate}. Go directly to ${bankName}'s official website (not third-party sites). What is their CURRENT advertised APY, minimum deposit requirement, and special features TODAY? Provide the exact APY number and the official ${bankName} website URL where you found this information. If you cannot find current 2026 data, explicitly state that.`;

  try {
    const response = await client.chat.completions.create({
      model: 'sonar',
      messages: [
        { role: 'system', content: 'You are a financial data researcher.' },
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
