# Zip Code Rate Search Feature

## Overview
New feature that searches for bank rates by zip code across multiple aggregator sites (Bankrate, NerdWallet, DepositAccounts). This helps find local Michigan banks and credit unions with their current rates.

## How It Works

The scraper searches three major banking rate aggregator sites:
1. **Bankrate.com** - Comprehensive rate database with zip code filtering
2. **NerdWallet.com** - Consumer-focused rate comparisons
3. **DepositAccounts.com** - Good local credit union coverage

For each site, it:
- Uses ScraperAPI to bypass anti-bot protection
- Searches with your specific zip code
- Extracts bank names and APY rates from HTML
- Filters for Michigan banks and credit unions
- Deduplicates and sorts by highest rate

## API Endpoints

### 1. Search by Zip Code
```http
POST /api/scraper/search-by-zip
Content-Type: application/json

{
  "zipCode": "48302",
  "accountType": "savings"  // or "checking", "cd"
}
```

**Response:**
```json
{
  "message": "Found 15 savings rates near 48302",
  "zipCode": "48302",
  "accountType": "savings",
  "rates": [
    {
      "bankName": "Lake Michigan Credit Union",
      "apy": 4.25,
      "accountType": "savings",
      "zipCode": "48302",
      "location": "48302",
      "sourceUrl": "https://www.bankrate.com/banking/savings/rates/?zip=48302",
      "dataSource": "zip-code-search",
      "lastChecked": "2026-01-30T19:00:00.000Z"
    }
  ]
}
```

### 2. Search by Location Name
```http
POST /api/scraper/search-by-location
Content-Type: application/json

{
  "location": "Bloomfield Hills, MI",
  "accountType": "savings"
}
```

This endpoint:
1. Converts location name to zip code using geocoding
2. Then searches using that zip code
3. Returns rates with both location and zip code info

**Response:**
```json
{
  "message": "Found 15 savings rates in Bloomfield Hills, MI",
  "location": "Bloomfield Hills, MI",
  "zipCode": "48302",
  "accountType": "savings",
  "rates": [...]
}
```

## Account Types Supported
- `savings` - Savings accounts and high-yield savings
- `checking` - Checking accounts
- `cd` - Certificates of deposit

## Example Usage

### PowerShell
```powershell
# Search by zip code
$body = @{
    zipCode = "48302"
    accountType = "savings"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/scraper/search-by-zip" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"

# Search by location
$body2 = @{
    location = "Ann Arbor, MI"
    accountType = "cd"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/scraper/search-by-location" `
    -Method POST `
    -Body $body2 `
    -ContentType "application/json"
```

### JavaScript/Frontend
```javascript
// Search by zip code
const searchByZip = async (zipCode, accountType) => {
  const response = await fetch('https://your-backend.onrender.com/api/scraper/search-by-zip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ zipCode, accountType })
  });
  return response.json();
};

// Example: Search for savings rates in Bloomfield Hills
const rates = await searchByZip('48302', 'savings');
console.log(`Found ${rates.rates.length} rates`);
rates.rates.forEach(rate => {
  console.log(`${rate.bankName}: ${rate.apy}% APY`);
});
```

## Integration Ideas

### 1. Add to Compare Page
Add a "Search by Zip Code" button that lets users find local rates:

```jsx
const [zipCode, setZipCode] = useState('');
const [searchResults, setSearchResults] = useState([]);

const handleZipSearch = async () => {
  const response = await fetch('/api/scraper/search-by-zip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      zipCode, 
      accountType: selectedAccountType 
    })
  });
  const data = await response.json();
  setSearchResults(data.rates);
};

// Display alongside existing rates
```

### 2. Location-Based Filter
Use user's current location to automatically find nearby banks:

```jsx
const getUserLocation = () => {
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(async (position) => {
      // Reverse geocode to get zip code
      const { latitude, longitude } = position.coords;
      // Then search with that zip
    });
  }
};
```

### 3. Enhanced Dashboard
Show personalized rate suggestions based on user's location:

```jsx
// On Dashboard load
useEffect(() => {
  const userZip = localStorage.getItem('userZipCode');
  if (userZip) {
    // Automatically fetch local rates
    searchByZip(userZip, 'savings').then(rates => {
      // Show "Better rates near you" section
    });
  }
}, []);
```

## Michigan Banks Prioritized

The search automatically highlights Michigan-specific banks and credit unions:
- Lake Michigan Credit Union
- Michigan Schools and Government Credit Union (MSGCU)
- Community Choice Credit Union
- Genisys Credit Union
- Flagstar Bank
- Citizens State Bank

## Rate Data Quality

**Pros:**
- ✅ Real-time data from aggregator sites
- ✅ Multiple sources for verification
- ✅ Zip code-specific results
- ✅ Good Michigan credit union coverage

**Cons:**
- ⚠️ HTML parsing can break if sites change layout
- ⚠️ Rate data may lag behind actual bank websites
- ⚠️ ScraperAPI credits are consumed per search (monitor usage)
- ⚠️ Not all local banks may be listed on aggregators

## Performance

- **Search Time:** 10-30 seconds (3 sites searched in parallel)
- **API Costs:** 3 ScraperAPI credits per search (1 per source)
- **Rate Limit:** Depends on your ScraperAPI plan
  - Free tier: 1,000 requests/month = ~333 searches
  - Hobby: 100,000 requests/month = ~33,333 searches

## Monitoring

Check server logs to see search results:
```
🔍 Searching Bankrate for savings rates near 48302
✅ Found 12 rates for savings near 48302
🔍 Searching NerdWallet for savings rates near 48302
✅ Found 8 rates from NerdWallet near 48302
🔍 Searching DepositAccounts for savings rates near 48302
✅ Found 5 rates from DepositAccounts near 48302

✅ Total unique rates found: 18
   - Bankrate: 12
   - NerdWallet: 8
   - DepositAccounts: 5
   - Michigan-specific: 6
```

## Error Handling

The service handles errors gracefully:
- If one source fails, others continue
- Returns empty array if all sources fail
- Logs detailed error messages for debugging

## Future Enhancements

1. **Cache Results** - Store zip code searches for 24 hours
2. **Distance Calculation** - Show how far each bank is from zip code
3. **Historical Tracking** - Track rate changes over time
4. **Email Alerts** - Notify when rates change in user's zip code
5. **Map View** - Visual map of banks with rates
6. **Branch Locator** - Find nearest branch for each bank

## Testing

Use the included test script:
```powershell
.\test-zip-search.ps1
```

This tests:
1. Savings rates for Bloomfield Hills (48302)
2. CD rates for Ann Arbor
3. Checking rates for Troy

## Deployment

### Environment Variables
Make sure ScraperAPI key is set:
```
SCRAPER_API_KEY=your_scraperapi_key_here
```

### Render Deployment
The feature is automatically deployed with your backend. No additional configuration needed.

### Testing in Production
```javascript
fetch('https://your-backend.onrender.com/api/scraper/search-by-zip', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ zipCode: '48302', accountType: 'savings' })
})
.then(r => r.json())
.then(data => console.log(data));
```

## Troubleshooting

### No Rates Found
- Check if zip code is valid
- Try different account type
- Check ScraperAPI credit balance
- Look at server logs for parsing errors

### Slow Response
- Normal for first search (cold start)
- Can take 30+ seconds for all 3 sources
- Consider adding loading indicator in UI

### ScraperAPI Errors
- Check API key is correct
- Verify credit balance
- Check for rate limiting

## Credits

Uses the following services:
- **ScraperAPI** - Web scraping with anti-bot bypass
- **OpenStreetMap Nominatim** - Geocoding (location to zip code)
- **Bankrate, NerdWallet, DepositAccounts** - Rate data sources
