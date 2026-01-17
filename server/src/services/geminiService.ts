import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
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
 * Use Gemini AI with Google Search to find current bank rates
 */
export async function findRatesWithAI(
  bankName?: string,
  accountType?: string
): Promise<AIFoundRate[]> {
  try {
    // Use gemini-pro model
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-pro',
      generationConfig: {
        temperature: 0.1, // Lower temperature for more factual responses
      }
    });

    const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    
    const query = bankName && accountType
      ? `What is the current ${accountType} account APY/rate for ${bankName} in the United States as of ${currentDate}?`
      : bankName
      ? `What are the current savings account, checking account, and CD rates (APY) for ${bankName} in the United States as of ${currentDate}?`
      : `What are the top 5 highest online savings account rates (APY) in the United States as of ${currentDate}? Include banks like Marcus, Ally, Discover, Capital One, American Express, and others.`;

    const prompt = `You are a financial data researcher. Search the web for CURRENT bank interest rates.

QUERY: ${query}

INSTRUCTIONS:
1. Find the EXACT current rates from official bank websites or reliable financial sources (Bankrate, NerdWallet, etc.)
2. Include the source URL where you found each rate
3. Only include rates you can verify from recent sources (within the last 7 days)
4. For CDs, specify the term length
5. Mark confidence as "high" only if from official bank website, "medium" if from financial news sites, "low" if uncertain

Respond ONLY with valid JSON in this exact format (no other text):
{
  "rates": [
    {
      "bankName": "Bank Name",
      "accountType": "savings",
      "rate": 4.25,
      "apy": 4.25,
      "minDeposit": 0,
      "features": ["No Monthly Fee", "FDIC Insured"],
      "sourceUrl": "https://...",
      "confidence": "high"
    }
  ]
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('AI Response:', text);

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
