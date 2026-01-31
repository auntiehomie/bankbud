import axios from 'axios';
import { fetchWithScraperApi } from './scraperApiService.js';
import { geocodeZip } from './bankBatchService.js';

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;

interface ZipCodeRate {
  bankName: string;
  apy: number;
  accountType: string;
  minimumDeposit?: number;
  location: string;
  zipCode: string;
  sourceUrl: string;
  dataSource: 'zip-code-search';
  lastChecked: string;
}

/**
 * Extract zip code from location string (e.g., "Bloomfield Hills, MI" -> "48302")
 * Uses geocoding to find the zip code
 */
export async function getZipCodeForLocation(location: string): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`;
    const res = await axios.get(url, { headers: { 'User-Agent': 'bankbud/1.0' } });
    
    if (res.data && res.data.length > 0) {
      const place = res.data[0];
      // Get postal code from the address
      if (place.address && place.address.postcode) {
        return place.address.postcode;
      }
      
      // If no postal code, try reverse geocode with the coordinates
      const lat = parseFloat(place.lat);
      const lon = parseFloat(place.lon);
      
      const reverseUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
      const reverseRes = await axios.get(reverseUrl, { headers: { 'User-Agent': 'bankbud/1.0' } });
      
      if (reverseRes.data && reverseRes.data.address && reverseRes.data.address.postcode) {
        return reverseRes.data.address.postcode;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting zip code for location:', error);
    return null;
  }
}

/**
 * Search Bankrate.com for rates by zip code and account type
 * This searches their comparison tables which aggregate local banks and credit unions
 */
export async function searchBankrateByZip(
  zipCode: string, 
  accountType: 'checking' | 'savings' | 'cd' = 'savings'
): Promise<ZipCodeRate[]> {
  try {
    console.log(`🔍 Searching Bankrate for ${accountType} rates near ${zipCode}`);
    
    // Bankrate URLs with zip code parameter
    const urlMap = {
      savings: `https://www.bankrate.com/banking/savings/rates/?zip=${zipCode}`,
      checking: `https://www.bankrate.com/banking/checking/best-checking-accounts/?zip=${zipCode}`,
      cd: `https://www.bankrate.com/banking/cds/cd-rates/?zip=${zipCode}`
    };
    
    const url = urlMap[accountType];
    const html = await fetchWithScraperApi(url);
    
    const rates: ZipCodeRate[] = [];
    
    // Parse the HTML to extract rate information
    // Bankrate typically shows rates in structured tables
    
    // Pattern 1: Look for bank names and their rates
    // Example: "Lake Michigan Credit Union" followed by "4.25% APY"
    const bankRatePattern = /<td[^>]*class="[^"]*bank-name[^"]*"[^>]*>([^<]+)<\/td>[\s\S]*?(\d+\.?\d*)\s*%\s*(?:APY|apy)/gi;
    
    let match;
    while ((match = bankRatePattern.exec(html)) !== null) {
      const bankName = match[1].trim();
      const apy = parseFloat(match[2]);
      
      if (!isNaN(apy) && apy > 0 && apy < 20) {
        rates.push({
          bankName,
          apy,
          accountType,
          zipCode,
          location: zipCode,
          sourceUrl: url,
          dataSource: 'zip-code-search',
          lastChecked: new Date().toISOString()
        });
      }
    }
    
    // Pattern 2: Alternative table structure with data attributes
    const dataAttrPattern = /data-bank-name="([^"]+)"[\s\S]*?data-apy="(\d+\.?\d*)"/gi;
    
    while ((match = dataAttrPattern.exec(html)) !== null) {
      const bankName = match[1].trim();
      const apy = parseFloat(match[2]);
      
      if (!isNaN(apy) && apy > 0 && apy < 20) {
        rates.push({
          bankName,
          apy,
          accountType,
          zipCode,
          location: zipCode,
          sourceUrl: url,
          dataSource: 'zip-code-search',
          lastChecked: new Date().toISOString()
        });
      }
    }
    
    // Pattern 3: JSON-LD structured data
    const jsonLdPattern = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
    
    while ((match = jsonLdPattern.exec(html)) !== null) {
      try {
        const jsonData = JSON.parse(match[1]);
        if (jsonData && jsonData['@type'] === 'Product' && jsonData.offers) {
          const offers = Array.isArray(jsonData.offers) ? jsonData.offers : [jsonData.offers];
          
          for (const offer of offers) {
            if (offer.price && offer.seller && offer.seller.name) {
              const apy = parseFloat(offer.price);
              if (!isNaN(apy) && apy > 0 && apy < 20) {
                rates.push({
                  bankName: offer.seller.name,
                  apy,
                  accountType,
                  zipCode,
                  location: zipCode,
                  sourceUrl: url,
                  dataSource: 'zip-code-search',
                  lastChecked: new Date().toISOString()
                });
              }
            }
          }
        }
      } catch (e) {
        // Invalid JSON, skip
      }
    }
    
    // Deduplicate by bank name (keep highest rate)
    const uniqueRates = new Map<string, ZipCodeRate>();
    for (const rate of rates) {
      const existing = uniqueRates.get(rate.bankName);
      if (!existing || rate.apy > existing.apy) {
        uniqueRates.set(rate.bankName, rate);
      }
    }
    
    const finalRates = Array.from(uniqueRates.values());
    console.log(`✅ Found ${finalRates.length} rates for ${accountType} near ${zipCode}`);
    
    return finalRates;
    
  } catch (error: any) {
    console.error(`❌ Error searching Bankrate by zip:`, error.message);
    return [];
  }
}

/**
 * Search NerdWallet for rates by zip code and account type
 */
export async function searchNerdWalletByZip(
  zipCode: string,
  accountType: 'checking' | 'savings' | 'cd' = 'savings'
): Promise<ZipCodeRate[]> {
  try {
    console.log(`🔍 Searching NerdWallet for ${accountType} rates near ${zipCode}`);
    
    const urlMap = {
      savings: `https://www.nerdwallet.com/best/banking/savings-accounts?zip=${zipCode}`,
      checking: `https://www.nerdwallet.com/best/banking/checking-accounts?zip=${zipCode}`,
      cd: `https://www.nerdwallet.com/best/banking/cd-rates?zip=${zipCode}`
    };
    
    const url = urlMap[accountType];
    const html = await fetchWithScraperApi(url);
    
    const rates: ZipCodeRate[] = [];
    
    // NerdWallet patterns
    const nwPattern = /<h3[^>]*>([^<]+)<\/h3>[\s\S]{0,500}?(\d+\.?\d*)\s*%\s*(?:APY|apy)/gi;
    
    let match;
    while ((match = nwPattern.exec(html)) !== null) {
      const bankName = match[1].trim();
      const apy = parseFloat(match[2]);
      
      if (!isNaN(apy) && apy > 0 && apy < 20) {
        rates.push({
          bankName,
          apy,
          accountType,
          zipCode,
          location: zipCode,
          sourceUrl: url,
          dataSource: 'zip-code-search',
          lastChecked: new Date().toISOString()
        });
      }
    }
    
    // Deduplicate
    const uniqueRates = new Map<string, ZipCodeRate>();
    for (const rate of rates) {
      const existing = uniqueRates.get(rate.bankName);
      if (!existing || rate.apy > existing.apy) {
        uniqueRates.set(rate.bankName, rate);
      }
    }
    
    const finalRates = Array.from(uniqueRates.values());
    console.log(`✅ Found ${finalRates.length} rates from NerdWallet near ${zipCode}`);
    
    return finalRates;
    
  } catch (error: any) {
    console.error(`❌ Error searching NerdWallet by zip:`, error.message);
    return [];
  }
}

/**
 * Search DepositAccounts.com for Michigan-specific rates
 * This site has good local credit union coverage
 */
export async function searchDepositAccountsByZip(
  zipCode: string,
  accountType: 'checking' | 'savings' | 'cd' = 'savings'
): Promise<ZipCodeRate[]> {
  try {
    console.log(`🔍 Searching DepositAccounts for ${accountType} rates near ${zipCode}`);
    
    const urlMap = {
      savings: `https://www.depositaccounts.com/savings/?zip=${zipCode}`,
      checking: `https://www.depositaccounts.com/checking/?zip=${zipCode}`,
      cd: `https://www.depositaccounts.com/cd/?zip=${zipCode}`
    };
    
    const url = urlMap[accountType];
    const html = await fetchWithScraperApi(url);
    
    const rates: ZipCodeRate[] = [];
    
    // DepositAccounts patterns
    const daPattern = /<a[^>]+class="[^"]*bank-link[^"]*"[^>]*>([^<]+)<\/a>[\s\S]{0,800}?(\d+\.?\d*)\s*%/gi;
    
    let match;
    while ((match = daPattern.exec(html)) !== null) {
      const bankName = match[1].trim();
      const apy = parseFloat(match[2]);
      
      if (!isNaN(apy) && apy > 0 && apy < 20) {
        rates.push({
          bankName,
          apy,
          accountType,
          zipCode,
          location: zipCode,
          sourceUrl: url,
          dataSource: 'zip-code-search',
          lastChecked: new Date().toISOString()
        });
      }
    }
    
    // Deduplicate
    const uniqueRates = new Map<string, ZipCodeRate>();
    for (const rate of rates) {
      const existing = uniqueRates.get(rate.bankName);
      if (!existing || rate.apy > existing.apy) {
        uniqueRates.set(rate.bankName, rate);
      }
    }
    
    const finalRates = Array.from(uniqueRates.values());
    console.log(`✅ Found ${finalRates.length} rates from DepositAccounts near ${zipCode}`);
    
    return finalRates;
    
  } catch (error: any) {
    console.error(`❌ Error searching DepositAccounts by zip:`, error.message);
    return [];
  }
}

/**
 * Combined search across all sources for maximum coverage
 */
export async function searchAllSourcesByZip(
  zipCode: string,
  accountType: 'checking' | 'savings' | 'cd' = 'savings'
): Promise<ZipCodeRate[]> {
  console.log(`\n🚀 Starting comprehensive ${accountType} rate search for ZIP ${zipCode}`);
  
  // Run all searches in parallel
  const [bankrateResults, nerdWalletResults, depositAccountsResults] = await Promise.allSettled([
    searchBankrateByZip(zipCode, accountType),
    searchNerdWalletByZip(zipCode, accountType),
    searchDepositAccountsByZip(zipCode, accountType)
  ]);
  
  // Combine all successful results
  const allRates: ZipCodeRate[] = [];
  
  if (bankrateResults.status === 'fulfilled') {
    allRates.push(...bankrateResults.value);
  }
  if (nerdWalletResults.status === 'fulfilled') {
    allRates.push(...nerdWalletResults.value);
  }
  if (depositAccountsResults.status === 'fulfilled') {
    allRates.push(...depositAccountsResults.value);
  }
  
  // Deduplicate across all sources (keep highest rate for each bank)
  const uniqueRates = new Map<string, ZipCodeRate>();
  for (const rate of allRates) {
    const existing = uniqueRates.get(rate.bankName);
    if (!existing || rate.apy > existing.apy) {
      uniqueRates.set(rate.bankName, rate);
    }
  }
  
  const finalRates = Array.from(uniqueRates.values());
  
  console.log(`\n✅ Total unique rates found: ${finalRates.length}`);
  console.log(`   - Bankrate: ${bankrateResults.status === 'fulfilled' ? bankrateResults.value.length : 0}`);
  console.log(`   - NerdWallet: ${nerdWalletResults.status === 'fulfilled' ? nerdWalletResults.value.length : 0}`);
  console.log(`   - DepositAccounts: ${depositAccountsResults.status === 'fulfilled' ? depositAccountsResults.value.length : 0}`);
  
  // Filter for Michigan banks/credit unions
  const michiganRates = finalRates.filter(rate => 
    rate.bankName.toLowerCase().includes('michigan') ||
    rate.bankName.toLowerCase().includes('credit union') ||
    rate.bankName.toLowerCase().includes('lake michigan') ||
    rate.bankName.toLowerCase().includes('msgcu') ||
    rate.bankName.toLowerCase().includes('genisys') ||
    rate.bankName.toLowerCase().includes('community choice')
  );
  
  console.log(`   - Michigan-specific: ${michiganRates.length}`);
  
  return finalRates.sort((a, b) => b.apy - a.apy); // Sort by highest rate first
}

/**
 * Search by location name (e.g., "Bloomfield Hills, MI")
 * Converts location to zip code first, then searches
 */
export async function searchByLocation(
  location: string,
  accountType: 'checking' | 'savings' | 'cd' = 'savings'
): Promise<ZipCodeRate[]> {
  console.log(`📍 Converting location "${location}" to zip code...`);
  
  const zipCode = await getZipCodeForLocation(location);
  
  if (!zipCode) {
    console.error(`❌ Could not find zip code for location: ${location}`);
    return [];
  }
  
  console.log(`✅ Found zip code: ${zipCode} for ${location}`);
  
  return searchAllSourcesByZip(zipCode, accountType);
}
