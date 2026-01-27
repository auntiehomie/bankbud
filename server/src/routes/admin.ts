import express, { Request, Response, NextFunction } from 'express';
import BankRate from '../models/BankRate.js';
import AdminConfig from '../models/AdminConfig.js';

const router = express.Router();

// Get stored admin password from database
async function getStoredPassword(): Promise<string | null> {
  try {
    const config = await AdminConfig.findOne({ key: 'admin_password' });
    return config ? config.value : null;
  } catch (error) {
    console.error('Error fetching admin password:', error);
    return null;
  }
}

// Simple admin authentication middleware
const adminAuth = async (req: Request, res: Response, next: NextFunction) => {
  const providedPassword = req.headers['x-admin-password'];
  const storedPassword = await getStoredPassword();
  
  // Fallback to env variable if no DB password
  const adminPassword = storedPassword || process.env.ADMIN_PASSWORD || 'admin123';

  if (providedPassword !== adminPassword) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
};

// Check if admin password exists
router.get('/password-exists', async (req: Request, res: Response) => {
  try {
    const storedPassword = await getStoredPassword();
    const envPassword = process.env.ADMIN_PASSWORD;
    
    res.json({ 
      exists: !!(storedPassword || envPassword),
      source: storedPassword ? 'database' : (envPassword ? 'environment' : 'none')
    });
  } catch (error) {
    console.error('Error checking password existence:', error);
    res.status(500).json({ error: 'Failed to check password status' });
  }
});

// Set initial admin password (only works if no password exists)
router.post('/set-password', async (req: Request, res: Response) => {
  try {
    const { password } = req.body;
    
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    // Check if password already exists
    const existingPassword = await getStoredPassword();
    const envPassword = process.env.ADMIN_PASSWORD;
    
    if (existingPassword || envPassword) {
      return res.status(403).json({ error: 'Admin password already exists' });
    }
    
    // Store the password
    await AdminConfig.findOneAndUpdate(
      { key: 'admin_password' },
      { key: 'admin_password', value: password },
      { upsert: true, new: true }
    );
    
    console.log('✓ Admin password created');
    res.json({ message: 'Password created successfully' });
  } catch (error) {
    console.error('Error setting admin password:', error);
    res.status(500).json({ error: 'Failed to set password' });
  }
});

// Reset admin password (requires reset key from environment)
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { resetKey } = req.body;
    const serverResetKey = process.env.ADMIN_RESET_KEY;
    
    if (!serverResetKey) {
      return res.status(500).json({ 
        error: 'Password reset not configured. Contact administrator.',
        hint: 'Set ADMIN_RESET_KEY in server environment variables.'
      });
    }
    
    if (resetKey !== serverResetKey) {
      return res.status(401).json({ error: 'Invalid reset key' });
    }
    
    // Delete the stored password
    await AdminConfig.findOneAndDelete({ key: 'admin_password' });
    
    console.log('✓ Admin password reset - can now create new password');
    res.json({ message: 'Password reset successfully. You can now create a new password.' });
  } catch (error) {
    console.error('Error resetting admin password:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

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
