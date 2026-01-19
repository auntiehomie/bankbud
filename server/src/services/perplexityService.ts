import Perplexity from '@perplexity-ai/perplexity_ai';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

if (!PERPLEXITY_API_KEY) {
  throw new Error('PERPLEXITY_API_KEY is not set in environment variables');
}

const client = new Perplexity({
  apiKey: PERPLEXITY_API_KEY
});

export async function searchBankRatesWithPerplexity({ bankName, accountType = 'savings', zipCode }: { bankName?: string; accountType?: string; zipCode?: string }): Promise<any[]> {
  const prompt = `Search ${bankName}'s official website for their current ${accountType} account APY/interest rate as of ${new Date().getFullYear()}. What is the APY rate, minimum deposit, and any special features? Provide the exact rate number and the official website URL where you found it.`;

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
      rate: null
    };
    
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
    
    return [rateData];
  } catch (error: any) {
    console.error('Error calling Perplexity API:', error?.message || error);
    return [];
  }
}
