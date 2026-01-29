import { useState, useEffect } from 'react';
import { MessageSquare, ThumbsUp, Star } from 'lucide-react';
import { api } from '../utils/api';
import './Comments.css';

interface Comment {
  _id: string;
  bankName: string;
  accountType: string;
  userName: string;
  userEmail: string;
  comment: string;
  rating: number;
  helpful: number;
  createdAt: string;
}

interface CommentsProps {
  bankName: string;
  accountType: string;
}

export default function Comments({ bankName, accountType }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'helpful' | 'rating'>('recent');
  
  // Form fields
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
    // Load saved user info
    const savedName = localStorage.getItem('userName');
    const savedEmail = localStorage.getItem('userEmail');
    if (savedName) setUserName(savedName);
    if (savedEmail) setUserEmail(savedEmail);
  }, [bankName, accountType, sortBy]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/comments/bank/${encodeURIComponent(bankName)}?accountType=${accountType}&sortBy=${sortBy}`);
      setComments(response.comments);
      setAverageRating(response.averageRating);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);
      await api.post('/comments', {
        bankName,
        accountType,
        userName,
        userEmail,
        comment,
        rating
      });

      // Save user info
      localStorage.setItem('userName', userName);
      localStorage.setItem('userEmail', userEmail);

      // Reset form
      setComment('');
      setRating(5);
      setShowForm(false);

      // Reload comments
      await loadComments();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const markHelpful = async (commentId: string) => {
    try {
      await api.post(`/comments/${commentId}/helpful`);
      // Reload comments to show updated helpful count
      await loadComments();
    } catch (error) {
      console.error('Error marking comment as helpful:', error);
    }
  };

  const renderStars = (count: number, interactive = false, onSelect?: (n: number) => void) => {
    return (
      <div className="stars">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            size={interactive ? 24 : 16}
            fill={n <= count ? '#fbbf24' : 'none'}
            stroke={n <= count ? '#fbbf24' : '#cbd5e0'}
            style={{ cursor: interactive ? 'pointer' : 'default' }}
            onClick={() => interactive && onSelect && onSelect(n)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="comments-section">
      <div className="comments-header">
        <div className="comments-title">
          <MessageSquare size={20} />
          <h3>Community Reviews ({comments.length})</h3>
        </div>
        {comments.length > 0 && (
          <div className="average-rating">
            {renderStars(Math.round(averageRating))}
            <span>{averageRating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {comments.length === 0 && !loading && (
        <div className="no-comments">
          <p>No reviews yet. Be the first to share your experience!</p>
        </div>
      )}

      {!showForm && (
        <button className="btn-write-review" onClick={() => setShowForm(true)}>
          ✍️ Write a Review
        </button>
      )}

      {showForm && (
        <form className="comment-form" onSubmit={submitComment}>
          <h4>Write Your Review</h4>
          
          <div className="form-row">
            <div className="form-group">
              <label>Your Name</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>
            <div className="form-group">
              <label>Your Email</label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="john@example.com"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Rating</label>
            {renderStars(rating, true, setRating)}
          </div>

          <div className="form-group">
            <label>Your Review</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience with this bank's rates, service, or account features..."
              maxLength={1000}
              rows={4}
              required
            />
            <small>{comment.length}/1000 characters</small>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-text" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Posting...' : 'Post Review'}
            </button>
          </div>
        </form>
      )}

      {comments.length > 0 && (
        <>
          <div className="comments-controls">
            <label>Sort by:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
              <option value="recent">Most Recent</option>
              <option value="helpful">Most Helpful</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>

          <div className="comments-list">
            {comments.map((c) => (
              <div key={c._id} className="comment-card">
                <div className="comment-header">
                  <div>
                    <strong>{c.userName}</strong>
                    <span className="comment-date">
                      {new Date(c.createdAt).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </span>
                  </div>
                  {renderStars(c.rating)}
                </div>
                <p className="comment-text">{c.comment}</p>
                <button 
                  className="btn-helpful"
                  onClick={() => markHelpful(c._id)}
                >
                  <ThumbsUp size={14} />
                  Helpful ({c.helpful})
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
