import axios from 'axios';

interface BankInfo {
  name: string;
  type: 'bank' | 'credit-union';
  serviceModel: 'online' | 'branch' | 'hybrid';
  phone: string;
}

const banks: BankInfo[] = [
  // Michigan Branch Banks
  { name: "Flagstar Bank", type: "bank", serviceModel: "branch", phone: "1-800-968-7700" },
  { name: "Key Bank", type: "bank", serviceModel: "branch", phone: "1-800-539-2968" },
  { name: "Huntington Bank", type: "bank", serviceModel: "branch", phone: "1-800-480-2265" },
  { name: "First Merchants Bank", type: "bank", serviceModel: "branch", phone: "1-800-205-3464" },
  { name: "Citizens State Bank", type: "bank", serviceModel: "branch", phone: "1-989-723-2161" },
  { name: "Comerica Bank", type: "bank", serviceModel: "branch", phone: "1-800-925-2160" },
  
  // Michigan Credit Unions
  { name: "Michigan Schools and Government Credit Union", type: "credit-union", serviceModel: "branch", phone: "1-866-674-2848" },
  { name: "Lake Michigan Credit Union", type: "credit-union", serviceModel: "branch", phone: "1-616-242-9790" },
  
  // National Branch Banks
  { name: "Citizens Bank", type: "bank", serviceModel: "branch", phone: "1-800-922-9999" },
  { name: "Chase Bank", type: "bank", serviceModel: "branch", phone: "1-800-935-9935" },
  { name: "Bank of America", type: "bank", serviceModel: "branch", phone: "1-800-432-1000" },
  
  // Online-Only Banks
  { name: "American Express National Bank", type: "bank", serviceModel: "online", phone: "1-800-446-6307" },
  { name: "Ally Bank", type: "bank", serviceModel: "online", phone: "1-877-247-2559" },
  { name: "CIT Bank", type: "bank", serviceModel: "online", phone: "1-855-462-2652" },
  { name: "Marcus by Goldman Sachs", type: "bank", serviceModel: "online", phone: "1-844-627-2871" },
  { name: "Discover Bank", type: "bank", serviceModel: "online", phone: "1-800-347-7000" },
  { name: "Capital One 360", type: "bank", serviceModel: "online", phone: "1-877-383-4802" },
  { name: "Synchrony Bank", type: "bank", serviceModel: "online", phone: "1-866-226-5638" }
];

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
  for (const bankInfo of banks) {
    try {
      const rate = await (await import('./perplexityService.js')).searchBankRatesWithPerplexity({ bankName: bankInfo.name, accountType, zipCode });
      const rateData = rate[0] || null;
      
      // Add bank metadata to the result
      if (rateData) {
        rateData.phone = bankInfo.phone;
        rateData.institutionType = bankInfo.type;
        rateData.serviceModel = bankInfo.serviceModel;
      }
      
      results.push({ 
        bankName: bankInfo.name, 
        type: bankInfo.type,
        serviceModel: bankInfo.serviceModel,
        phone: bankInfo.phone,
        rate: rateData, 
        branchAddress: null, 
        distanceKm: null 
      });
      console.log(`Searched ${bankInfo.name}: ${rateData ? 'Found data' : 'No data found'}`);
    } catch (err) {
      console.error(`Error searching ${bankInfo.name}:`, err);
      results.push({ 
        bankName: bankInfo.name,
        type: bankInfo.type,
        serviceModel: bankInfo.serviceModel,
        phone: bankInfo.phone,
        rate: { 
          bankName: bankInfo.name, 
          phone: bankInfo.phone,
          institutionType: bankInfo.type,
          serviceModel: bankInfo.serviceModel,
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
