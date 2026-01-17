# BankBud Status Checker

Write-Host "`n🏦 BankBud Status Check" -ForegroundColor Cyan
Write-Host "======================`n" -ForegroundColor Cyan

$allGood = $true

# Check Node.js
Write-Host "Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed" -ForegroundColor Red
    $allGood = $false
}

# Check npm
Write-Host "Checking npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "✅ npm: v$npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm is not installed" -ForegroundColor Red
    $allGood = $false
}

# Check dependencies
Write-Host "Checking dependencies..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "✅ Root dependencies installed" -ForegroundColor Green
} else {
    Write-Host "⚠️  Root dependencies not installed (run: npm install)" -ForegroundColor Yellow
    $allGood = $false
}

if (Test-Path "client/node_modules") {
    Write-Host "✅ Client dependencies installed" -ForegroundColor Green
} else {
    Write-Host "⚠️  Client dependencies not installed" -ForegroundColor Yellow
}

if (Test-Path "server/node_modules") {
    Write-Host "✅ Server dependencies installed" -ForegroundColor Green
} else {
    Write-Host "⚠️  Server dependencies not installed" -ForegroundColor Yellow
}

# Check .env file
Write-Host "Checking configuration..." -ForegroundColor Yellow
if (Test-Path "server/.env") {
    Write-Host "✅ server/.env file exists" -ForegroundColor Green
    
    $envContent = Get-Content "server/.env" -Raw
    if ($envContent -match 'MONGODB_URI=mongodb://localhost:27017/bankbud') {
        Write-Host "   Using local MongoDB" -ForegroundColor Gray
    } elseif ($envContent -match 'MONGODB_URI=') {
        Write-Host "   Using custom MongoDB connection" -ForegroundColor Gray
    }
} else {
    Write-Host "⚠️  server/.env file not found (will use defaults)" -ForegroundColor Yellow
}

# Check MongoDB
Write-Host "Checking MongoDB..." -ForegroundColor Yellow
try {
    $mongoTest = Test-NetConnection -ComputerName localhost -Port 27017 -WarningAction SilentlyContinue -ErrorAction SilentlyContinue -InformationLevel Quiet
    if ($mongoTest) {
        Write-Host "✅ MongoDB is accessible on localhost:27017" -ForegroundColor Green
    } else {
        Write-Host "⚠️  MongoDB is not running on localhost:27017" -ForegroundColor Yellow
        Write-Host "   Options:" -ForegroundColor Gray
        Write-Host "   - Use MongoDB Atlas (cloud)" -ForegroundColor Gray
        Write-Host "   - Install MongoDB locally" -ForegroundColor Gray
        Write-Host "   - Use Docker: docker run -d -p 27017:27017 mongo" -ForegroundColor Gray
    }
} catch {
    Write-Host "⚠️  Could not check MongoDB status" -ForegroundColor Yellow
}

# Project structure
Write-Host "`nProject Structure:" -ForegroundColor Cyan
$folders = @("client/src", "client/src/pages", "client/src/components", "server/src", "server/src/models", "server/src/routes")
foreach ($folder in $folders) {
    if (Test-Path $folder) {
        Write-Host "✅ $folder" -ForegroundColor Green
    } else {
        Write-Host "❌ $folder missing" -ForegroundColor Red
        $allGood = $false
    }
}

# Summary
Write-Host "`n" -NoNewline
if ($allGood) {
    Write-Host "✅ Everything looks good!" -ForegroundColor Green
    Write-Host "`nTo start the app:" -ForegroundColor Cyan
    Write-Host "  npm run dev`n" -ForegroundColor White
} else {
    Write-Host "⚠️  Some setup steps are needed" -ForegroundColor Yellow
    Write-Host "`nNext steps:" -ForegroundColor Cyan
    Write-Host "  1. Run: npm install" -ForegroundColor White
    Write-Host "  2. Set up MongoDB (see SETUP.md)" -ForegroundColor White
    Write-Host "  3. Run: cd server && npm run seed" -ForegroundColor White
    Write-Host "  4. Run: npm run dev`n" -ForegroundColor White
}

Write-Host "For detailed setup instructions, see SETUP.md" -ForegroundColor Gray
Write-Host ""
