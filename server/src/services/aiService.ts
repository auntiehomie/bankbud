import OpenAI from 'openai';

let openai: OpenAI | null = null;

// Initialize OpenAI only if API key is available
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

interface BankRate {
  _id: string;
  bankName: string;
  accountType: string;
  rate: number;
  apy?: number;
  minDeposit?: number;
  term?: number;
  features?: string[];
  verifications: number;
  reports: number;
}

interface UserPreferences {
  accountType: string;
  minRate?: number;
  maxMinDeposit?: number;
  preferredFeatures?: string[];
  location?: string;
}

interface Recommendation {
  bankRate: BankRate;
  score: number;
  reasoning: string;
}

export async function getAIRecommendations(
  rates: any[],
  preferences: UserPreferences
): Promise<Recommendation[]> {
  if (!openai) {
    throw new Error('OpenAI is not configured');
  }
  
  // Prepare data for AI
  const ratesData = rates.map(r => ({
    id: r._id,
    bank: r.bankName,
    rate: r.apy || r.rate,
    minDeposit: r.minDeposit || 0,
    features: r.features || [],
    verifications: r.verifications,
    term: r.term
  }));
  
  const prompt = `You are a banking expert helping users find the best bank accounts.

User Preferences:
- Account Type: ${preferences.accountType}
- Minimum Rate: ${preferences.minRate ? preferences.minRate + '%' : 'No preference'}
- Max Minimum Deposit: ${preferences.maxMinDeposit ? '$' + preferences.maxMinDeposit : 'No limit'}
- Preferred Features: ${preferences.preferredFeatures?.join(', ') || 'None specified'}
- Location: ${preferences.location || 'Not specified'}

Available Rates:
${JSON.stringify(ratesData, null, 2)}

Please analyze these options and return the top 5 recommendations as a JSON array. Each recommendation should have:
- id: The rate ID
- score: A score from 0-100 indicating how well it matches the user's needs
- reasoning: A brief, friendly explanation (1-2 sentences) of why this is a good match

Consider:
1. Rate competitiveness (higher is better)
2. Minimum deposit requirements matching user preferences
3. Feature alignment with user preferences
4. Community verification count (higher is more trustworthy)
5. Overall value proposition

Return ONLY a valid JSON array, no other text.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful banking advisor. Respond only with valid JSON.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });
    
    const responseText = completion.choices[0].message.content;
    if (!responseText) {
      throw new Error('Empty response from OpenAI');
    }
    
    const aiRecommendations = JSON.parse(responseText);
    
    // Map AI recommendations back to full rate objects
    const recommendations: Recommendation[] = aiRecommendations.map((rec: any) => {
      const rate = rates.find(r => r._id.toString() === rec.id);
      return {
        bankRate: rate,
        score: rec.score,
        reasoning: rec.reasoning
      };
    }).filter((rec: Recommendation) => rec.bankRate); // Remove any that weren't found
    
    return recommendations;
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
}
