import express from 'express';
import { RateAlert } from '../models/RateAlert';
import { IBankRate } from '../models/BankRate';
import { sendRateAlertEmail } from '../services/rateAlertService';
import mongoose from 'mongoose';

const router = express.Router();

// Get the BankRate model
const BankRate = mongoose.model<IBankRate>('BankRate');

// Create a new rate alert
router.post('/', async (req, res) => {
  try {
    const { email, accountType, targetRate, frequency } = req.body;

    // Validate required fields
    if (!email || !accountType || !targetRate) {
      return res.status(400).json({ 
        error: 'Missing required fields: email, accountType, targetRate' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate target rate
    if (targetRate < 0 || targetRate > 20) {
      return res.status(400).json({ error: 'Target rate must be between 0 and 20' });
    }

    // Check for duplicate alerts
    const existingAlert = await RateAlert.findOne({
      email: email.toLowerCase(),
      accountType,
      active: true
    });

    if (existingAlert) {
      // Update existing alert instead of creating duplicate
      existingAlert.targetRate = targetRate;
      existingAlert.frequency = frequency || 'daily';
      await existingAlert.save();
      
      return res.json({ 
        message: 'Rate alert updated successfully',
        alert: existingAlert 
      });
    }

    // Create new alert
    const alert = new RateAlert({
      email: email.toLowerCase(),
      accountType,
      targetRate,
      frequency: frequency || 'daily',
      active: true
    });

    await alert.save();

    // Check immediately if there are matching rates
    const matchingRates = await BankRate.find({
      accountType,
      $or: [
        { apy: { $gte: targetRate } },
        { rate: { $gte: targetRate } }
      ]
    }).limit(10);

    // Send immediate notification if there are matches and frequency is 'instant'
    if (matchingRates.length > 0 && frequency === 'instant') {
      const emailData = {
        email: alert.email,
        accountType: alert.accountType,
        targetRate: alert.targetRate,
        matchingRates: matchingRates.map((rate: IBankRate) => ({
          bankName: rate.bankName,
          rate: rate.apy || rate.rate || 0,
          accountType: rate.accountType,
          url: rate.scrapedUrl,
          distanceKm: rate.distanceKm
        }))
      };

      try {
        await sendRateAlertEmail(emailData);
        alert.lastNotified = new Date();
        await alert.save();
      } catch (error) {
        console.error('Error sending immediate alert:', error);
      }
    }

    res.json({ 
      message: 'Rate alert created successfully',
      alert,
      matchingRates: matchingRates.length
    });
  } catch (error) {
    console.error('Error creating rate alert:', error);
    res.status(500).json({ error: 'Failed to create rate alert' });
  }
});

// Get alerts for a user
router.get('/user/:email', async (req, res) => {
  try {
    const { email } = req.params;

    const alerts = await RateAlert.find({
      email: email.toLowerCase(),
      active: true
    }).sort({ createdAt: -1 });

    res.json(alerts);
  } catch (error) {
    console.error('Error fetching rate alerts:', error);
    res.status(500).json({ error: 'Failed to fetch rate alerts' });
  }
});

// Delete (deactivate) an alert
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const alert = await RateAlert.findByIdAndUpdate(
      id,
      { active: false },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    res.json({ message: 'Alert deleted successfully' });
  } catch (error) {
    console.error('Error deleting rate alert:', error);
    res.status(500).json({ error: 'Failed to delete rate alert' });
  }
});

// Check alerts and send notifications (called by cron job)
router.post('/check-and-notify', async (req, res) => {
  try {
    const alerts = await RateAlert.find({ active: true });

    let notificationsSent = 0;

    for (const alert of alerts) {
      // Check if we should send notification based on frequency
      const now = new Date();
      if (alert.lastNotified) {
        const hoursSinceLastNotification = 
          (now.getTime() - alert.lastNotified.getTime()) / (1000 * 60 * 60);

        if (alert.frequency === 'daily' && hoursSinceLastNotification < 24) {
          continue;
        }
        if (alert.frequency === 'weekly' && hoursSinceLastNotification < 168) {
          continue;
        }
      }

      // Find matching rates
      const matchingRates = await BankRate.find({
        accountType: alert.accountType,
        $or: [
          { apy: { $gte: alert.targetRate } },
          { rate: { $gte: alert.targetRate } }
        ]
      }).limit(10);

      if (matchingRates.length > 0) {
        const emailData = {
          email: alert.email,
          accountType: alert.accountType,
          targetRate: alert.targetRate,
          matchingRates: matchingRates.map((rate: IBankRate) => ({
            bankName: rate.bankName,
            rate: rate.apy || rate.rate || 0,
            accountType: rate.accountType,
            url: rate.scrapedUrl,
            distanceKm: rate.distanceKm
          }))
        };

        try {
          await sendRateAlertEmail(emailData);
          alert.lastNotified = new Date();
          await alert.save();
          notificationsSent++;
        } catch (error) {
          console.error(`Error sending alert to ${alert.email}:`, error);
        }
      }
    }

    res.json({ 
      message: 'Alert check completed',
      notificationsSent,
      totalAlerts: alerts.length
    });
  } catch (error) {
    console.error('Error checking rate alerts:', error);
    res.status(500).json({ error: 'Failed to check rate alerts' });
  }
});

export default router;
