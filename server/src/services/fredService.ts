import axios from 'axios';

// FRED API Configuration
// Get your free API key at: https://fred.stlouisfed.org/docs/api/api_key.html
const FRED_API_KEY = process.env.FRED_API_KEY || 'demo';
const FRED_BASE_URL = 'https://api.stlouisfed.org/fred';

interface FREDObservation {
  date: string;
  value: string;
}

interface FREDResponse {
  observations: FREDObservation[];
}

// FRED Series IDs for different bank rates
const FRED_SERIES = {
  SAVINGS_RATE: 'SAVINGS', // National Average Savings Rate
  INTEREST_CHECKING: 'INTCKN', // Interest Checking Rate
  MONEY_MARKET: 'MMMFRATE', // Money Market Fund Rate
  CD_12_MONTH: 'CD12N', // 12-Month CD Rate
  CD_6_MONTH: 'CD6N', // 6-Month CD Rate
};

/**
 * Fetch the latest rate from FRED for a specific series
 */
async function fetchFREDRate(seriesId: string): Promise<number | null> {
  try {
    const response = await axios.get<FREDResponse>(`${FRED_BASE_URL}/series/observations`, {
      params: {
        series_id: seriesId,
        api_key: FRED_API_KEY,
        file_type: 'json',
        sort_order: 'desc',
        limit: 1,
      },
      timeout: 10000,
    });

    if (response.data.observations && response.data.observations.length > 0) {
      const value = parseFloat(response.data.observations[0].value);
      return isNaN(value) ? null : value;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching FRED series ${seriesId}:`, error);
    return null;
  }
}

/**
 * Fetch all benchmark rates from FRED
 */
export async function fetchBenchmarkRates(): Promise<{
  savings: number | null;
  checking: number | null;
  moneyMarket: number | null;
  cd12Month: number | null;
  cd6Month: number | null;
  timestamp: Date;
}> {
  console.log('📊 Fetching benchmark rates from FRED...');

  const [savings, checking, moneyMarket, cd12Month, cd6Month] = await Promise.all([
    fetchFREDRate(FRED_SERIES.SAVINGS_RATE),
    fetchFREDRate(FRED_SERIES.INTEREST_CHECKING),
    fetchFREDRate(FRED_SERIES.MONEY_MARKET),
    fetchFREDRate(FRED_SERIES.CD_12_MONTH),
    fetchFREDRate(FRED_SERIES.CD_6_MONTH),
  ]);

  const result = {
    savings,
    checking,
    moneyMarket,
    cd12Month,
    cd6Month,
    timestamp: new Date(),
  };

  console.log('✅ FRED benchmark rates fetched:', {
    savings: savings ? `${savings}%` : 'N/A',
    checking: checking ? `${checking}%` : 'N/A',
    moneyMarket: moneyMarket ? `${moneyMarket}%` : 'N/A',
    cd12Month: cd12Month ? `${cd12Month}%` : 'N/A',
    cd6Month: cd6Month ? `${cd6Month}%` : 'N/A',
  });

  return result;
}

/**
 * Get national average rates to use as validation benchmarks
 * This helps verify that scraped/community rates are reasonable
 */
export async function getValidationBenchmarks() {
  const rates = await fetchBenchmarkRates();
  
  return {
    savingsMin: rates.savings ? rates.savings * 0.5 : 0,
    savingsMax: rates.savings ? rates.savings * 3 : 6,
    cdMin: rates.cd12Month ? rates.cd12Month * 0.5 : 0,
    cdMax: rates.cd12Month ? rates.cd12Month * 1.5 : 7,
    moneyMarketMin: rates.moneyMarket ? rates.moneyMarket * 0.5 : 0,
    moneyMarketMax: rates.moneyMarket ? rates.moneyMarket * 2 : 6,
  };
}

/**
 * Check if a rate is within reasonable bounds compared to national average
 */
export function isRateReasonable(
  rate: number,
  accountType: string,
  benchmarks: Awaited<ReturnType<typeof getValidationBenchmarks>>
): boolean {
  switch (accountType) {
    case 'savings':
      return rate >= benchmarks.savingsMin && rate <= benchmarks.savingsMax;
    case 'cd':
      return rate >= benchmarks.cdMin && rate <= benchmarks.cdMax;
    case 'money-market':
      return rate >= benchmarks.moneyMarketMin && rate <= benchmarks.moneyMarketMax;
    case 'checking':
      return rate <= 2; // Checking rates are typically very low
    default:
      return true;
  }
}
