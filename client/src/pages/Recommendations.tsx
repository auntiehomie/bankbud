import { useState } from 'react';
import { Sparkles, DollarSign, TrendingUp } from 'lucide-react';
import { api } from '../utils/api';
import { UserPreferences, AIRecommendation } from '../types';
import './Recommendations.css';

export default function Recommendations() {
  const [preferences, setPreferences] = useState<UserPreferences>({
    accountType: 'savings',
    minRate: undefined,
    maxMinDeposit: undefined,
    preferredFeatures: [],
    location: ''
  });

  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setShowResults(false);

    try {
      const results = await api.getRecommendations(preferences);
      setRecommendations(results);
      setShowResults(true);
    } catch (err) {
      setError('Failed to get recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFeatureToggle = (feature: string) => {
    setPreferences(prev => ({
      ...prev,
      preferredFeatures: prev.preferredFeatures?.includes(feature)
        ? prev.preferredFeatures.filter(f => f !== feature)
        : [...(prev.preferredFeatures || []), feature]
    }));
  };

  const features = [
    'No Monthly Fee',
    'ATM Fee Reimbursement',
    'Mobile Banking',
    'Branch Access',
    'Check Writing'
  ];

  return (
    <div className="recommendations">
      <div className="container">
        <div className="recommendations-header">
          <Sparkles size={48} />
          <h1>AI-Powered Recommendations</h1>
          <p>Tell us what you're looking for, and we'll find the best match</p>
        </div>

        {!showResults && (
          <form className="preferences-form" onSubmit={handleSubmit}>
            {error && <div className="error">{error}</div>}

            <div className="form-group">
              <label htmlFor="accountType">What type of account do you need?</label>
              <select
                id="accountType"
                required
                value={preferences.accountType}
                onChange={(e) => setPreferences({ ...preferences, accountType: e.target.value as any })}
              >
                <option value="savings">Savings Account</option>
                <option value="checking">Checking Account</option>
                <option value="cd">Certificate of Deposit (CD)</option>
                <option value="money-market">Money Market Account</option>
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="minRate">Minimum Rate (%)</label>
                <input
                  type="number"
                  id="minRate"
                  step="0.01"
                  min="0"
                  value={preferences.minRate || ''}
                  onChange={(e) => setPreferences({ ...preferences, minRate: parseFloat(e.target.value) || undefined })}
                  placeholder="e.g., 4.00"
                />
              </div>

              <div className="form-group">
                <label htmlFor="maxMinDeposit">Max Minimum Deposit ($)</label>
                <input
                  type="number"
                  id="maxMinDeposit"
                  min="0"
                  value={preferences.maxMinDeposit || ''}
                  onChange={(e) => setPreferences({ ...preferences, maxMinDeposit: parseInt(e.target.value) || undefined })}
                  placeholder="e.g., 5000"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Preferred Features (optional)</label>
              <div className="features-grid">
                {features.map(feature => (
                  <label key={feature} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={preferences.preferredFeatures?.includes(feature)}
                      onChange={() => handleFeatureToggle(feature)}
                    />
                    <span>{feature}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="location">Location (optional)</label>
              <input
                type="text"
                id="location"
                value={preferences.location || ''}
                onChange={(e) => setPreferences({ ...preferences, location: e.target.value })}
                placeholder="e.g., New York, NY"
              />
            </div>

            <button type="submit" className="btn btn-primary btn-large" disabled={loading}>
              {loading ? 'Analyzing...' : 'Get Recommendations'}
            </button>
          </form>
        )}

        {showResults && (
          <div className="results">
            <div className="results-header">
              <h2>Your Top Recommendations</h2>
              <button 
                className="btn btn-outline" 
                onClick={() => setShowResults(false)}
              >
                Search Again
              </button>
            </div>

            {recommendations.length === 0 ? (
              <div className="no-results">
                <p>No recommendations found matching your criteria. Try adjusting your preferences.</p>
              </div>
            ) : (
              <div className="recommendations-grid">
                {recommendations.map((rec, index) => (
                  <RecommendationCard key={rec.bankRate._id} recommendation={rec} rank={index + 1} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function RecommendationCard({ recommendation, rank }: { recommendation: AIRecommendation; rank: number }) {
  const { bankRate, score, reasoning } = recommendation;

  return (
    <div className="recommendation-card">
      <div className="recommendation-rank">#{rank}</div>
      <div className="recommendation-score">
        <Sparkles size={20} />
        <span>{Math.round(score)}% Match</span>
      </div>

      <h3>{bankRate.bankName}</h3>
      <span className="account-type-badge">{bankRate.accountType}</span>

      <div className="rate-highlight">
        <DollarSign size={24} />
        <span className="rate-value">{(bankRate.apy || bankRate.rate).toFixed(2)}%</span>
        <span className="rate-label">APY</span>
      </div>

      {bankRate.minDeposit && (
        <div className="detail-item">
          <TrendingUp size={16} />
          <span>Min. Deposit: ${bankRate.minDeposit.toLocaleString()}</span>
        </div>
      )}

      <div className="reasoning">
        <strong>Why this match:</strong>
        <p>{reasoning}</p>
      </div>

      {bankRate.features && bankRate.features.length > 0 && (
        <div className="features-list">
          {bankRate.features.map((feature, idx) => (
            <span key={idx} className="feature-tag">✓ {feature}</span>
          ))}
        </div>
      )}
    </div>
  );
}
