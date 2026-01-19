import axios from 'axios';

const banks = [
  "Flagstar Bank",
  "Key Bank",
  "Huntington Bank",
  "First Merchants Bank",
  "Michigan Schools and Government Credit Union",
  "Lake Michigan Credit Union",
  "Citizens Bank",
  "Chase Bank",
  "Bank of America",
  "Comerica Bank",
  "Citizens State Bank"
];

const bankPhones: { [key: string]: string } = {
  "Flagstar Bank": "1-800-968-7700",
  "Key Bank": "1-800-539-2968",
  "Huntington Bank": "1-800-480-2265",
  "First Merchants Bank": "1-800-205-3464",
  "Michigan Schools and Government Credit Union": "1-866-674-2848",
  "Lake Michigan Credit Union": "1-616-242-9790",
  "Citizens Bank": "1-800-922-9999",
  "Chase Bank": "1-800-935-9935",
  "Bank of America": "1-800-432-1000",
  "Comerica Bank": "1-800-925-2160",
  "Citizens State Bank": "1-989-723-2161"
};

// Helper to get lat/lng for a zip code using OpenStreetMap Nominatim
export async function geocodeZip(zipCode: string): Promise<{ lat: number, lon: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?postalcode=${zipCode}&country=USA&format=json&limit=1`;
    const res = await axios.get(url, { headers: { 'User-Agent': 'bankbud/1.0' } });
    if (res.data && res.data.length > 0) {
      return { lat: parseFloat(res.data[0].lat), lon: parseFloat(res.data[0].lon) };
    }
    return null;
  } catch (err) {
    console.error('Geocoding error:', err);
    return null;
  }
}

// Helper to get distance between two lat/lng points (Haversine formula)
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Use Perplexity to get the nearest branch address for a bank and zip
export async function getNearestBranchAddress(bankName: string, zipCode: string): Promise<string | null> {
  // You could use Perplexity or a real Places API for this
  // For now, use Perplexity to get the address as a string
  // (In production, use Google Places or similar for reliability)
  const prompt = `What is the address of the nearest ${bankName} branch to zip code ${zipCode} in the USA? Just give the address.`;
  try {
    const { searchBankRatesWithPerplexity } = await import('./perplexityService.js');
    const result = await searchBankRatesWithPerplexity({ bankName, accountType: "branch", zipCode });
    if (result && result[0] && typeof result[0] === 'string') {
      return result[0];
    }
    return null;
  } catch (err) {
    console.error('Perplexity branch address error:', err);
    return null;
  }
}

// Batch search for rates and distances (simplified without branch search to avoid timeout)
export async function searchRatesAndDistancesForBanks(accountType = "savings", zipCode = "") {
  const results = [];
  for (const bankName of banks) {
    try {
      const rate = await (await import('./perplexityService.js')).searchBankRatesWithPerplexity({ bankName, accountType, zipCode });
      const rateData = rate[0] || null;
      
      // Add phone number to the result
      if (rateData) {
        rateData.phone = bankPhones[bankName] || '';
      }
      
      results.push({ bankName, rate: rateData, branchAddress: null, distanceKm: null });
      console.log(`Searched ${bankName}: ${rateData ? 'Found data' : 'No data found'}`);
    } catch (err) {
      console.error(`Error searching ${bankName}:`, err);
      results.push({ 
        bankName, 
        rate: { 
          bankName, 
          phone: bankPhones[bankName] || '', 
          rateInfo: 'Unable to retrieve rate information. Please call for current rates.',
          apy: null 
        }, 
        branchAddress: null, 
        distanceKm: null 
      });
    }
    await new Promise(res => setTimeout(res, 500)); // reduce delay to 500ms
  }
  return results;
}
