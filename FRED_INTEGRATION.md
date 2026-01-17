# FRED API Integration

This app uses the Federal Reserve Economic Data (FRED) API to provide national benchmark rates alongside scraped and community-submitted rates.

## Getting Your Free FRED API Key

1. **Go to FRED website**: https://fred.stlouisfed.org/
2. **Create an account**: Click "My Account" → "Sign up"
3. **Request API key**: 
   - Go to https://fred.stlouisfed.org/docs/api/api_key.html
   - Click "Request API Key"
   - Fill out the simple form (takes 1 minute)
4. **Copy your API key**: You'll receive it instantly

## Adding the API Key to Your App

1. Open `server/.env`
2. Replace `demo` with your actual API key:
   ```
   FRED_API_KEY=your_actual_api_key_here
   ```
3. Restart the server

## What Data We Get from FRED

The FRED API provides national average rates for:
- **Savings accounts** - National average savings rate
- **Interest checking** - Average interest-bearing checking rate
- **Money market accounts** - Money market fund rates
- **12-month CDs** - Certificate of deposit rates
- **6-month CDs** - Short-term CD rates

## How It's Used in the App

1. **Benchmark Display**: Shows users the national averages on the Compare page
2. **Data Validation**: Helps verify that community-submitted rates are reasonable
3. **Rate Comparison**: Users can see how bank rates compare to national averages

## API Limits

- **Free tier**: 120 requests per minute
- **Daily limit**: Essentially unlimited for our use case
- **Cost**: Completely free forever

## FRED Series IDs We Use

| Series ID | Description |
|-----------|-------------|
| SAVINGS | National Rate on Savings Deposits |
| INTCKN | Interest Rate on Interest-Bearing Checking Accounts |
| MMMFRATE | Money Market Mutual Fund Rate |
| CD12N | 12-Month Certificate of Deposit Rate |
| CD6N | 6-Month Certificate of Deposit Rate |

## Three-Pronged Rate Strategy

Your app now uses three complementary sources:

1. **FRED API** (Federal Reserve)
   - National benchmark averages
   - Official government data
   - Used for validation and context

2. **Web Scraping** (Automated)
   - Bank-specific rates
   - Updated daily at 3:00 AM
   - Representative of current market

3. **Community Submissions** (User-driven)
   - Real-world rates people see
   - Regional bank coverage
   - Verification through upvotes

This combination gives you comprehensive, accurate, and timely rate data!

## Troubleshooting

**Issue**: Benchmarks not showing
- Check that FRED_API_KEY is set in `.env`
- Verify server restarted after adding key
- Check server logs for API errors

**Issue**: "demo" key not working
- The demo key has limitations
- Get your free key (takes 1 minute)
- Free keys are unlimited for this use case

## Learn More

- FRED API Docs: https://fred.stlouisfed.org/docs/api/
- Economic Research: https://fred.stlouisfed.org/
- Rate Series Search: https://fred.stlouisfed.org/categories
