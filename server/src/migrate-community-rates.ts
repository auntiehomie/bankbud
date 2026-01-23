import mongoose from 'mongoose';
import dotenv from 'dotenv';
import BankRate from './models/BankRate.js';

dotenv.config();

/**
 * Migration script to fix dataSource field for existing rates
 * - Rates with lastScraped date or scrapedUrl = 'api' or 'scraped'
 * - All other rates = 'community' (user-submitted)
 */

async function migrateDataSources() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bankbud';
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connected');

    // Find all rates
    const allRates = await BankRate.find({});
    console.log(`\n📊 Found ${allRates.length} total rates in database`);

    let communityFixed = 0;
    let apiFixed = 0;
    let scrapedFixed = 0;
    let alreadyCorrect = 0;

    for (const rate of allRates) {
      let newDataSource: 'community' | 'api' | 'scraped' | null = null;

      // If it has a scraped URL or lastScraped date, it's from scraping
      if (rate.lastScraped || rate.scrapedUrl) {
        if (rate.dataSource !== 'api' && rate.dataSource !== 'scraped') {
          newDataSource = 'api';
          apiFixed++;
        } else {
          alreadyCorrect++;
        }
      } 
      // Otherwise it's community-submitted
      else {
        if (rate.dataSource !== 'community') {
          newDataSource = 'community';
          communityFixed++;
        } else {
          alreadyCorrect++;
        }
      }

      // Update if needed
      if (newDataSource) {
        await BankRate.findByIdAndUpdate(rate._id, { dataSource: newDataSource });
        console.log(`  ✓ Updated ${rate.bankName} (${rate.accountType}) → ${newDataSource}`);
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`  - Community rates fixed: ${communityFixed}`);
    console.log(`  - API/scraped rates fixed: ${apiFixed}`);
    console.log(`  - Already correct: ${alreadyCorrect}`);
    console.log(`  - Total processed: ${allRates.length}`);

    // Show current distribution
    const communityCount = await BankRate.countDocuments({ dataSource: 'community' });
    const apiCount = await BankRate.countDocuments({ dataSource: 'api' });
    const scrapedCount = await BankRate.countDocuments({ dataSource: 'scraped' });

    console.log('\n📊 Current Distribution:');
    console.log(`  - Community: ${communityCount}`);
    console.log(`  - API: ${apiCount}`);
    console.log(`  - Scraped: ${scrapedCount}`);

    await mongoose.disconnect();
    console.log('\n✅ Migration complete!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateDataSources();
