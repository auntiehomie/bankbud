import express from 'express';
import { ForumPost } from '../models/ForumPost.js';

const router = express.Router();

// Get all forum posts with filtering and sorting
router.get('/', async (req, res) => {
  try {
    const { category, sortBy = 'recent', limit = 20 } = req.query;

    const query: any = {};
    if (category && category !== 'all') {
      query.category = category;
    }

    let sort: any = { isPinned: -1, createdAt: -1 }; // Pinned first, then newest
    if (sortBy === 'popular') {
      sort = { isPinned: -1, views: -1, createdAt: -1 };
    } else if (sortBy === 'helpful') {
      sort = { isPinned: -1, helpful: -1, createdAt: -1 };
    } else if (sortBy === 'active') {
      sort = { isPinned: -1, updatedAt: -1 };
    }

    const posts = await ForumPost.find(query)
      .sort(sort)
      .limit(Number(limit));

    res.json(posts);
  } catch (error) {
    console.error('Error fetching forum posts:', error);
    res.status(500).json({ error: 'Failed to fetch forum posts' });
  }
});

// Get a single forum post by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const post = await ForumPost.findById(id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Increment view count
    post.views += 1;
    await post.save();

    res.json(post);
  } catch (error) {
    console.error('Error fetching forum post:', error);
    res.status(500).json({ error: 'Failed to fetch forum post' });
  }
});

// Create a new forum post
router.post('/', async (req, res) => {
  try {
    const { title, content, userName, userEmail, category } = req.body;

    // Validate required fields
    if (!title || !content || !userName || !userEmail || !category) {
      return res.status(400).json({ 
        error: 'Missing required fields: title, content, userName, userEmail, category' 
      });
    }

    // Validate title length
    if (title.length > 200) {
      return res.status(400).json({ error: 'Title must be 200 characters or less' });
    }

    // Validate content length
    if (content.length > 5000) {
      return res.status(400).json({ error: 'Content must be 5000 characters or less' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check for duplicate posts from same email within 2 minutes
    const recentPost = await ForumPost.findOne({
      userEmail: userEmail.toLowerCase(),
      createdAt: { $gte: new Date(Date.now() - 2 * 60 * 1000) }
    });

    if (recentPost) {
      return res.status(429).json({ 
        error: 'You can only create one post every 2 minutes' 
      });
    }

    // Create post
    const newPost = new ForumPost({
      title,
      content,
      userName,
      userEmail: userEmail.toLowerCase(),
      category,
      views: 0,
      replies: [],
      helpful: 0,
      isPinned: false
    });

    await newPost.save();

    res.json({ 
      message: 'Post created successfully',
      post: newPost 
    });
  } catch (error) {
    console.error('Error creating forum post:', error);
    res.status(500).json({ error: 'Failed to create forum post' });
  }
});

// Add a reply to a forum post
router.post('/:id/reply', async (req, res) => {
  try {
    const { id } = req.params;
    const { userName, userEmail, content } = req.body;

    // Validate required fields
    if (!userName || !userEmail || !content) {
      return res.status(400).json({ 
        error: 'Missing required fields: userName, userEmail, content' 
      });
    }

    // Validate content length
    if (content.length > 2000) {
      return res.status(400).json({ error: 'Reply must be 2000 characters or less' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const post = await ForumPost.findById(id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check for duplicate replies from same email within 1 minute
    const recentReply = post.replies.find(reply => 
      reply.userEmail === userEmail.toLowerCase() &&
      new Date(reply.createdAt).getTime() > Date.now() - 60 * 1000
    );

    if (recentReply) {
      return res.status(429).json({ 
        error: 'You can only reply once per minute' 
      });
    }

    // Add reply
    post.replies.push({
      userName,
      userEmail: userEmail.toLowerCase(),
      content,
      helpful: 0,
      createdAt: new Date()
    });

    await post.save();

    res.json({ 
      message: 'Reply added successfully',
      post 
    });
  } catch (error) {
    console.error('Error adding reply:', error);
    res.status(500).json({ error: 'Failed to add reply' });
  }
});

// Mark post as helpful
router.post('/:id/helpful', async (req, res) => {
  try {
    const { id } = req.params;

    const post = await ForumPost.findByIdAndUpdate(
      id,
      { $inc: { helpful: 1 } },
      { new: true }
    );

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({ 
      message: 'Marked as helpful',
      helpful: post.helpful
    });
  } catch (error) {
    console.error('Error marking post as helpful:', error);
    res.status(500).json({ error: 'Failed to mark post as helpful' });
  }
});

// Mark reply as helpful
router.post('/:postId/reply/:replyIndex/helpful', async (req, res) => {
  try {
    const { postId, replyIndex } = req.params;

    const post = await ForumPost.findById(postId);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const index = parseInt(replyIndex);
    if (index < 0 || index >= post.replies.length) {
      return res.status(404).json({ error: 'Reply not found' });
    }

    post.replies[index].helpful += 1;
    await post.save();

    res.json({ 
      message: 'Reply marked as helpful',
      helpful: post.replies[index].helpful
    });
  } catch (error) {
    console.error('Error marking reply as helpful:', error);
    res.status(500).json({ error: 'Failed to mark reply as helpful' });
  }
});

// Delete post (admin only - in production, add authentication)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const post = await ForumPost.findByIdAndDelete(id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

export default router;
