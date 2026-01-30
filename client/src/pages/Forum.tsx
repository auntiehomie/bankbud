import { useState, useEffect } from 'react';
import { MessageSquare, ThumbsUp, Eye, Clock, Users, Plus, ArrowLeft } from 'lucide-react';
import { api } from '../utils/api';
import './Forum.css';

interface ForumReply {
  userName: string;
  userEmail: string;
  content: string;
  helpful: number;
  createdAt: string;
}

interface ForumPost {
  _id: string;
  title: string;
  content: string;
  userName: string;
  category: string;
  views: number;
  replies: ForumReply[];
  helpful: number;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function Forum() {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form fields
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [postCategory, setPostCategory] = useState('general');
  const [replyContent, setReplyContent] = useState('');

  useEffect(() => {
    // Load saved user info
    const savedName = localStorage.getItem('userName');
    const savedEmail = localStorage.getItem('userEmail');
    if (savedName) setUserName(savedName);
    if (savedEmail) setUserEmail(savedEmail);

    loadPosts();
  }, [category, sortBy]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/forum?category=${category}&sortBy=${sortBy}`);
      setPosts(response);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPost = async (postId: string) => {
    try {
      const response = await api.get(`/forum/${postId}`);
      setSelectedPost(response);
    } catch (error) {
      console.error('Error loading post:', error);
    }
  };

  const createPost = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      await api.post('/forum', {
        title,
        content,
        userName,
        userEmail,
        category: postCategory
      });

      // Save user info
      localStorage.setItem('userName', userName);
      localStorage.setItem('userEmail', userEmail);

      // Reset form
      setTitle('');
      setContent('');
      setPostCategory('general');
      setShowCreateForm(false);

      // Reload posts
      await loadPosts();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  const addReply = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPost) return;

    try {
      setLoading(true);
      const response = await api.post(`/forum/${selectedPost._id}/reply`, {
        userName,
        userEmail,
        content: replyContent
      });

      setSelectedPost(response.post);
      setReplyContent('');

      // Save user info
      localStorage.setItem('userName', userName);
      localStorage.setItem('userEmail', userEmail);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to add reply');
    } finally {
      setLoading(false);
    }
  };

  const markHelpful = async (postId: string) => {
    try {
      await api.post(`/forum/${postId}/helpful`);
      if (selectedPost && selectedPost._id === postId) {
        setSelectedPost({ ...selectedPost, helpful: selectedPost.helpful + 1 });
      }
      await loadPosts();
    } catch (error) {
      console.error('Error marking post as helpful:', error);
    }
  };

  const markReplyHelpful = async (postId: string, replyIndex: number) => {
    try {
      await api.post(`/forum/${postId}/reply/${replyIndex}/helpful`);
      if (selectedPost) {
        const updatedPost = { ...selectedPost };
        updatedPost.replies[replyIndex].helpful += 1;
        setSelectedPost(updatedPost);
      }
    } catch (error) {
      console.error('Error marking reply as helpful:', error);
    }
  };

  const categoryLabels: Record<string, string> = {
    'all': 'All Topics',
    'savings': 'Savings Accounts',
    'checking': 'Checking Accounts',
    'cd': 'CDs & Time Deposits',
    'money-market': 'Money Market Accounts',
    'credit-union': 'Credit Unions',
    'online-banking': 'Online Banking',
    'general': 'General Discussion',
    'tips': 'Tips & Advice',
    'questions': 'Questions'
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Show post detail view
  if (selectedPost) {
    return (
      <div className="forum">
        <div className="container">
          <button className="btn-back" onClick={() => setSelectedPost(null)}>
            <ArrowLeft size={20} />
            Back to Forum
          </button>

          <div className="post-detail">
            <div className="post-header">
              <span className={`post-category category-${selectedPost.category}`}>
                {categoryLabels[selectedPost.category]}
              </span>
              <h1>{selectedPost.title}</h1>
              <div className="post-meta">
                <span className="post-author">{selectedPost.userName}</span>
                <span className="post-date">{formatDate(selectedPost.createdAt)}</span>
              </div>
            </div>

            <div className="post-content">
              <p>{selectedPost.content}</p>
            </div>

            <div className="post-stats">
              <span><Eye size={16} /> {selectedPost.views} views</span>
              <span><MessageSquare size={16} /> {selectedPost.replies.length} replies</span>
              <button className="btn-helpful" onClick={() => markHelpful(selectedPost._id)}>
                <ThumbsUp size={16} />
                Helpful ({selectedPost.helpful})
              </button>
            </div>

            <div className="replies-section">
              <h2>{selectedPost.replies.length} Replies</h2>

              {selectedPost.replies.map((reply, index) => (
                <div key={index} className="reply-card">
                  <div className="reply-header">
                    <strong>{reply.userName}</strong>
                    <span className="reply-date">{formatDate(reply.createdAt)}</span>
                  </div>
                  <p className="reply-content">{reply.content}</p>
                  <button 
                    className="btn-helpful-small"
                    onClick={() => markReplyHelpful(selectedPost._id, index)}
                  >
                    <ThumbsUp size={14} />
                    Helpful ({reply.helpful})
                  </button>
                </div>
              ))}

              <form onSubmit={addReply} className="reply-form">
                <h3>Add Your Reply</h3>
                <div className="form-row">
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Your name"
                    required
                  />
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                  />
                </div>
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Share your thoughts..."
                  maxLength={2000}
                  rows={4}
                  required
                />
                <small>{replyContent.length}/2000 characters</small>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Posting...' : 'Post Reply'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show forum list view
  return (
    <div className="forum">
      <div className="container">
        <div className="forum-header">
          <div>
            <h1>Community Forum</h1>
            <p>Share experiences, ask questions, and connect with other savers</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreateForm(!showCreateForm)}>
            <Plus size={20} />
            New Topic
          </button>
        </div>

        {showCreateForm && (
          <form onSubmit={createPost} className="create-post-form">
            <h2>Create New Topic</h2>
            <div className="form-row">
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Your name"
                required
              />
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="your@email.com"
                required
              />
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Topic title..."
              maxLength={200}
              required
            />
            <select
              value={postCategory}
              onChange={(e) => setPostCategory(e.target.value)}
            >
              <option value="general">General Discussion</option>
              <option value="savings">Savings Accounts</option>
              <option value="checking">Checking Accounts</option>
              <option value="cd">CDs & Time Deposits</option>
              <option value="money-market">Money Market Accounts</option>
              <option value="credit-union">Credit Unions</option>
              <option value="online-banking">Online Banking</option>
              <option value="tips">Tips & Advice</option>
              <option value="questions">Questions</option>
            </select>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your thoughts, experiences, or questions..."
              maxLength={5000}
              rows={6}
              required
            />
            <small>{content.length}/5000 characters</small>
            <div className="form-actions">
              <button type="button" className="btn btn-text" onClick={() => setShowCreateForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Creating...' : 'Create Topic'}
              </button>
            </div>
          </form>
        )}

        <div className="forum-controls">
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">All Topics</option>
            <option value="savings">Savings Accounts</option>
            <option value="checking">Checking Accounts</option>
            <option value="cd">CDs & Time Deposits</option>
            <option value="money-market">Money Market</option>
            <option value="credit-union">Credit Unions</option>
            <option value="online-banking">Online Banking</option>
            <option value="general">General</option>
            <option value="tips">Tips & Advice</option>
            <option value="questions">Questions</option>
          </select>

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="recent">Most Recent</option>
            <option value="popular">Most Popular</option>
            <option value="helpful">Most Helpful</option>
            <option value="active">Most Active</option>
          </select>
        </div>

        {loading && <p className="loading-text">Loading posts...</p>}

        {!loading && posts.length === 0 && (
          <div className="empty-state">
            <Users size={48} />
            <h2>No topics yet</h2>
            <p>Be the first to start a discussion!</p>
          </div>
        )}

        <div className="posts-list">
          {posts.map((post) => (
            <div key={post._id} className="post-card" onClick={() => loadPost(post._id)}>
              {post.isPinned && <span className="pinned-badge">📌 Pinned</span>}
              <div className="post-card-header">
                <span className={`post-category category-${post.category}`}>
                  {categoryLabels[post.category]}
                </span>
                <h3>{post.title}</h3>
              </div>
              <p className="post-preview">{post.content.substring(0, 150)}...</p>
              <div className="post-card-footer">
                <span className="post-author">{post.userName}</span>
                <span className="post-date"><Clock size={14} /> {formatDate(post.createdAt)}</span>
                <span><Eye size={14} /> {post.views}</span>
                <span><MessageSquare size={14} /> {post.replies.length}</span>
                <span><ThumbsUp size={14} /> {post.helpful}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
