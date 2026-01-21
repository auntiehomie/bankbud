import { Router, Request, Response } from 'express';
import { fetchBankingNews } from '../services/newsService.js';

const router = Router();

// Get latest banking news
router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 6;
    const news = await fetchBankingNews(limit);
    res.json(news);
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ error: 'Failed to fetch banking news' });
  }
});

export default router;
