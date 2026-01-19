import { searchRatesAndDistancesForBanks } from '../services/bankBatchService.js';
import { Router, Request, Response } from 'express';
import { scrapeAllBanks, scrapeBank } from '../services/scraperService.js';
import { updateBankRatesWithSearch, listAvailableGeminiModels, searchAndExtractRates } from '../services/aiSearchService.js';
// ...existing code...
import { searchBankRatesWithPerplexity } from '../services/perplexityService.js';

const router = Router();

// Batch AI-powered rate and distance search for core banks
router.post('/ai-search-banks', async (req: Request, res: Response) => {
  try {
    const { accountType, zipCode } = req.body;
    const results = await searchRatesAndDistancesForBanks(accountType || 'savings', zipCode || '48304');
    res.json({ results });
  } catch (error) {
    console.error('Error in batch AI bank search:', error);
    res.status(500).json({ error: 'Failed to search rates and distances for banks' });
  }
});

// Perplexity AI-powered live rate search
router.post('/ai-search-bank-perplexity', async (req: Request, res: Response) => {
  try {
    const { bankName, zipCode, accountType } = req.body;
    if (!bankName && !zipCode) {
      return res.status(400).json({ error: 'bankName or zipCode is required' });
    }
    const rates = await searchBankRatesWithPerplexity({ bankName, accountType: accountType || 'savings', zipCode });
    res.json({
      message: `Perplexity AI searched for rates for ${bankName || 'banks'}${zipCode ? ' near ' + zipCode : ''}`,
      rates
    });
  } catch (error) {
    console.error('Error in Perplexity AI bank search:', error);
    res.status(500).json({ error: 'Failed to search for bank rates with Perplexity' });
  }
});

// Endpoint to list available Gemini models for debugging
router.get('/ai-gemini-models', async (req: Request, res: Response) => {
  try {
    const models = await listAvailableGeminiModels();
    if (!models) {
      return res.status(500).json({ error: 'Could not list Gemini models. Check server logs for details.' });
    }
    res.json({ models });
  } catch (error) {
    console.error('Error listing Gemini models:', error);
    res.status(500).json({ error: 'Failed to list Gemini models' });
  }
});

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
// AI-powered rate search (now uses Perplexity)
router.post('/ai-search', async (req: Request, res: Response) => {
  try {
    const { bankName, zipCode, accountType } = req.body;
    if (!bankName && !zipCode) {
      return res.status(400).json({ error: 'bankName or zipCode is required' });
    }
    const rates = await searchBankRatesWithPerplexity({ bankName, accountType: accountType || 'savings', zipCode });
    res.json({
      message: `Perplexity AI searched for rates for ${bankName || 'banks'}${zipCode ? ' near ' + zipCode : ''}`,
      rates
    });
  } catch (error) {
    console.error('Error in Perplexity AI bank search:', error);
    res.status(500).json({ error: 'Failed to search for bank rates with Perplexity' });
  }
});

// Update rates using AI (uses searchAndExtractRates)
router.post('/ai-update', async (req: Request, res: Response) => {
  try {
    const { bankName, accountType } = req.body;
    // Run AI update in background
    updateBankRatesWithSearch(bankName)
      .then((count: number) => console.log(`AI updated ${count} rates`))
      .catch((err: any) => console.error('AI update error:', err));
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
    console.log('Received zipCode:', zipCode, 'accountType:', accountType);
    
    // Use batch search for core banks when no zipCode is provided
    if (!zipCode) {
      console.log('No zipCode provided, using batch search for core banks');
      const results = await searchRatesAndDistancesForBanks(accountType || 'savings', '');
      
      // Format results to match BankRate interface expected by frontend
      const formattedRates = results
        .filter(r => r.rate)
        .map((r, index) => ({
          _id: `ai-${index}-${Date.now()}`,
          bankName: r.bankName,
          accountType: accountType || 'savings',
          rate: r.rate.apy || r.rate.rate || 0,
          apy: r.rate.apy || r.rate.rate || 0,
          minDeposit: 0,
          institutionType: r.type,
          serviceModel: r.serviceModel,
          features: [
            r.type === 'credit-union' ? '🏛️ Credit Union' : '🏦 Bank',
            r.serviceModel === 'online' ? '💻 Online Only' : r.serviceModel === 'branch' ? '🏢 Branch Banking' : '🏢💻 Hybrid',
            r.rate.rateRange ? `Rate Range: ${r.rate.rateRange}` : '',
            r.rate.rateInfo ? r.rate.rateInfo.substring(0, 200) + '...' : '',
            r.phone ? `📞 ${r.phone}` : '',
            r.rate.sourceUrl ? `🔗 Source` : '',
            !r.rate.apy && !r.rate.rate ? '📝 Have a rate? Submit it!' : ''
          ].filter(Boolean),
          verifications: 0,
          reports: 0,
          lastVerified: new Date().toISOString(),
          availability: r.serviceModel === 'online' ? 'national' as const : 'regional' as const,
          dataSource: 'api' as const,
          scrapedUrl: r.rate.sourceUrl || '',
          phone: r.phone,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));
      
      return res.json({ 
        message: `Perplexity AI searched for rates from core banks`,
        rates: formattedRates
      });
    }
    
    const rates = await searchBankRatesWithPerplexity({ bankName: undefined, accountType: accountType || 'savings', zipCode });
    console.log('Rates returned from Perplexity:', rates);
    res.json({ 
      message: `Perplexity AI searched for rates near ${zipCode}`,
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
