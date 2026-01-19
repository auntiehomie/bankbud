import Perplexity from '@perplexity-ai/perplexity_ai';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

if (!PERPLEXITY_API_KEY) {
  throw new Error('PERPLEXITY_API_KEY is not set in environment variables');
}

const client = new Perplexity({
  apiKey: PERPLEXITY_API_KEY
});

export async function searchBankRatesWithPerplexity({ bankName, accountType = 'savings', zipCode }: { bankName?: string; accountType?: string; zipCode?: string }): Promise<any[]> {
  const prompt = `Find the current ${accountType} account APY/rate for ${bankName ? bankName : 'banks'}${zipCode ? ' near zip code ' + zipCode : ''} as of ${new Date().getFullYear()}. Provide the rate, minimum deposit, features, and the official source URL. Respond in JSON.`;

  try {
    const response = await client.chat.completions.create({
      model: 'llama-3.1-sonar-large-128k-online',
      messages: [
        { role: 'system', content: 'You are a financial data researcher.' },
        { role: 'user', content: prompt }
      ],
      stream: false
    });
    
    // Perplexity SDK returns the answer in response.choices[0].message.content
    const content = response.choices?.[0]?.message?.content;
    const text = typeof content === 'string' ? content : '';
    
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in Perplexity response:', text);
      return [];
    }
    const data = JSON.parse(jsonMatch[0]);
    return [data];
  } catch (error: any) {
    console.error('Error calling Perplexity API:', error?.message || error);
    return [];
  }
}
