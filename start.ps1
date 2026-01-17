# BankBud - Quick Start Script

Write-Host "🏦 BankBud Setup" -ForegroundColor Cyan
Write-Host "===============`n" -ForegroundColor Cyan

# Check if MongoDB is running
Write-Host "Checking MongoDB status..." -ForegroundColor Yellow

$mongoRunning = $false
try {
    $null = Test-NetConnection -ComputerName localhost -Port 27017 -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
    if ($?) {
        $mongoRunning = $true
        Write-Host "✅ MongoDB is running on port 27017`n" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  MongoDB is not running locally`n" -ForegroundColor Yellow
}

if (-not $mongoRunning) {
    Write-Host "MongoDB Options:" -ForegroundColor Cyan
    Write-Host "  1. Use MongoDB Atlas (cloud - no installation needed)" -ForegroundColor White
    Write-Host "  2. Install MongoDB locally" -ForegroundColor White
    Write-Host "  3. Use Docker: docker run -d -p 27017:27017 --name bankbud-mongo mongo`n" -ForegroundColor White
    
    Write-Host "For detailed instructions, see SETUP.md`n" -ForegroundColor Yellow
    
    $choice = Read-Host "Do you have a MongoDB connection string? (y/n)"
    
    if ($choice -eq 'y') {
        $connectionString = Read-Host "Enter your MongoDB connection string"
        
        # Update .env file
        $envPath = "server\.env"
        if (Test-Path $envPath) {
            $content = Get-Content $envPath -Raw
            $content = $content -replace 'MONGODB_URI=.*', "MONGODB_URI=$connectionString"
            Set-Content -Path $envPath -Value $content
            Write-Host "✅ Updated connection string in server\.env`n" -ForegroundColor Green
        }
    } else {
        Write-Host "`n⚠️  You'll need to set up MongoDB before running the app." -ForegroundColor Yellow
        Write-Host "See SETUP.md for instructions.`n" -ForegroundColor Yellow
        exit
    }
}

# Check if dependencies are installed
Write-Host "Checking dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies...`n" -ForegroundColor Yellow
    npm install
} else {
    Write-Host "✅ Dependencies already installed`n" -ForegroundColor Green
}

# Ask about seeding
Write-Host "Would you like to seed the database with sample data? (y/n)" -ForegroundColor Cyan
$seed = Read-Host

if ($seed -eq 'y') {
    Write-Host "`nSeeding database..." -ForegroundColor Yellow
    Set-Location server
    npm run seed
    Set-Location ..
}

# Start the app
Write-Host "`n🚀 Starting BankBud..." -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "   Backend:  http://localhost:3001`n" -ForegroundColor Green

npm run dev
