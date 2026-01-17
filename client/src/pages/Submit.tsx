import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send } from 'lucide-react';
import { api } from '../utils/api';
import { CommunitySubmission } from '../types';
import './Submit.css';

export default function Submit() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<CommunitySubmission>({
    bankName: '',
    accountType: 'savings',
    rate: 0,
    apy: 0,
    minDeposit: 0,
    term: undefined,
    features: [],
    source: '',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.submitRate(formData);
      setSuccess(true);
      setTimeout(() => {
        navigate('/compare');
      }, 2000);
    } catch (err) {
      setError('Failed to submit rate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFeatureToggle = (feature: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features?.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...(prev.features || []), feature]
    }));
  };

  const commonFeatures = [
    'No Monthly Fee',
    'ATM Fee Reimbursement',
    'Mobile Banking',
    'Online Banking',
    'Branch Access',
    'Check Writing',
    'Debit Card',
    'Direct Deposit Required'
  ];

  if (success) {
    return (
      <div className="submit-success">
        <div className="container">
          <div className="success-card">
            <h2>Thank You!</h2>
            <p>Your rate submission has been received and will be available to the community shortly.</p>
            <p>Redirecting to compare page...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="submit">
      <div className="container">
        <div className="submit-header">
          <Send size={48} />
          <h1>Submit a Bank Rate</h1>
          <p>Help the community by sharing rates you've found</p>
        </div>

        <form className="submit-form" onSubmit={handleSubmit}>
          {error && <div className="error">{error}</div>}

          <div className="form-group">
            <label htmlFor="bankName">Bank Name *</label>
            <input
              type="text"
              id="bankName"
              required
              value={formData.bankName}
              onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
              placeholder="e.g., Chase, Bank of America"
            />
          </div>

          <div className="form-group">
            <label htmlFor="accountType">Account Type *</label>
            <select
              id="accountType"
              required
              value={formData.accountType}
              onChange={(e) => setFormData({ ...formData, accountType: e.target.value as any })}
            >
              <option value="savings">Savings Account</option>
              <option value="checking">Checking Account</option>
              <option value="cd">Certificate of Deposit (CD)</option>
              <option value="money-market">Money Market Account</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="rate">Interest Rate (%) *</label>
              <input
                type="number"
                id="rate"
                required
                step="0.01"
                min="0"
                value={formData.rate}
                onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) })}
                placeholder="e.g., 4.50"
              />
            </div>

            <div className="form-group">
              <label htmlFor="apy">APY (%)</label>
              <input
                type="number"
                id="apy"
                step="0.01"
                min="0"
                value={formData.apy || ''}
                onChange={(e) => setFormData({ ...formData, apy: parseFloat(e.target.value) || undefined })}
                placeholder="e.g., 4.58"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="minDeposit">Minimum Deposit ($)</label>
              <input
                type="number"
                id="minDeposit"
                min="0"
                value={formData.minDeposit || ''}
                onChange={(e) => setFormData({ ...formData, minDeposit: parseInt(e.target.value) || undefined })}
                placeholder="e.g., 1000"
              />
            </div>

            {formData.accountType === 'cd' && (
              <div className="form-group">
                <label htmlFor="term">CD Term (months)</label>
                <input
                  type="number"
                  id="term"
                  min="1"
                  value={formData.term || ''}
                  onChange={(e) => setFormData({ ...formData, term: parseInt(e.target.value) || undefined })}
                  placeholder="e.g., 12"
                />
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Features (select all that apply)</label>
            <div className="features-grid">
              {commonFeatures.map(feature => (
                <label key={feature} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.features?.includes(feature)}
                    onChange={() => handleFeatureToggle(feature)}
                  />
                  <span>{feature}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="source">Source (optional)</label>
            <input
              type="url"
              id="source"
              value={formData.source || ''}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              placeholder="https://example.com/rates"
            />
            <small>Link to the bank's rate page for verification</small>
          </div>

          <div className="form-group">
            <label htmlFor="notes">Additional Notes (optional)</label>
            <textarea
              id="notes"
              rows={4}
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional information about this rate..."
            />
          </div>

          <button type="submit" className="btn btn-primary btn-large" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Rate'}
          </button>
        </form>
      </div>
    </div>
  );
}
