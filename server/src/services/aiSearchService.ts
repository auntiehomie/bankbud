import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import BankRate from '../models/BankRate.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

// ...existing code...

/**
 * Search Google for bank rates and extract with AI
 * This uses Gemini to analyze search results
 */
export async function searchAndExtractRates(
  bankName?: string,
  accountType: string = 'savings',
  zipCode?: string
): Promise<any[]> {
  try {
    // Step 1: Perform Google search using a simple HTTP request
    let searchQuery = '';
    if (zipCode) {
      searchQuery = `${accountType} account APY rate near ${zipCode} ${new Date().getFullYear()}`;
    } else if (bankName) {
      searchQuery = `${bankName} ${accountType} account APY rate ${new Date().getFullYear()}`;
    } else {
      searchQuery = `${accountType} account APY rate ${new Date().getFullYear()}`;
    }
    console.log('Gemini AI search - searchQuery:', searchQuery, 'bankName:', bankName, 'zipCode:', zipCode);

    // Step 2: Use Gemini to search and analyze
    const model = genAI.getGenerativeModel({ 
      model: 'models/gemini-pro',
      generationConfig: {
        temperature: 0.1,
      }
    });

    const prompt = `You are a financial data researcher with access to current information.

TASK: Find the current ${accountType} account rate/APY for ${zipCode ? `banks near zip code ${zipCode}` : bankName ? bankName : 'all banks'} as of January 2026.

SEARCH QUERY: "${searchQuery}"

Please search for this information and provide:
1. The exact current APY/rate
2. Minimum deposit requirement
3. Any notable features or requirements
4. The official source URL
5. The bank name

If you cannot find current 2026 data, clearly state that and provide the most recent data available with the date.

Respond with JSON:
{
  "bankName": "",
  "accountType": "${accountType}",
  "apy": 0.00,
  "rate": 0.00,
  "minDeposit": 0,
  "features": [],
  "sourceUrl": "",
  "lastUpdated": "date",
  "confidence": "high|medium|low",
  "notes": ""
}`;
    // Log the full prompt for debugging
    console.log('Gemini Prompt:', prompt);

    try {
      console.log('Calling Gemini generateContent...');
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      // Log the raw AI response
      console.log('AI Search Response:', text);

      // Parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*?\}(?=\s*$)/);
      if (!jsonMatch) {
        console.error('No JSON found in AI search response. Full response:', text);
        return [];
      }
      try {
        const data = JSON.parse(jsonMatch[0]);
        return [data];
      } catch (jsonErr) {
        console.error('Failed to parse JSON from AI response:', jsonErr, text);
        return [];
      }
    } catch (err) {
      console.error('Error during Gemini AI call:', err);
      if (err && (err as any).stack) {
        console.error('Gemini error stack:', (err as any).stack);
      }
      throw err;
    }
  } catch (error) {
    console.error('Error in searchAndExtractRates:', error);
    return [];
  }
}

// ...existing code...

/**
 * List available Gemini models for debugging
 */
export async function listAvailableGeminiModels(): Promise<any> {
  try {
    // @ts-ignore: This is not in the official types, but is available in the API
    if (typeof (genAI as any).listModels !== 'function') {
      throw new Error('listModels is not available in this version of @google/generative-ai');
    }
    const models = await (genAI as any).listModels();
    console.log('Available Gemini models:', models);
    return models;
  } catch (error) {
    console.error('Error listing Gemini models:', error);
    return null;
  }
}

// ...existing code...

/**
 * Update a specific bank's rates using AI search
 */
export async function updateBankRatesWithSearch(
  bankName: string
): Promise<number> {
  try {
    let updatedCount = 0;
    const accountTypes = ['savings', 'checking', 'cd'];

    for (const accountType of accountTypes) {
      const rates = await searchAndExtractRates(bankName, accountType);
      
      for (const rateData of rates) {
        if (!rateData.apy || rateData.confidence === 'low') {
          console.log(`Skipping ${bankName} ${accountType} - low confidence or no data`);
          continue;
        }

        // Update or create rate in database
        const existingRate = await BankRate.findOne({
          bankName: rateData.bankName,
          accountType: rateData.accountType,
        });

        if (existingRate) {
          existingRate.rate = rateData.rate || rateData.apy;
          existingRate.apy = rateData.apy;
          existingRate.minDeposit = rateData.minDeposit;
          existingRate.features = rateData.features || [];
          existingRate.scrapedUrl = rateData.sourceUrl;
          existingRate.lastScraped = new Date();
          existingRate.dataSource = 'api';
          await existingRate.save();
          updatedCount++;
          console.log(`Updated ${bankName} ${accountType}: ${rateData.apy}%`);
        } else if (rateData.apy > 0) {
          await BankRate.create({
            bankName: rateData.bankName,
            accountType: rateData.accountType as any,
            rate: rateData.rate || rateData.apy,
            apy: rateData.apy,
            minDeposit: rateData.minDeposit || 0,
            features: rateData.features || [],
            verifications: 0,
            reports: 0,
            lastVerified: new Date(),
            scrapedUrl: rateData.sourceUrl,
            availability: 'national',
            dataSource: 'api',
            lastScraped: new Date(),
          });
          updatedCount++;
          console.log(`Created ${bankName} ${accountType}: ${rateData.apy}%`);
        }
      }

      // Add delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return updatedCount;
  } catch (error) {
    console.error('Error updating bank rates with search:', error);
    return 0;
  }
}
