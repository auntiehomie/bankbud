import { useEffect, useState } from 'react';
import { Newspaper, TrendingUp, AlertCircle, Building2, Users, Scale, DollarSign, PiggyBank } from 'lucide-react';
import { api } from '../utils/api';
import './News.css';

interface NewsArticle {
  title: string;
  summary: string;
  source: string;
  url: string;
  date: string;
  category: string;
}

export default function News() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async () => {
    try {
      setLoading(true);
      const articles = await api.getNews();
      setNews(articles);
    } catch (error) {
      console.error('Failed to load news:', error);
    } finally {
      setLoading(false);
    }
  };

  const categoryIcons: Record<string, JSX.Element> = {
    'rate-change': <TrendingUp size={20} />,
    'new-product': <Building2 size={20} />,
    'regulation': <Scale size={20} />,
    'fed-news': <AlertCircle size={20} />,
    'market-trend': <Users size={20} />,
    'money-tips': <DollarSign size={20} />,
    'savings-advice': <PiggyBank size={20} />
  };

  const categoryLabels: Record<string, string> = {
    'rate-change': 'Rate Change',
    'new-product': 'New Product',
    'regulation': 'Regulation',
    'fed-news': 'Federal Reserve',
    'market-trend': 'Market Trend',
    'money-tips': 'Money Tips',
    'savings-advice': 'Savings Advice'
  };

  const filteredNews = filter === 'all' 
    ? news 
    : news.filter(article => article.category === filter);

  if (loading) {
    return (
      <div className="news-loading">
        <div className="loading-spinner"></div>
        <p>Loading latest banking news...</p>
      </div>
    );
  }

  return (
    <div className="news-page">
      <div className="container">
        <div className="news-header">
          <div className="news-title-section">
            <Newspaper size={40} />
            <div>
              <h1>Banking News</h1>
              <p>Stay informed with the latest updates from the banking industry</p>
            </div>
          </div>
          <button className="btn btn-primary" onClick={loadNews}>
            🔄 Refresh News
          </button>
        </div>

        <div className="news-filters">
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All News
          </button>
          <button 
            className={`filter-btn ${filter === 'rate-change' ? 'active' : ''}`}
            onClick={() => setFilter('rate-change')}
          >
            <TrendingUp size={16} />
            Rate Changes
          </button>
          <button 
            className={`filter-btn ${filter === 'new-product' ? 'active' : ''}`}
            onClick={() => setFilter('new-product')}
          >
            <Building2 size={16} />
            New Products
          </button>
          <button 
            className={`filter-btn ${filter === 'fed-news' ? 'active' : ''}`}
            onClick={() => setFilter('fed-news')}
          >
            <AlertCircle size={16} />
            Federal Reserve
          </button>
          <button 
            className={`filter-btn ${filter === 'regulation' ? 'active' : ''}`}
            onClick={() => setFilter('regulation')}
          >
            <Scale size={16} />
            Regulations
          </button>
          <button 
            className={`filter-btn ${filter === 'money-tips' ? 'active' : ''}`}
            onClick={() => setFilter('money-tips')}
          >
            <DollarSign size={16} />
            Money Tips
          </button>
          <button 
            className={`filter-btn ${filter === 'savings-advice' ? 'active' : ''}`}
            onClick={() => setFilter('savings-advice')}
          >
            <PiggyBank size={16} />
            Savings Advice
          </button>
        </div>

        <div className="news-grid">
          {filteredNews.length === 0 ? (
            <div className="no-news">
              <Newspaper size={48} />
              <p>No news articles found</p>
            </div>
          ) : (
            filteredNews.map((article, index) => (
              <article key={index} className="news-card">
                <div className="news-card-header">
                  <span className={`news-category ${article.category}`}>
                    {categoryIcons[article.category] || <Newspaper size={20} />}
                    {categoryLabels[article.category] || article.category}
                  </span>
                  <span className="news-date">{article.date}</span>
                </div>
                <h3 className="news-title">{article.title}</h3>
                <p className="news-summary">{article.summary}</p>
                <div className="news-card-footer">
                  <span className="news-source">📰 {article.source}</span>
                  {article.url && article.url !== '#' && (
                    <a 
                      href={article.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="news-link"
                    >
                      Read More →
                    </a>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
