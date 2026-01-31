# Test Zip Code Rate Search

# Test 1: Search by zip code (Bloomfield Hills)
Write-Host "`n🔍 Test 1: Searching savings rates for Bloomfield Hills, MI (48302)..." -ForegroundColor Cyan

$body1 = @{
    zipCode = "48302"
    accountType = "savings"
} | ConvertTo-Json

$response1 = Invoke-RestMethod -Uri "http://localhost:3001/api/scraper/search-by-zip" -Method POST -Body $body1 -ContentType "application/json"

Write-Host "Found $($response1.rates.Count) savings rates" -ForegroundColor Green
$response1.rates | Select-Object -First 5 | ForEach-Object {
    Write-Host "  - $($_.bankName): $($_.apy)% APY" -ForegroundColor Yellow
}

# Test 2: Search by location name
Write-Host "`n📍 Test 2: Searching CD rates for Ann Arbor, MI..." -ForegroundColor Cyan

$body2 = @{
    location = "Ann Arbor, MI"
    accountType = "cd"
} | ConvertTo-Json

$response2 = Invoke-RestMethod -Uri "http://localhost:3001/api/scraper/search-by-location" -Method POST -Body $body2 -ContentType "application/json"

Write-Host "Found $($response2.rates.Count) CD rates in $($response2.location) (ZIP: $($response2.zipCode))" -ForegroundColor Green
$response2.rates | Select-Object -First 5 | ForEach-Object {
    Write-Host "  - $($_.bankName): $($_.apy)% APY" -ForegroundColor Yellow
}

# Test 3: Search checking accounts
Write-Host "`n💳 Test 3: Searching checking rates for Troy, MI..." -ForegroundColor Cyan

$body3 = @{
    location = "Troy, MI"
    accountType = "checking"
} | ConvertTo-Json

$response3 = Invoke-RestMethod -Uri "http://localhost:3001/api/scraper/search-by-location" -Method POST -Body $body3 -ContentType "application/json"

Write-Host "Found $($response3.rates.Count) checking rates in $($response3.location) (ZIP: $($response3.zipCode))" -ForegroundColor Green
$response3.rates | Select-Object -First 5 | ForEach-Object {
    Write-Host "  - $($_.bankName): $($_.apy)% APY" -ForegroundColor Yellow
}

Write-Host "`n✅ All tests complete!" -ForegroundColor Green
