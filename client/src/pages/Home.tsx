import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Users, ArrowRight, MessageCircle } from 'lucide-react';
import { api } from '../utils/api';
import { BankRate } from '../types';
import './Home.css';

export default function Home() {
  const [topRates, setTopRates] = useState<Record<string, BankRate[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTopRates();
  }, []);

  const loadTopRates = async () => {
    try {
      const [savings, checking, cd] = await Promise.all([
        api.getTopRates('savings', 3),
        api.getTopRates('checking', 3),
        api.getTopRates('cd', 3)
      ]);
      
      setTopRates({ savings, checking, cd });
    } catch (error) {
      console.error('Failed to load rates:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home">
      <section className="hero">
        <div className="container">
          <h1>Find Your Perfect Bank</h1>
          <p className="hero-subtitle">
            Community-driven bank rate comparisons powered by AI recommendations
          </p>
          
          <div className="hero-features">
            <div className="feature-card">
              <MessageCircle size={48} />
              <h3>AI Advisor</h3>
              <p>Chat with our AI to get personalized banking advice</p>
            </div>
            
            <div className="feature-card">
              <TrendingUp size={48} />
              <h3>Best Rates</h3>
              <p>Compare real-time rates from banks across the country</p>
            </div>
            
            <div className="feature-card">
              <Users size={48} />
              <h3>Community Verified</h3>
              <p>Rates submitted and verified by users like you</p>
            </div>
          </div>
          
          <div className="hero-actions">
            <Link to="/ai-advisor" className="btn btn-primary btn-large">
              <MessageCircle size={20} />
              Chat with AI Advisor
            </Link>
            <Link to="/compare" className="btn btn-outline btn-large">
              Compare Rates
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </section>

      <section className="top-rates">
        <div className="container">
          <h2>Today's Top Rates</h2>
          
          {loading ? (
            <div className="loading">Loading rates...</div>
          ) : (
            <div className="rates-grid">
              <RateSection title="Savings Accounts" rates={topRates.savings} type="savings" />
              <RateSection title="Checking Accounts" rates={topRates.checking} type="checking" />
              <RateSection title="Certificates of Deposit" rates={topRates.cd} type="cd" />
            </div>
          )}
        </div>
      </section>

      <section className="cta-section">
        <div className="container">
          <h2>Found a Great Rate?</h2>
          <p>Help the community by sharing rates you discover</p>
          <Link to="/submit" className="btn btn-secondary btn-large">
            Submit a Rate
          </Link>
        </div>
      </section>
    </div>
  );
}

function RateSection({ title, rates, type }: { title: string; rates: BankRate[]; type: string }) {
  return (
    <div className="rate-section">
      <h3>{title}</h3>
      {rates && rates.length > 0 ? (
        <div className="rate-list">
          {rates.map((rate) => (
            <div key={rate._id} className="rate-item">
              <div className="rate-bank">{rate.bankName}</div>
              <div className="rate-value">{rate.apy || rate.rate}% APY</div>
              <div className="rate-info-row">
                {rate.scrapedUrl ? (
                  <a 
                    href={rate.scrapedUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="rate-verified-link"
                    title="View source and verifications"
                  >
                    ✓ {rate.verifications} verifications
                  </a>
                ) : (
                  <div className="rate-verified">
                    ✓ {rate.verifications} verifications
                  </div>
                )}
                {rate.phone && (
                  <a 
                    href={`tel:${rate.phone}`} 
                    className="rate-phone-link"
                    title="Call to verify rate"
                  >
                    📞 Verify
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="no-rates">No rates available yet. Be the first to submit!</p>
      )}
      <Link to={`/compare?type=${type}`} className="view-all">
        View All {title} →
      </Link>
    </div>
  );
}
