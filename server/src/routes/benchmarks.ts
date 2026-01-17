import express from 'express';
import { fetchBenchmarkRates, getValidationBenchmarks } from '../services/fredService.js';

const router = express.Router();

/**
 * GET /api/benchmarks
 * Get current benchmark rates from Federal Reserve
 */
router.get('/', async (req, res) => {
  try {
    const rates = await fetchBenchmarkRates();
    res.json({
      success: true,
      data: rates,
      source: 'Federal Reserve Economic Data (FRED)',
    });
  } catch (error) {
    console.error('Error fetching benchmarks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch benchmark rates',
    });
  }
});

/**
 * GET /api/benchmarks/validation
 * Get validation ranges for rate checking
 */
router.get('/validation', async (req, res) => {
  try {
    const benchmarks = await getValidationBenchmarks();
    res.json({
      success: true,
      data: benchmarks,
      description: 'Acceptable rate ranges based on national averages',
    });
  } catch (error) {
    console.error('Error fetching validation benchmarks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch validation benchmarks',
    });
  }
});

export default router;
