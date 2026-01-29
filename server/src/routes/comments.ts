import express from 'express';
import { Comment } from '../models/Comment';

const router = express.Router();

// Get comments for a specific bank
router.get('/bank/:bankName', async (req, res) => {
  try {
    const { bankName } = req.params;
    const { accountType, sortBy = 'recent' } = req.query;

    const query: any = { bankName };
    if (accountType) {
      query.accountType = accountType;
    }

    let sort: any = { createdAt: -1 }; // Default: most recent first
    if (sortBy === 'helpful') {
      sort = { helpful: -1, createdAt: -1 };
    } else if (sortBy === 'rating') {
      sort = { rating: -1, createdAt: -1 };
    }

    const comments = await Comment.find(query)
      .sort(sort)
      .limit(50);

    // Calculate average rating
    const avgRating = comments.length > 0
      ? comments.reduce((sum, c) => sum + c.rating, 0) / comments.length
      : 0;

    res.json({
      comments,
      count: comments.length,
      averageRating: Math.round(avgRating * 10) / 10
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Get all comments (for admin or general display)
router.get('/', async (req, res) => {
  try {
    const { limit = 20, sortBy = 'recent' } = req.query;

    let sort: any = { createdAt: -1 };
    if (sortBy === 'helpful') {
      sort = { helpful: -1, createdAt: -1 };
    }

    const comments = await Comment.find()
      .sort(sort)
      .limit(Number(limit));

    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Create a new comment
router.post('/', async (req, res) => {
  try {
    const { bankName, accountType, userName, userEmail, comment, rating } = req.body;

    // Validate required fields
    if (!bankName || !accountType || !userName || !userEmail || !comment || !rating) {
      return res.status(400).json({ 
        error: 'Missing required fields: bankName, accountType, userName, userEmail, comment, rating' 
      });
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate comment length
    if (comment.length > 1000) {
      return res.status(400).json({ error: 'Comment must be 1000 characters or less' });
    }

    // Check for duplicate comments from same email within 5 minutes
    const recentComment = await Comment.findOne({
      userEmail: userEmail.toLowerCase(),
      bankName,
      createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
    });

    if (recentComment) {
      return res.status(429).json({ 
        error: 'You can only submit one comment per bank every 5 minutes' 
      });
    }

    // Create comment
    const newComment = new Comment({
      bankName,
      accountType,
      userName,
      userEmail: userEmail.toLowerCase(),
      comment,
      rating,
      helpful: 0
    });

    await newComment.save();

    res.json({ 
      message: 'Comment posted successfully',
      comment: newComment 
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Failed to post comment' });
  }
});

// Mark comment as helpful
router.post('/:id/helpful', async (req, res) => {
  try {
    const { id } = req.params;

    const comment = await Comment.findByIdAndUpdate(
      id,
      { $inc: { helpful: 1 } },
      { new: true }
    );

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    res.json({ 
      message: 'Marked as helpful',
      helpful: comment.helpful
    });
  } catch (error) {
    console.error('Error marking comment as helpful:', error);
    res.status(500).json({ error: 'Failed to mark comment as helpful' });
  }
});

// Delete comment (admin only - in production, add authentication)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const comment = await Comment.findByIdAndDelete(id);

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

export default router;
