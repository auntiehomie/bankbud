import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';
import ratesRouter from './routes/rates.js';
import recommendationsRouter from './routes/recommendations.js';
import scraperRouter from './routes/scraper.js';
import benchmarksRouter from './routes/benchmarks.js';
import chatRouter from './routes/chat.js';
import newsRouter from './routes/news.js';
import { scrapeAllBanks } from './services/scraperService.js';

dotenv.config();

const app = express();
// Trust proxy headers (needed for correct rate limiting and client IP detection on Render)
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Routes
app.use('/api/rates', ratesRouter);
app.use('/api/recommendations', recommendationsRouter);
app.use('/api/scraper', scraperRouter);
app.use('/api/benchmarks', benchmarksRouter);
app.use('/api/chat', chatRouter);
app.use('/api/news', newsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Database connection
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bankbud';
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  await connectDB();
  
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 API available at http://localhost:${PORT}/api`);
  });
  
  // Schedule automatic scraping - runs daily at 3 AM
  cron.schedule('0 3 * * *', async () => {
    console.log('⏰ Running scheduled bank rate scraping...');
    await scrapeAllBanks();
  });
  
  // Schedule AI rate updates - runs daily at 2 AM (before scraping)
  cron.schedule('0 2 * * *', async () => {
    console.log('⏰ Running scheduled AI rate updates...');
    try {
      const { searchRatesAndDistancesForBanks } = await import('./services/bankBatchService.js');
      const accountTypes = ['savings', 'checking', 'cd'];
      const BankRate = (await import('./models/BankRate.js')).default;
      
      for (const accountType of accountTypes) {
        console.log(`Updating ${accountType} rates...`);
        const results = await searchRatesAndDistancesForBanks(accountType);
        
        // Update database with fresh rates
        for (const result of results) {
          if (result.rate && result.rate.apy) {
            await BankRate.findOneAndUpdate(
              { bankName: result.bankName, accountType },
              {
                bankName: result.bankName,
                accountType,
                rate: result.rate.apy,
                apy: result.rate.apy,
                minDeposit: 0,
                features: result.rate.rateInfo ? [result.rate.rateInfo.substring(0, 100)] : [],
                verifications: 0,
                reports: 0,
                lastVerified: new Date(),
                availability: result.serviceModel === 'online' ? 'national' : 'regional',
                dataSource: 'api',
                scrapedUrl: result.rate.sourceUrl || '',
                phone: result.phone,
                institutionType: result.type,
                serviceModel: result.serviceModel,
                lastScraped: new Date()
              },
              { upsert: true, new: true }
            );
          }
        }
        console.log(`✅ Updated ${accountType} rates`);
      }
      console.log('✅ AI rate update complete');
    } catch (error) {
      console.error('❌ AI rate update failed:', error);
    }
  });
  
  console.log('⏰ Scheduled daily AI rate updates at 2:00 AM');
  console.log('⏰ Scheduled daily rate scraping at 3:00 AM');
  
  // Optional: Run initial scrape on startup (uncomment to enable)
  // console.log('🔄 Running initial rate scraping...');
  // setTimeout(() => scrapeAllBanks(), 5000);
};

startServer();

export default app;
