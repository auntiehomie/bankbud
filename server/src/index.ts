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
  
  console.log('⏰ Scheduled daily rate scraping at 3:00 AM');
  
  // Optional: Run initial scrape on startup (uncomment to enable)
  // console.log('🔄 Running initial rate scraping...');
  // setTimeout(() => scrapeAllBanks(), 5000);
};

startServer();

export default app;
