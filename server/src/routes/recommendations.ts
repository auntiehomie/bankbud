import { Router, Request, Response } from 'express';
import BankRate from '../models/BankRate.js';
import { getAIRecommendations } from '../services/aiService.js';

const router = Router();

interface UserPreferences {
  accountType: string;
  minRate?: number;
  maxMinDeposit?: number;
  preferredFeatures?: string[];
  location?: string;
}

// Get AI-powered recommendations
router.post('/', async (req: Request, res: Response) => {
  try {
    const preferences: UserPreferences = req.body;
    
    if (!preferences.accountType) {
      return res.status(400).json({ error: 'accountType is required' });
    }
    
    // Build query filter
    const filter: any = { accountType: preferences.accountType };
    
    if (preferences.minRate) {
      filter.$or = [
        { apy: { $gte: preferences.minRate } },
        { rate: { $gte: preferences.minRate } }
      ];
    }
    
    if (preferences.maxMinDeposit) {
      filter.$or = [
        { minDeposit: { $lte: preferences.maxMinDeposit } },
        { minDeposit: { $exists: false } }
      ];
    }
    
    // Get matching rates
    let rates = await BankRate.find(filter)
      .sort({ apy: -1, rate: -1, verifications: -1 })
      .limit(20);
    
    // If no OpenAI key, use rule-based scoring
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      const scoredRates = rates.map(rate => ({
        bankRate: rate,
        score: calculateMatchScore(rate, preferences),
        reasoning: generateReasoning(rate, preferences)
      }));
      
      scoredRates.sort((a, b) => b.score - a.score);
      
      return res.json(scoredRates.slice(0, 5));
    }
    
    // Use AI for recommendations
    try {
      const recommendations = await getAIRecommendations(rates, preferences);
      return res.json(recommendations);
    } catch (aiError) {
      console.error('AI recommendation error, falling back to rule-based:', aiError);
      
      // Fallback to rule-based if AI fails
      const scoredRates = rates.map(rate => ({
        bankRate: rate,
        score: calculateMatchScore(rate, preferences),
        reasoning: generateReasoning(rate, preferences)
      }));
      
      scoredRates.sort((a, b) => b.score - a.score);
      
      return res.json(scoredRates.slice(0, 5));
    }
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

// Rule-based scoring algorithm
function calculateMatchScore(rate: any, preferences: UserPreferences): number {
  let score = 50; // Base score
  
  // Rate quality (0-30 points)
  const rateValue = rate.apy || rate.rate;
  if (rateValue >= 5.0) score += 30;
  else if (rateValue >= 4.0) score += 25;
  else if (rateValue >= 3.0) score += 20;
  else if (rateValue >= 2.0) score += 15;
  else score += 10;
  
  // Verification score (0-20 points)
  if (rate.verifications >= 10) score += 20;
  else if (rate.verifications >= 5) score += 15;
  else if (rate.verifications >= 2) score += 10;
  else score += 5;
  
  // Minimum deposit match (0-15 points)
  if (preferences.maxMinDeposit) {
    if (!rate.minDeposit || rate.minDeposit === 0) score += 15;
    else if (rate.minDeposit <= preferences.maxMinDeposit) score += 10;
    else score -= 10;
  }
  
  // Feature match (0-20 points)
  if (preferences.preferredFeatures && preferences.preferredFeatures.length > 0) {
    const matchingFeatures = rate.features?.filter((f: string) => 
      preferences.preferredFeatures!.includes(f)
    ).length || 0;
    
    const matchPercentage = matchingFeatures / preferences.preferredFeatures.length;
    score += matchPercentage * 20;
  }
  
  // Rate freshness (0-15 points)
  const daysSinceVerification = Math.floor(
    (Date.now() - new Date(rate.lastVerified).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysSinceVerification <= 7) score += 15;
  else if (daysSinceVerification <= 30) score += 10;
  else if (daysSinceVerification <= 90) score += 5;
  
  // Penalty for reports
  score -= rate.reports * 5;
  
  return Math.max(0, Math.min(100, score));
}

// Generate reasoning text
function generateReasoning(rate: any, preferences: UserPreferences): string {
  const reasons: string[] = [];
  
  const rateValue = rate.apy || rate.rate;
  if (rateValue >= 4.5) {
    reasons.push(`Excellent ${rateValue.toFixed(2)}% APY`);
  } else if (rateValue >= 3.5) {
    reasons.push(`Competitive ${rateValue.toFixed(2)}% APY`);
  } else {
    reasons.push(`${rateValue.toFixed(2)}% APY`);
  }
  
  if (rate.verifications >= 5) {
    reasons.push(`highly verified by community (${rate.verifications} verifications)`);
  }
  
  if (!rate.minDeposit || rate.minDeposit === 0) {
    reasons.push('no minimum deposit required');
  } else if (preferences.maxMinDeposit && rate.minDeposit <= preferences.maxMinDeposit) {
    reasons.push(`affordable $${rate.minDeposit} minimum deposit`);
  }
  
  if (preferences.preferredFeatures && rate.features) {
    const matchingFeatures = rate.features.filter((f: string) => 
      preferences.preferredFeatures!.includes(f)
    );
    if (matchingFeatures.length > 0) {
      reasons.push(`includes ${matchingFeatures.join(', ')}`);
    }
  }
  
  return reasons.join(', ') + '.';
}

export default router;
