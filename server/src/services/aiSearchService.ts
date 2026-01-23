import axios from 'axios';
import Perplexity from '@perplexity-ai/perplexity_ai';
import BankRate from '../models/BankRate.js';
import { updateOrCreateBankRate } from '../utils/rateUpdater.js';
import { getBankRateUrl } from '../config/bankRateUrls.js';

const perplexity = new Perplexity({
  apiKey: process.env.PERPLEXITY_API_KEY || '',
});

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
}

/**
 * Search for bank rates and extract with AI
 * This uses Perplexity to search and analyze real websites
 */
export async function searchAndExtractRates(
  bankName?: string,
  accountType: string = 'savings',
  zipCode?: string
): Promise<any[]> {
  try {
    let searchQuery = '';
    if (zipCode) {
      searchQuery = `${accountType} account APY rate near ${zipCode} ${new Date().getFullYear()}`;
    } else if (bankName) {
      searchQuery = `${bankName} ${accountType} account APY rate ${new Date().getFullYear()}`;
    } else {
      searchQuery = `${accountType} account APY rate ${new Date().getFullYear()}`;
    }
    console.log('Perplexity AI search - searchQuery:', searchQuery, 'bankName:', bankName, 'zipCode:', zipCode);

    const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    
    // Get specific URL for this bank if available
    const specificUrl = bankName ? getBankRateUrl(bankName, accountType as any) : null;
    
    // Simple, natural question format
    const prompt = specificUrl
      ? `What is the current ${accountType} APY at ${specificUrl}?`
      : `What is ${bankName}'s current ${accountType} account APY? Check their official website.`;

    try {
      console.log('Calling Perplexity for web search...');
      const completion = await perplexity.chat.completions.create({
        model: 'sonar',
        messages: [
          { role: 'user', content: prompt }
        ],
        stream: false,
      });

      const rawContent = completion.choices?.[0]?.message?.content;
      const text = typeof rawContent === 'string' 
        ? rawContent 
        : Array.isArray(rawContent) 
          ? rawContent.map((chunk: any) => chunk.text || '').join('') 
          : '';
      
      // Log the full AI response for debugging
      console.log(`\n📝 Full Perplexity response for ${bankName}:`);
      console.log(text);
      console.log('---');

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
      console.error('Error during Perplexity AI call:', err);
      if (err && (err as any).stack) {
        console.error('Perplexity error stack:', (err as any).stack);
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
