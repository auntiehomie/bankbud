import { Router, Request, Response } from 'express';
import { scrapeAllBanks, scrapeBank } from '../services/scraperService.js';

const router = Router();

// Trigger manual scraping of all banks
router.post('/scrape-all', async (req: Request, res: Response) => {
  try {
    // Run scraping in background
    scrapeAllBanks().catch(err => console.error('Scraping error:', err));
    
    res.json({ 
      message: 'Scraping initiated. This may take a few minutes.',
      status: 'processing'
    });
  } catch (error) {
    console.error('Error initiating scrape:', error);
    res.status(500).json({ error: 'Failed to initiate scraping' });
  }
});

// Scrape specific bank
router.post('/scrape/:bankName', async (req: Request, res: Response) => {
  try {
    const { bankName } = req.params;
    const rates = await scrapeBank(bankName);
    
    res.json({ 
      message: `Scraped ${rates.length} rates from ${bankName}`,
      rates
    });
  } catch (error) {
    console.error('Error scraping bank:', error);
    res.status(500).json({ error: 'Failed to scrape bank' });
  }
});

// Get last scrape status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const BankRate = (await import('../models/BankRate.js')).default;
    
    const scrapedRates = await BankRate.find({ dataSource: 'scraped' })
      .sort({ lastScraped: -1 })
      .limit(10);
    
    const lastScrape = scrapedRates[0]?.lastScraped;
    
    res.json({
      lastScrapeTime: lastScrape,
      scrapedCount: scrapedRates.length,
      recentRates: scrapedRates
    });
  } catch (error) {
    console.error('Error getting scrape status:', error);
    res.status(500).json({ error: 'Failed to get scrape status' });
  }
});

export default router;
