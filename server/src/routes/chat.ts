import { Router, Request, Response } from 'express';
import { chatWithAI, getConversationHistory, clearConversation } from '../services/chatService.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Send a message to the AI advisor
router.post('/message', async (req: Request, res: Response) => {
  try {
    const { sessionId, message, includeRates } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Generate sessionId if not provided
    const actualSessionId = sessionId || uuidv4();

    const response = await chatWithAI({
      sessionId: actualSessionId,
      message,
      includeRates: includeRates !== false
    });

    res.json({
      ...response,
      sessionId: actualSessionId
    });
  } catch (error: any) {
    console.error('Error in chat message:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to process message',
      fallback: 'I apologize, but I\'m having trouble connecting right now. Please try again or browse our Compare Rates page for current offers.'
    });
  }
});

// Get conversation history
router.get('/history/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    const conversation = await getConversationHistory(sessionId);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({
      messages: conversation.messages,
      userPreferences: conversation.userPreferences,
      summary: conversation.summary,
      lastActivity: conversation.lastActivity
    });
  } catch (error) {
    console.error('Error fetching conversation history:', error);
    res.status(500).json({ error: 'Failed to fetch conversation history' });
  }
});

// Clear conversation
router.delete('/history/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    
    await clearConversation(sessionId);
    
    res.json({ message: 'Conversation cleared successfully' });
  } catch (error) {
    console.error('Error clearing conversation:', error);
    res.status(500).json({ error: 'Failed to clear conversation' });
  }
});

// Get BankBud status
router.get('/status', (req: Request, res: Response) => {
  const isConfigured = !!(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here');
  
  res.json({
    available: isConfigured,
    message: isConfigured 
      ? 'BankBud is ready to help!' 
      : 'BankBud requires API key configuration'
  });
});

export default router;
