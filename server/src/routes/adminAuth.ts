import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import AdminUser from '../models/AdminUser.js';
import BankRate from '../models/BankRate.js';
import { sendPasswordResetEmail } from '../services/adminEmailService.js';

const router = express.Router();

// Admin authentication middleware
const adminAuth = async (req: Request, res: Response, next: NextFunction) => {
  const username = req.headers['x-admin-username'] as string;
  const password = req.headers['x-admin-password'] as string;

  if (!username || !password) {
    return res.status(401).json({ error: 'Missing credentials' });
  }

  try {
    const admin = await AdminUser.findOne({ username });
    
    if (!admin || admin.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Check if admin account exists
router.get('/account-exists', async (req: Request, res: Response) => {
  try {
    const adminCount = await AdminUser.countDocuments();
    res.json({ exists: adminCount > 0 });
  } catch (error) {
    console.error('Error checking admin account:', error);
    res.status(500).json({ error: 'Failed to check account status' });
  }
});

// Create admin account (first time setup)
router.post('/create-account', async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    
    // Validation
    if (!username || username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }
    
    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }
    
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    // Check if admin already exists
    const existingAdmin = await AdminUser.findOne();
    if (existingAdmin) {
      return res.status(403).json({ error: 'Admin account already exists' });
    }
    
    // Create admin account
    const admin = new AdminUser({
      username,
      email,
      password, // In production, hash this with bcrypt
    });
    
    await admin.save();
    
    console.log('✅ Admin account created:', username);
    res.json({ 
      message: 'Account created successfully',
      username: admin.username,
      email: admin.email
    });
  } catch (error: any) {
    console.error('Error creating admin account:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const admin = await AdminUser.findOne({ username });
    
    if (!admin || admin.password !== password) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    console.log('✅ Admin logged in:', username);
    res.json({ 
      message: 'Login successful',
      username: admin.username,
      email: admin.email
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Request password reset
router.post('/request-reset', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const admin = await AdminUser.findOne({ email });
    
    if (!admin) {
      // Don't reveal if email exists
      return res.json({ message: 'If that email exists, a reset link has been sent' });
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now
    
    admin.resetToken = resetToken;
    admin.resetTokenExpiry = resetTokenExpiry;
    await admin.save();
    
    // Send reset email
    await sendPasswordResetEmail(admin.email, resetToken);
    
    console.log('✅ Password reset email sent to:', email);
    res.json({ message: 'If that email exists, a reset link has been sent' });
  } catch (error) {
    console.error('Error requesting password reset:', error);
    res.status(500).json({ error: 'Failed to process reset request' });
  }
});

// Reset password with token
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    const admin = await AdminUser.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() }
    });
    
    if (!admin) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    
    // Update password and clear reset token
    admin.password = newPassword; // In production, hash this
    admin.resetToken = undefined;
    admin.resetTokenExpiry = undefined;
    await admin.save();
    
    console.log('✅ Password reset successful for:', admin.username);
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Error resetting password:', error);
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
      sortOptions.apy = -1;
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
