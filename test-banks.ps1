$banks = @(
    "KeyBank",
    "Huntington",
    "Fifth Third",
    "Flagstar",
    "Bank of America",
    "Chase",
    "First Merchants",
    "Citizens",
    "Comerica"
)

$zipCode = "90210"
$accountType = "savings"
$endpoint = "https://bankbud.onrender.com/api/scraper/ai-search-bank"

foreach ($bank in $banks) {
    Write-Host "Testing $bank..."
    $body = @{
        bankName = $bank
        zipCode = $zipCode
        accountType = $accountType
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri $endpoint `
        -Method POST `
        -ContentType "application/json" `
        -Body $body

    Write-Host ("Response for {0}:`n{1}`n" -f $bank, $response.Content)
}
