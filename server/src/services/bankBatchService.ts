import axios from 'axios';

const banks = [
  "Key Bank",
  "Fifth Third Bank",
  "Michigan Schools and Government Credit Union",
  "Flagstar Bank",
  "Huntington Bank",
  "First Merchants Bank",
  "Citizens Bank",
  "Comerica Bank"
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

// Batch search for rates and distances
export async function searchRatesAndDistancesForBanks(accountType = "savings", zipCode = "48304") {
  const userLoc = await geocodeZip(zipCode);
  const results = [];
  for (const bankName of banks) {
    const rate = await (await import('./perplexityService.js')).searchBankRatesWithPerplexity({ bankName, accountType, zipCode });
    let branchAddress = await getNearestBranchAddress(bankName, zipCode);
    let branchLoc = null;
    let distanceKm = null;
    if (branchAddress) {
      // Geocode the branch address
      try {
        const geo = await axios.get(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(branchAddress)}&country=USA&format=json&limit=1`, { headers: { 'User-Agent': 'bankbud/1.0' } });
        if (geo.data && geo.data.length > 0) {
          branchLoc = { lat: parseFloat(geo.data[0].lat), lon: parseFloat(geo.data[0].lon) };
        }
      } catch (err) {
        console.error('Branch geocoding error:', err);
      }
    }
    if (userLoc && branchLoc) {
      distanceKm = haversineDistance(userLoc.lat, userLoc.lon, branchLoc.lat, branchLoc.lon);
    }
    results.push({ bankName, rate: rate[0] || null, branchAddress, distanceKm });
    await new Promise(res => setTimeout(res, 1000)); // avoid rate limits
  }
  return results;
}
