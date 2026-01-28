import axios from 'axios';

interface BankInfo {
  name: string;
  type: 'bank' | 'credit-union';
  serviceModel: 'online' | 'branch' | 'hybrid';
  phone: string;
  mainBranch?: {
    address: string;
    city: string;
    state: string;
    zip: string;
    lat: number;
    lon: number;
  };
}

const banks: BankInfo[] = [
  // Michigan Branch Banks
  { 
    name: "Flagstar Bank", 
    type: "bank", 
    serviceModel: "branch", 
    phone: "1-800-968-7700",
    mainBranch: { address: "5151 Corporate Dr", city: "Troy", state: "MI", zip: "48098", lat: 42.5633, lon: -83.1458 }
  },
  { 
    name: "Key Bank", 
    type: "bank", 
    serviceModel: "branch", 
    phone: "1-800-539-2968",
    mainBranch: { address: "127 Public Square", city: "Cleveland", state: "OH", zip: "44114", lat: 41.5012, lon: -81.6937 }
  },
  { 
    name: "Huntington Bank", 
    type: "bank", 
    serviceModel: "branch", 
    phone: "1-800-480-2265",
    mainBranch: { address: "41 S High St", city: "Columbus", state: "OH", zip: "43215", lat: 39.9612, lon: -82.9988 }
  },
  { 
    name: "First Merchants Bank", 
    type: "bank", 
    serviceModel: "branch", 
    phone: "1-800-205-3464",
    mainBranch: { address: "200 E Jackson St", city: "Muncie", state: "IN", zip: "47305", lat: 40.1934, lon: -85.3863 }
  },
  { 
    name: "Citizens State Bank", 
    type: "bank", 
    serviceModel: "branch", 
    phone: "1-989-723-2161",
    mainBranch: { address: "320 N McEwan St", city: "Clare", state: "MI", zip: "48617", lat: 43.8197, lon: -84.7697 }
  },
  { 
    name: "Comerica Bank", 
    type: "bank", 
    serviceModel: "branch", 
    phone: "1-800-925-2160",
    mainBranch: { address: "1717 Main St", city: "Dallas", state: "TX", zip: "75201", lat: 32.7817, lon: -96.7979 }
  },
  
  // Michigan Credit Unions
  { 
    name: "Michigan Schools and Government Credit Union", 
    type: "credit-union", 
    serviceModel: "branch", 
    phone: "1-866-674-2848",
    mainBranch: { address: "3777 West Road", city: "East Lansing", state: "MI", zip: "48823", lat: 42.7533, lon: -84.5120 }
  },
  { 
    name: "Lake Michigan Credit Union", 
    type: "credit-union", 
    serviceModel: "branch", 
    phone: "1-616-242-9790",
    mainBranch: { address: "525 Leonard St NW", city: "Grand Rapids", state: "MI", zip: "49504", lat: 42.9817, lon: -85.6742 }
  },
  { 
    name: "Community Choice Credit Union", 
    type: "credit-union", 
    serviceModel: "branch", 
    phone: "1-734-523-2900",
    mainBranch: { address: "39500 High Pointe Blvd", city: "Novi", state: "MI", zip: "48375", lat: 42.4862, lon: -83.4755 }
  },
  { 
    name: "Genisys Credit Union", 
    type: "credit-union", 
    serviceModel: "branch", 
    phone: "1-248-322-9800",
    mainBranch: { address: "27000 Dequindre Rd", city: "Auburn Hills", state: "MI", zip: "48326", lat: 42.6536, lon: -83.1730 }
  },
  { 
    name: "Chief Financial Credit Union", 
    type: "credit-union", 
    serviceModel: "branch", 
    phone: "1-888-288-4328",
    mainBranch: { address: "3901 Research Park Dr", city: "Ann Arbor", state: "MI", zip: "48108", lat: 42.3009, lon: -83.7054 }
  },
  
  // National Branch Banks
  { 
    name: "Citizens Bank", 
    type: "bank", 
    serviceModel: "branch", 
    phone: "1-800-922-9999",
    mainBranch: { address: "1 Citizens Plaza", city: "Providence", state: "RI", zip: "02903", lat: 41.8240, lon: -71.4128 }
  },
  { 
    name: "Chase Bank", 
    type: "bank", 
    serviceModel: "branch", 
    phone: "1-800-935-9935",
    mainBranch: { address: "383 Madison Ave", city: "New York", state: "NY", zip: "10179", lat: 40.7580, lon: -73.9855 }
  },
  { 
    name: "Bank of America", 
    type: "bank", 
    serviceModel: "branch", 
    phone: "1-800-432-1000",
    mainBranch: { address: "100 N Tryon St", city: "Charlotte", state: "NC", zip: "28255", lat: 35.2271, lon: -80.8431 }
  },
  
  // Online-Only Banks (no physical branches)
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

// Reverse geocode: convert lat/lon to zip code
export async function reverseGeocodeToZip(lat: number, lon: number): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`;
    const res = await axios.get(url, { 
      headers: { 'User-Agent': 'bankbud/1.0' },
      timeout: 5000
    });
    
    if (res.data && res.data.address) {
      const zipCode = res.data.address.postcode;
      if (zipCode) {
        console.log(`✓ Reverse geocoded (${lat}, ${lon}) to zip: ${zipCode}`);
        return zipCode;
      }
    }
    return null;
  } catch (err) {
    console.error('Reverse geocoding error:', err);
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
export async function searchRatesAndDistancesForBanks(accountType = "savings", zipCode = "", userLat?: number, userLon?: number) {
  const results = [];
  
  // If user provided lat/lon, use that. Otherwise geocode the zip.
  let userCoords: { lat: number, lon: number } | null = null;
  let detectedZip = zipCode;
  
  if (userLat !== undefined && userLon !== undefined) {
    userCoords = { lat: userLat, lon: userLon };
    
    // If no zip code provided but we have coords, reverse geocode to get zip
    if (!detectedZip) {
      console.log('🌍 Reverse geocoding coordinates to zip code...');
      const reverseZip = await reverseGeocodeToZip(userLat, userLon);
      if (reverseZip) {
        detectedZip = reverseZip;
        console.log(`✓ Using detected zip code: ${detectedZip}`);
      }
    }
  } else if (zipCode) {
    userCoords = await geocodeZip(zipCode);
  }
  
  // Process banks in parallel batches of 4 to speed up the process
  const BATCH_SIZE = 4;
  const perplexityService = await import('./perplexityService.js');
  
  for (let i = 0; i < banks.length; i += BATCH_SIZE) {
    const batch = banks.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(banks.length / BATCH_SIZE)}`);
    
    // Process this batch in parallel
    const batchPromises = batch.map(async (bankInfo) => {
      try {
        const rate = await perplexityService.searchBankRatesWithPerplexity({ 
          bankName: bankInfo.name, 
          accountType, 
          zipCode: detectedZip // Use the detected or provided zip code
        });
        const rateData = rate[0] || null;
        
        // Add bank metadata to the result
        if (rateData) {
          rateData.phone = bankInfo.phone;
          rateData.institutionType = bankInfo.type;
          rateData.serviceModel = bankInfo.serviceModel;
        }
        
        // Calculate distance if we have user coords and bank has a branch
        let distanceKm: number | null = null;
        let branchInfo: string | null = null;
        if (userCoords && bankInfo.mainBranch) {
          distanceKm = haversineDistance(
            userCoords.lat, 
            userCoords.lon, 
            bankInfo.mainBranch.lat, 
            bankInfo.mainBranch.lon
          );
          branchInfo = `${bankInfo.mainBranch.address}, ${bankInfo.mainBranch.city}, ${bankInfo.mainBranch.state} ${bankInfo.mainBranch.zip}`;
        }
        
        console.log(`✓ ${bankInfo.name}: ${rateData ? 'Found data' : 'No data found'}${distanceKm ? ` (${distanceKm.toFixed(1)} km away)` : ''}`);
        
        return { 
          bankName: bankInfo.name, 
          type: bankInfo.type,
          serviceModel: bankInfo.serviceModel,
          phone: bankInfo.phone,
          rate: rateData, 
          branchAddress: branchInfo, 
          distanceKm: distanceKm 
        };
      } catch (err) {
        console.error(`✗ Error searching ${bankInfo.name}:`, err);
        return { 
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
        };
      }
    });
    
    // Wait for the entire batch to complete
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Small delay between batches to avoid rate limiting (reduced from 500ms per bank to 200ms per batch)
    if (i + BATCH_SIZE < banks.length) {
      await new Promise(res => setTimeout(res, 200));
    }
  }
  
  console.log(`Completed search for ${results.length} banks in parallel batches`);
  return results;
}
