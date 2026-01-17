import { GoogleGenerativeAI } from '@google/generative-ai';
import BankRate from '../models/BankRate.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface AIFoundRate {
  bankName: string;
  accountType: 'savings' | 'checking' | 'cd' | 'money-market';
  rate: number;
  apy: number;
  minDeposit?: number;
  term?: number;
  features: string[];
  sourceUrl: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Use Gemini AI to search for and extract current bank rates from the web
 */
export async function findRatesWithAI(
  bankName?: string,
  accountType?: string
): Promise<AIFoundRate[]> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const query = bankName && accountType
      ? `Find the current ${accountType} account rate for ${bankName} as of January 2026. Include the APY, minimum deposit, and any key features.`
      : bankName
      ? `Find the current savings and checking account rates for ${bankName} as of January 2026.`
      : `Find the top 5 highest savings account rates from online banks as of January 2026.`;

    const prompt = `${query}

Please provide the information in this exact JSON format:
{
  "rates": [
    {
      "bankName": "Bank Name",
      "accountType": "savings|checking|cd|money-market",
      "rate": 4.50,
      "apy": 4.50,
      "minDeposit": 0,
      "term": 12,
      "features": ["Feature 1", "Feature 2"],
      "sourceUrl": "https://...",
      "confidence": "high|medium|low"
    }
  ]
}

Important:
- Use only real, current data from January 2026
- Include the official bank website URL as sourceUrl
- Set confidence based on how recent and reliable the source is
- For CDs, include the term in months
- Return valid JSON only, no other text`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in AI response');
      return [];
    }

    const data = JSON.parse(jsonMatch[0]);
    return data.rates || [];
  } catch (error) {
    console.error('Error finding rates with AI:', error);
    return [];
  }
}

/**
 * Update database with AI-found rates
 */
export async function updateRatesWithAI(
  bankName?: string,
  accountType?: string
): Promise<number> {
  try {
    const aiRates = await findRatesWithAI(bankName, accountType);
    let updatedCount = 0;

    for (const aiRate of aiRates) {
      // Only use high confidence rates for auto-updates
      if (aiRate.confidence !== 'high') {
        console.log(`Skipping ${aiRate.bankName} - confidence too low`);
        continue;
      }

      // Update or create rate in database
      const existingRate = await BankRate.findOne({
        bankName: aiRate.bankName,
        accountType: aiRate.accountType,
      });

      if (existingRate) {
        // Update existing rate
        existingRate.rate = aiRate.rate;
        existingRate.apy = aiRate.apy;
        existingRate.minDeposit = aiRate.minDeposit;
        existingRate.term = aiRate.term;
        existingRate.features = aiRate.features;
        existingRate.scrapedUrl = aiRate.sourceUrl;
        existingRate.lastScraped = new Date();
        existingRate.dataSource = 'api';
        await existingRate.save();
        updatedCount++;
      } else {
        // Create new rate
        await BankRate.create({
          bankName: aiRate.bankName,
          accountType: aiRate.accountType,
          rate: aiRate.rate,
          apy: aiRate.apy,
          minDeposit: aiRate.minDeposit || 0,
          term: aiRate.term,
          features: aiRate.features,
          verifications: 0,
          reports: 0,
          lastVerified: new Date(),
          scrapedUrl: aiRate.sourceUrl,
          availability: 'national',
          dataSource: 'api',
          lastScraped: new Date(),
        });
        updatedCount++;
      }
    }

    console.log(`Updated ${updatedCount} rates using AI`);
    return updatedCount;
  } catch (error) {
    console.error('Error updating rates with AI:', error);
    return 0;
  }
}

/**
 * Search for a specific bank's rates using AI
 */
export async function searchBankRatesWithAI(bankName: string): Promise<AIFoundRate[]> {
  return findRatesWithAI(bankName);
}
