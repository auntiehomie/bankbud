import { Router, Request, Response } from 'express';
import { scrapeAllBanks, scrapeBank } from '../services/scraperService.js';
import { findRatesWithAI, updateRatesWithAI, searchBankRatesWithAI } from '../services/geminiService.js';
import { searchAndExtractRates, updateBankRatesWithSearch } from '../services/aiSearchService.js';

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

// AI-powered rate search
router.post('/ai-search', async (req: Request, res: Response) => {
  try {
    const { bankName, accountType } = req.body;
    const rates = await findRatesWithAI(bankName, accountType);
    
    res.json({ 
      message: `Found ${rates.length} rates using AI`,
      rates
    });
  } catch (error) {
    console.error('Error searching rates with AI:', error);
    res.status(500).json({ error: 'Failed to search rates with AI' });
  }
});

// Update rates using AI
router.post('/ai-update', async (req: Request, res: Response) => {
  try {
    const { bankName, accountType } = req.body;
    
    // Run AI update in background
    updateRatesWithAI(bankName, accountType)
      .then(count => console.log(`AI updated ${count} rates`))
      .catch(err => console.error('AI update error:', err));
    
    res.json({ 
      message: 'AI rate update initiated',
      status: 'processing'
    });
  } catch (error) {
    console.error('Error initiating AI update:', error);
    res.status(500).json({ error: 'Failed to initiate AI update' });
  }
});

// AI search for specific bank (more reliable)
router.post('/ai-search-bank', async (req: Request, res: Response) => {
  try {
    console.log('AI search endpoint hit');
    const { zipCode, accountType } = req.body;
    if (!zipCode) {
      return res.status(400).json({ error: 'zipCode is required' });
    }
    const rates = await searchAndExtractRates(undefined, accountType || 'savings', zipCode);
    res.json({ 
      message: `AI searched for rates near ${zipCode}`,
      rates
    });
  } catch (error) {
    console.error('Error in AI bank search:', error);
    res.status(500).json({ error: 'Failed to search for bank rates' });
  }
});

// Update specific bank using AI search
router.post('/ai-update-bank', async (req: Request, res: Response) => {
  try {
    const { bankName } = req.body;
    
    if (!bankName) {
      return res.status(400).json({ error: 'bankName is required' });
    }

    // Run in background
    updateBankRatesWithSearch(bankName)
      .then(count => console.log(`Updated ${count} rates for ${bankName}`))
      .catch(err => console.error('AI bank update error:', err));
    
    res.json({ 
      message: `AI update initiated for ${bankName}`,
      status: 'processing'
    });
  } catch (error) {
    console.error('Error initiating AI bank update:', error);
    res.status(500).json({ error: 'Failed to initiate AI bank update' });
  }
});

export default router;
