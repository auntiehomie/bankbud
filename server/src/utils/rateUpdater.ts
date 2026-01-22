import BankRate from '../models/BankRate.js';

interface RateUpdateData {
  bankName: string;
  accountType: 'savings' | 'checking' | 'cd' | 'money-market';
  rate: number;
  apy: number;
  minDeposit?: number;
  term?: number;
  features?: string[];
  sourceUrl?: string;
  confidence?: 'high' | 'medium' | 'low';
  phone?: string;
  institutionType?: string;
  serviceModel?: string;
  availability?: string;
}

/**
 * Shared utility to update or create bank rate in database
 * Consolidates duplicate database update logic
 */
export async function updateOrCreateBankRate(
  rateData: RateUpdateData,
  dataSource: 'api' | 'scraped' | 'community' = 'api'
): Promise<boolean> {
  try {
    const existingRate = await BankRate.findOne({
      bankName: rateData.bankName,
      accountType: rateData.accountType,
    });

    if (existingRate) {
      // Update existing rate
      existingRate.rate = rateData.rate || rateData.apy;
      existingRate.apy = rateData.apy;
      existingRate.minDeposit = rateData.minDeposit;
      existingRate.term = rateData.term;
      existingRate.features = rateData.features || existingRate.features;
      existingRate.scrapedUrl = rateData.sourceUrl || existingRate.scrapedUrl;
      existingRate.lastScraped = new Date();
      existingRate.dataSource = dataSource;
      await existingRate.save();
      
      console.log(`✅ Updated ${rateData.bankName} ${rateData.accountType}: ${rateData.apy}%`);
      return true;
    } else if (rateData.apy > 0) {
      // Create new rate
      await BankRate.create({
        bankName: rateData.bankName,
        accountType: rateData.accountType,
        rate: rateData.rate || rateData.apy,
        apy: rateData.apy,
        minDeposit: rateData.minDeposit || 0,
        term: rateData.term,
        features: rateData.features || [],
        verifications: 0,
        reports: 0,
        lastVerified: new Date(),
        scrapedUrl: rateData.sourceUrl,
        availability: rateData.availability || 'national',
        dataSource,
        lastScraped: new Date(),
      });
      
      console.log(`✅ Created ${rateData.bankName} ${rateData.accountType}: ${rateData.apy}%`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Failed to update/create rate for ${rateData.bankName}:`, error);
    return false;
  }
}
