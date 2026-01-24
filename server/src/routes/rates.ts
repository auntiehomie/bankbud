import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import BankRate from '../models/BankRate.js';
import { sendRateSubmissionEmail, sendRateReportEmail } from '../services/emailService.js';
import { searchRatesAndDistancesForBanks } from '../services/bankBatchService.js';

const router = Router();

// Get all rates with optional filtering
router.get('/', async (req: Request, res: Response) => {
  try {
    const { accountType, minRate, maxMinDeposit, zipCode, state } = req.query;
    
    const filter: any = {};
    
    // Hide rates with more reports than verifications (verification threshold)
    filter.$expr = { $gte: ['$verifications', '$reports'] };
    
    if (accountType && accountType !== 'all') {
      filter.accountType = accountType;
    }
    
    if (minRate) {
      filter.$or = [
        { apy: { $gte: parseFloat(minRate as string) } },
        { rate: { $gte: parseFloat(minRate as string) } }
      ];
    }
    
    if (maxMinDeposit) {
      filter.minDeposit = { $lte: parseInt(maxMinDeposit as string) };
    }
    
    // Location filtering
    if (zipCode) {
      filter.$or = [
        { availability: 'national' },
        { 'location.zipCode': zipCode }
      ];
    }
    
    if (state) {
      filter.$or = [
        { availability: 'national' },
        { 'location.state': state.toString().toUpperCase() }
      ];
    }
    
    const rates = await BankRate.find(filter)
      .sort({ apy: -1, rate: -1 })
      .limit(100);
    
    res.json(rates);
  } catch (error) {
    console.error('Error fetching rates:', error);
    res.status(500).json({ error: 'Failed to fetch rates' });
  }
});

// Get top rates by account type
router.get('/top', async (req: Request, res: Response) => {
  try {
    const { accountType, limit = 5 } = req.query;
    
    if (!accountType) {
      return res.status(400).json({ error: 'accountType is required' });
    }
    
    const rates = await BankRate.find({ accountType })
      .sort({ apy: -1, rate: -1, verifications: -1 })
      .limit(parseInt(limit as string));
    
    res.json(rates);
  } catch (error) {
    console.error('Error fetching top rates:', error);
    res.status(500).json({ error: 'Failed to fetch top rates' });
  }
});

// Submit a new rate (with stricter rate limiting)
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // limit each IP to 3 submissions per 15 minutes
  message: 'Too many submissions from this IP, please try again later.'
});

router.post('/', submitLimiter, async (req: Request, res: Response) => {
  try {
    const {
      bankName,
      accountType,
      rate,
      apy,
      minDeposit,
      term,
      features,
      source,
      notes
    } = req.body;
    
    // Validation
    if (!bankName || !accountType || rate === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: bankName, accountType, rate' 
      });
    }
    
    // Auto-flag suspiciously high rates
    const apyValue = apy || rate;
    let autoFlagged = false;
    let flagReason = '';
    
    // Check if rate is unreasonably high (>15% APY)
    if (apyValue > 15) {
      autoFlagged = true;
      flagReason = 'Auto-flagged: Rate exceeds 15% APY';
      console.log(`⚠️ Auto-flagging ${bankName}: ${apyValue}% > 15%`);
    } else {
      // Check if rate is >2x the average for this account type
      const avgRate = await BankRate.aggregate([
        { $match: { accountType, dataSource: { $in: ['api', 'scraped'] } } },
        { $group: { _id: null, avgApy: { $avg: '$apy' } } }
      ]);
      
      if (avgRate.length > 0 && avgRate[0].avgApy) {
        const average = avgRate[0].avgApy;
        if (apyValue > average * 2) {
          autoFlagged = true;
          flagReason = `Auto-flagged: Rate is ${(apyValue / average).toFixed(1)}x higher than average (${average.toFixed(2)}%)`;
          console.log(`⚠️ Auto-flagging ${bankName}: ${apyValue}% is ${(apyValue / average).toFixed(1)}x average`);
        }
      }
    }
    
    const newRate = new BankRate({
      bankName,
      accountType,
      rate,
      apy: apyValue,
      minDeposit,
      term,
      features,
      source,
      notes: autoFlagged ? `⚠️ ${flagReason}\n${notes || ''}`.trim() : notes,
      dataSource: 'community', // Mark as community-submitted
      verifications: autoFlagged ? 0 : 1, // Don't auto-verify flagged rates
      reports: autoFlagged ? 1 : 0, // Auto-report suspicious rates
      lastVerified: autoFlagged ? undefined : new Date()
    });
    
    await newRate.save();
    
    // Send email notification (non-blocking)
    sendRateSubmissionEmail({
      bankName,
      accountType,
      rate,
      apy: apy || rate,
      minDeposit,
      term,
      features,
      source,
      notes,
      submittedAt: new Date()
    }).catch(err => console.error('Email notification failed:', err));
    
    res.status(201).json(newRate);
  } catch (error) {
    console.error('Error creating rate:', error);
    res.status(500).json({ error: 'Failed to create rate' });
  }
});

// Verify a rate
router.post('/:id/verify', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const rate = await BankRate.findByIdAndUpdate(
      id,
      { 
        $inc: { verifications: 1 },
        lastVerified: new Date()
      },
      { new: true }
    );
    
    if (!rate) {
      return res.status(404).json({ error: 'Rate not found' });
    }
    
    res.json(rate);
  } catch (error) {
    console.error('Error verifying rate:', error);
    res.status(500).json({ error: 'Failed to verify rate' });
  }
});

// Report a rate
router.post('/:id/report', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({ error: 'Reason is required' });
    }
    
    const rate = await BankRate.findByIdAndUpdate(
      id,
      { $inc: { reports: 1 } },
      { new: true }
    );
    
    if (!rate) {
      return res.status(404).json({ error: 'Rate not found' });
    }
    
    // Log the report
    console.log(`Rate ${id} reported: ${reason}`);
    
    // Send email notification (non-blocking)
    sendRateReportEmail({
      bankName: rate.bankName,
      accountType: rate.accountType,
      rate: rate.rate,
      reason,
      reportedAt: new Date(),
      rateId: id
    }).catch(err => console.error('Email notification failed:', err));
    
    res.json({ message: 'Report submitted', rate });
  } catch (error) {
    console.error('Error reporting rate:', error);
    res.status(500).json({ error: 'Failed to report rate' });
  }
});

// Delete a rate (for admin use)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const rate = await BankRate.findByIdAndDelete(id);
    
    if (!rate) {
      return res.status(404).json({ error: 'Rate not found' });
    }
    
    res.json({ message: 'Rate deleted successfully' });
  } catch (error) {
    console.error('Error deleting rate:', error);
    res.status(500).json({ error: 'Failed to delete rate' });
  }
});

// Manual refresh endpoint - triggers database update with latest rates
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    console.log('🔄 Manual rate refresh triggered...');
    const accountTypes = ['savings', 'checking', 'cd'];
    const updatedCounts = { savings: 0, checking: 0, cd: 0 };
    
    for (const accountType of accountTypes) {
      console.log(`Updating ${accountType} rates...`);
      const results = await searchRatesAndDistancesForBanks(accountType);
      
      // Update database with fresh rates
      for (const result of results) {
        if (result.rate && result.rate.apy) {
          const rateInfo = result.rate.rateInfo || '';
          const features = [];
          
          // Extract features from rate info if available
          if (rateInfo) {
            features.push(rateInfo.substring(0, 100));
          }
          
          // Add service model as a feature
          if (result.serviceModel === 'online') {
            features.push('Online Banking');
          } else if (result.serviceModel === 'branch') {
            features.push('Branch Banking');
          }
          
          await BankRate.findOneAndUpdate(
            { bankName: result.bankName, accountType },
            {
              bankName: result.bankName,
              accountType,
              rate: result.rate.apy,
              apy: result.rate.apy,
              minDeposit: 0,
              features,
              verifications: 0,
              reports: 0,
              lastVerified: new Date(),
              availability: result.serviceModel === 'online' ? 'national' : 'regional',
              dataSource: 'api',
              scrapedUrl: result.rate.sourceUrl || '',
              lastScraped: new Date()
            },
            { upsert: true, new: true }
          );
          updatedCounts[accountType as keyof typeof updatedCounts]++;
        }
      }
      console.log(`✅ Updated ${updatedCounts[accountType as keyof typeof updatedCounts]} ${accountType} rates`);
    }
    
    res.json({ 
      success: true, 
      message: 'Rates refreshed successfully',
      updated: updatedCounts
    });
  } catch (error) {
    console.error('❌ Manual rate refresh failed:', error);
    res.status(500).json({ error: 'Failed to refresh rates' });
  }
});

export default router;
