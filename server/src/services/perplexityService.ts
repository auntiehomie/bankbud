import axios from 'axios';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

if (!PERPLEXITY_API_KEY) {
  throw new Error('PERPLEXITY_API_KEY is not set in environment variables');
}

const PERPLEXITY_API_URL = 'https://api.perplexity.ai/v1/complete';

export async function searchBankRatesWithPerplexity({ bankName, accountType = 'savings', zipCode }) {
  const prompt = `Find the current ${accountType} account APY/rate for ${bankName ? bankName : 'banks'}${zipCode ? ' near zip code ' + zipCode : ''} as of ${new Date().getFullYear()}. Provide the rate, minimum deposit, features, and the official source URL. Respond in JSON.`;

  try {
    const response = await axios.post(
      PERPLEXITY_API_URL,
      {
        model: 'pplx-70b-online',
        messages: [
          { role: 'system', content: 'You are a financial data researcher.' },
          { role: 'user', content: prompt }
        ],
        stream: false
      },
      {
        headers: {
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    const result = response.data;
    // Perplexity returns the answer in result.choices[0].message.content
    const text = result.choices?.[0]?.message?.content || '';
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in Perplexity response:', text);
      return [];
    }
    const data = JSON.parse(jsonMatch[0]);
    return [data];
  } catch (error) {
    console.error('Error calling Perplexity API:', error?.response?.data || error);
    return [];
  }
}
