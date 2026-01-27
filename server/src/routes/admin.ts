import express, { Request, Response, NextFunction } from 'express';
import BankRate from '../models/BankRate.js';

const router = express.Router();

// Simple admin authentication middleware
const adminAuth = (req: Request, res: Response, next: NextFunction) => {
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const providedPassword = req.headers['x-admin-password'];

  if (providedPassword !== adminPassword) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
};

// Get all rates with admin details
router.get('/rates', adminAuth, async (req: Request, res: Response) => {
  try {
    const { dataSource, accountType, sortBy } = req.query;
    
    const filter: any = {};
    if (dataSource && dataSource !== 'all') {
      filter.dataSource = dataSource;
    }
    if (accountType && accountType !== 'all') {
      filter.accountType = accountType;
    }

    const sortOptions: any = {};
    if (sortBy === 'newest') {
      sortOptions.createdAt = -1;
    } else if (sortBy === 'oldest') {
      sortOptions.createdAt = 1;
    } else if (sortBy === 'reports') {
      sortOptions.reports = -1;
    } else {
      sortOptions.apy = -1; // default: highest APY first
    }

    const rates = await BankRate.find(filter)
      .sort(sortOptions)
      .limit(500);

    res.json(rates);
  } catch (error) {
    console.error('Error fetching admin rates:', error);
    res.status(500).json({ error: 'Failed to fetch rates' });
  }
});

// Delete a rate
router.delete('/rates/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const rate = await BankRate.findByIdAndDelete(id);
    
    if (!rate) {
      return res.status(404).json({ error: 'Rate not found' });
    }

    console.log(`Admin deleted rate: ${rate.bankName} - ${rate.accountType}`);
    res.json({ message: 'Rate deleted successfully', deletedRate: rate });
  } catch (error) {
    console.error('Error deleting rate:', error);
    res.status(500).json({ error: 'Failed to delete rate' });
  }
});

// Update a rate
router.patch('/rates/:id', adminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const rate = await BankRate.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!rate) {
      return res.status(404).json({ error: 'Rate not found' });
    }

    console.log(`Admin updated rate: ${rate.bankName} - ${rate.accountType}`);
    res.json({ message: 'Rate updated successfully', rate });
  } catch (error) {
    console.error('Error updating rate:', error);
    res.status(500).json({ error: 'Failed to update rate' });
  }
});

// Bulk delete rates
router.post('/rates/bulk-delete', adminAuth, async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid ids array' });
    }

    const result = await BankRate.deleteMany({ _id: { $in: ids } });

    console.log(`Admin bulk deleted ${result.deletedCount} rates`);
    res.json({ 
      message: `${result.deletedCount} rates deleted successfully`,
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    console.error('Error bulk deleting rates:', error);
    res.status(500).json({ error: 'Failed to bulk delete rates' });
  }
});

// Get stats
router.get('/stats', adminAuth, async (req: Request, res: Response) => {
  try {
    const totalRates = await BankRate.countDocuments();
    const communityRates = await BankRate.countDocuments({ dataSource: 'community' });
    const scrapedRates = await BankRate.countDocuments({ dataSource: 'scraped' });
    const apiRates = await BankRate.countDocuments({ dataSource: 'api' });
    const reportedRates = await BankRate.countDocuments({ reports: { $gt: 0 } });
    const highReports = await BankRate.countDocuments({ reports: { $gte: 3 } });

    res.json({
      totalRates,
      communityRates,
      scrapedRates,
      apiRates,
      reportedRates,
      highReports
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
