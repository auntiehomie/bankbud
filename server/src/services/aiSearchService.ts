import axios from 'axios';
import { Mistral } from '@mistralai/mistralai';
import BankRate from '../models/BankRate.js';
import { updateOrCreateBankRate } from '../utils/rateUpdater.js';

const mistral = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY || '',
});

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

/**
 * Search Google for bank rates and extract with AI
 * This uses Mistral to analyze search results
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
    console.log('Mistral AI search - searchQuery:', searchQuery, 'bankName:', bankName, 'zipCode:', zipCode);

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
    console.log('Mistral Prompt:', prompt);

    try {
      console.log('Calling Mistral chat.complete...');
      const completion = await mistral.chat.complete({
        model: 'mistral-large-latest',
        messages: [
          { role: 'system', content: 'You are a financial data researcher. Always respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        maxTokens: 500,
      });

      const rawContent = completion.choices?.[0]?.message?.content;
      const text = typeof rawContent === 'string' 
        ? rawContent 
        : Array.isArray(rawContent) 
          ? rawContent.map((chunk: any) => chunk.text || '').join('') 
          : '';
      
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
      console.error('Error during Mistral AI call:', err);
      if (err && (err as any).stack) {
        console.error('Mistral error stack:', (err as any).stack);
      }
      throw err;
    }
  } catch (error) {
    console.error('Error in searchAndExtractRates:', error);
    return [];
  }
}

/**
 * List available models for debugging (deprecated - Mistral doesn't have this feature)
 */
export async function listAvailableGeminiModels(): Promise<any> {
  console.log('Note: Model listing not available with Mistral API');
  return null;
}

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

        // Use shared utility to update database
        const updated = await updateOrCreateBankRate({
          bankName: rateData.bankName,
          accountType: rateData.accountType as any,
          rate: rateData.rate || rateData.apy,
          apy: rateData.apy,
          minDeposit: rateData.minDeposit,
          features: rateData.features,
          sourceUrl: rateData.sourceUrl,
        });
        
        if (updated) {
          updatedCount++;
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
