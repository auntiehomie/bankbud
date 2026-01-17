import { useState, useEffect } from 'react';
import { Filter, TrendingUp, CheckCircle, AlertCircle, X } from 'lucide-react';
import { api } from '../utils/api';
import { BankRate } from '../types';
import { useStore } from '../store';
import ScraperStatus from '../components/ScraperStatus';
import BenchmarkRates from '../components/BenchmarkRates';
import './Compare.css';

export default function Compare() {
  const { rates, setRates, loading, setLoading, error, setError } = useStore();
  const [accountType, setAccountType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'rate' | 'verifications'>('rate');
  const [filteredRates, setFilteredRates] = useState<BankRate[]>([]);
  const [recentRates, setRecentRates] = useState<BankRate[]>([]);
  const [zipCode, setZipCode] = useState<string>('');
  const [stateFilter] = useState<string>('');
  const [showModal, setShowModal] = useState<{ type: 'verify' | 'report' | null, rateId: string | null, rate: BankRate | null }>({ type: null, rateId: null, rate: null });
  const [verifyType, setVerifyType] = useState<'seen' | 'false' | null>(null);
  const [reportReason, setReportReason] = useState('');

  useEffect(() => {
    loadRates();
  }, []);

  useEffect(() => {
    filterAndSortRates();
    getRecentSubmissions();
  }, [rates, accountType, sortBy]);

  const loadRates = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (accountType !== 'all') params.accountType = accountType;
      if (zipCode) params.zipCode = zipCode;
      if (stateFilter) params.state = stateFilter;
      
      const data = await api.getRates(params.accountType);
      setRates(data);
    } catch (err) {
      setError('Failed to load rates. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortRates = () => {
    let filtered = accountType === 'all' 
      ? rates 
      : rates.filter(r => r.accountType === accountType);

    filtered.sort((a, b) => {
      if (sortBy === 'rate') {
        return (b.apy || b.rate) - (a.apy || a.rate);
      } else {
        return b.verifications - a.verifications;
      }
    });

    setFilteredRates(filtered);
  };

  // Group rates by account type when showing all
  const groupedRates = () => {
    if (accountType !== 'all') {
      return { [accountType]: filteredRates };
    }

    const groups: { [key: string]: BankRate[] } = {};
    
    filteredRates.forEach(rate => {
      if (!groups[rate.accountType]) {
        groups[rate.accountType] = [];
      }
      groups[rate.accountType].push(rate);
    });

    return groups;
  };

  const accountTypeInfo: { [key: string]: { label: string; icon: string; description: string } } = {
    savings: { 
      label: 'Savings Accounts', 
      icon: '💰',
      description: 'High-yield savings for growing your money'
    },
    checking: { 
      label: 'Checking Accounts', 
      icon: '💳',
      description: 'Everyday accounts for bills and transactions'
    },
    cd: { 
      label: 'Certificates of Deposit', 
      icon: '📈',
      description: 'Fixed-rate accounts with guaranteed returns'
    },
    'money-market': { 
      label: 'Money Market Accounts', 
      icon: '💵',
      description: 'Higher rates with limited transactions'
    },
  };

  const getRecentSubmissions = () => {
    // Get the 5 most recent community-submitted rates
    const communityRates = rates
      .filter(r => r.dataSource === 'community')
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 5);
    setRecentRates(communityRates);
  };

  const handleVerify = (rateId: string, rate: BankRate) => {
    setShowModal({ type: 'verify', rateId, rate });
  };

  const handleReport = (rateId: string, rate: BankRate) => {
    setShowModal({ type: 'report', rateId, rate });
  };

  const submitVerification = async () => {
    if (!showModal.rateId || !verifyType) return;

    try {
      await api.verifyRate(showModal.rateId);
      setShowModal({ type: null, rateId: null, rate: null });
      setVerifyType(null);
      loadRates();
    } catch (err) {
      console.error('Failed to verify rate:', err);
      alert('Failed to submit verification. Please try again.');
    }
  };

  const submitReport = async () => {
    if (!showModal.rateId || !reportReason) return;

    try {
      await api.reportRate(showModal.rateId, reportReason);
      setShowModal({ type: null, rateId: null, rate: null });
      setReportReason('');
      alert('Thank you for your report. We will review it shortly.');
      loadRates();
    } catch (err) {
      console.error('Failed to report rate:', err);
      alert('Failed to submit report. Please try again.');
    }
  };

  const closeModal = () => {
    setShowModal({ type: null, rateId: null, rate: null });
    setVerifyType(null);
    setReportReason('');
  };

  if (loading) {
    return <div className="loading">Loading rates...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="compare">
      <div className="container">
        <div className="compare-header">
          <h1>Compare Bank Rates</h1>
          <p>Find the best rates verified by our community and updated automatically</p>
        </div>

        <ScraperStatus />

        <BenchmarkRates />

        {recentRates.length > 0 && (
          <div className="recent-submissions">
            <div className="recent-header">
              <CheckCircle size={20} />
              <h2>Recently Submitted by Community</h2>
              <span className="recent-count">{recentRates.length} new</span>
            </div>
            <div className="recent-rates">
              {recentRates.map((rate) => (
                <RateCard 
                  key={rate._id} 
                  rate={rate} 
                  onVerify={handleVerify}
                  onReport={handleReport}
                />
              ))}
            </div>
          </div>
        )}

        <div className="filters">
          <div className="filter-group">
            <Filter size={20} />
            <label>Account Type:</label>
            <select value={accountType} onChange={(e) => setAccountType(e.target.value)}>
              <option value="all">All Types</option>
              <option value="savings">Savings</option>
              <option value="checking">Checking</option>
              <option value="cd">CD</option>
              <option value="money-market">Money Market</option>
            </select>
          </div>

          <div className="filter-group">
            <TrendingUp size={20} />
            <label>Sort By:</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'rate' | 'verifications')}>
              <option value="rate">Highest Rate</option>
              <option value="verifications">Most Verified</option>
            </select>
          </div>

          <div className="filter-group location-search">
            <label>Zip Code:</label>
            <input
              type="text"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              placeholder="Enter zip code"
              maxLength={5}
            />
            <button 
              className="btn-small btn-primary" 
              onClick={loadRates}
              disabled={!zipCode || zipCode.length !== 5}
            >
              Search
            </button>
            {zipCode && (
              <button 
                className="btn-small btn-text" 
                onClick={() => { setZipCode(''); loadRates(); }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="rates-table">
          {filteredRates.length === 0 ? (
            <div className="no-results">
              <p>No rates found. Be the first to submit one!</p>
            </div>
          ) : accountType === 'all' ? (
            // Grouped view when showing all types
            Object.entries(groupedRates()).map(([type, ratesInGroup]) => 
              ratesInGroup.length > 0 && (
                <div key={type} className="rate-group">
                  <div className="rate-group-header">
                    <span className="rate-group-icon">{accountTypeInfo[type]?.icon}</span>
                    <div className="rate-group-info">
                      <h2>{accountTypeInfo[type]?.label || type}</h2>
                      <p>{accountTypeInfo[type]?.description}</p>
                    </div>
                    <span className="rate-count">{ratesInGroup.length} {ratesInGroup.length === 1 ? 'option' : 'options'}</span>
                  </div>
                  <div className="rate-cards">
                    {ratesInGroup.map((rate) => (
                      <RateCard 
                        key={rate._id} 
                        rate={rate} 
                        onVerify={handleVerify}
                        onReport={handleReport}
                      />
                    ))}
                  </div>
                </div>
              )
            )
          ) : (
            // Simple list view when filtered by type
            <div className="rate-cards">
              {filteredRates.map((rate) => (
                <RateCard 
                  key={rate._id} 
                  rate={rate} 
                  onVerify={handleVerify}
                  onReport={handleReport}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Verification/Report Modal */}
      {showModal.type && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>
              <X size={20} />
            </button>

            {showModal.type === 'verify' && (
              <>
                <h2>Verify Rate</h2>
                <div className="modal-rate-info">
                  <h3>{showModal.rate?.bankName}</h3>
                  <p className="modal-rate-display">
                    <span className="rate-number">{(showModal.rate?.apy || showModal.rate?.rate || 0).toFixed(2)}%</span>
                    <span className="rate-label"> APY</span>
                  </p>
                  <p className="modal-account-type">{showModal.rate?.accountType}</p>
                  {showModal.rate?.scrapedUrl && (
                    <a 
                      href={showModal.rate.scrapedUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="modal-source-link"
                    >
                      View Official Source →
                    </a>
                  )}
                </div>

                <p className="modal-description">
                  Help the community by verifying this rate:
                </p>

                <div className="verification-options">
                  <button
                    className={`verification-option ${verifyType === 'seen' ? 'selected' : ''}`}
                    onClick={() => setVerifyType('seen')}
                  >
                    <CheckCircle size={24} />
                    <div>
                      <strong>I've seen this rate</strong>
                      <p>I can confirm this rate is currently available</p>
                    </div>
                  </button>
                </div>

                <div className="modal-actions">
                  <button className="btn btn-text" onClick={closeModal}>
                    Cancel
                  </button>
                  <button 
                    className="btn btn-primary" 
                    onClick={submitVerification}
                    disabled={!verifyType}
                  >
                    Submit Verification
                  </button>
                </div>
              </>
            )}

            {showModal.type === 'report' && (
              <>
                <h2>Report Rate Issue</h2>
                <div className="modal-rate-info">
                  <h3>{showModal.rate?.bankName}</h3>
                  <p className="modal-rate-display">
                    <span className="rate-number">{(showModal.rate?.apy || showModal.rate?.rate || 0).toFixed(2)}%</span>
                    <span className="rate-label"> APY</span>
                  </p>
                  <p className="modal-account-type">{showModal.rate?.accountType}</p>
                </div>

                <p className="modal-description">
                  Let us know what's wrong with this rate:
                </p>

                <div className="verification-options">
                  <button
                    className={`verification-option ${reportReason === 'Rate is incorrect or outdated' ? 'selected' : ''}`}
                    onClick={() => setReportReason('Rate is incorrect or outdated')}
                  >
                    <AlertCircle size={24} />
                    <div>
                      <strong>Rate is incorrect</strong>
                      <p>This rate is false or no longer available</p>
                    </div>
                  </button>
                  <button
                    className={`verification-option ${reportReason === 'Misleading information' ? 'selected' : ''}`}
                    onClick={() => setReportReason('Misleading information')}
                  >
                    <AlertCircle size={24} />
                    <div>
                      <strong>Misleading information</strong>
                      <p>The details or requirements are misleading</p>
                    </div>
                  </button>
                  <button
                    className={`verification-option ${reportReason === 'Spam or duplicate' ? 'selected' : ''}`}
                    onClick={() => setReportReason('Spam or duplicate')}
                  >
                    <AlertCircle size={24} />
                    <div>
                      <strong>Spam or duplicate</strong>
                      <p>This entry appears to be spam or a duplicate</p>
                    </div>
                  </button>
                </div>

                <div className="modal-actions">
                  <button className="btn btn-text" onClick={closeModal}>
                    Cancel
                  </button>
                  <button 
                    className="btn btn-danger" 
                    onClick={submitReport}
                    disabled={!reportReason}
                  >
                    Submit Report
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RateCard({ 
  rate, 
  onVerify, 
  onReport 
}: { 
  rate: BankRate; 
  onVerify: (id: string, rate: BankRate) => void;
  onReport: (id: string, rate: BankRate) => void;
}) {
  return (
    <div className="rate-card">
      <div className="rate-card-header">
        <div>
          <h3>{rate.bankName}</h3>
          <span className="account-type-badge">{rate.accountType}</span>
          <span className={`availability-badge ${rate.availability}`}>
            {rate.availability === 'national' ? '🌎 National' : 
             rate.availability === 'regional' ? '📍 Regional' : 
             '🏠 Local'}
          </span>
          {rate.dataSource === 'scraped' && (
            <span className="data-source-badge">🤖 Auto-updated</span>
          )}
          {rate.dataSource === 'community' && (
            <span className="data-source-badge community">👥 Community</span>
          )}
          {rate.location && (
            <div className="location-info">
              {rate.location.city && rate.location.state && (
                <small>{rate.location.city}, {rate.location.state}</small>
              )}
            </div>
          )}
        </div>
        <div className="rate-display">
          <span className="rate-number">{(rate.apy || rate.rate).toFixed(2)}%</span>
          <span className="rate-label">APY</span>
        </div>
      </div>

      <div className="rate-card-body">
        {rate.minDeposit && (
          <div className="rate-detail">
            <span className="label">Min. Deposit:</span>
            <span className="value">${rate.minDeposit.toLocaleString()}</span>
          </div>
        )}
        
        {rate.term && (
          <div className="rate-detail">
            <span className="label">Term:</span>
            <span className="value">{rate.term} months</span>
          </div>
        )}

        {rate.features && rate.features.length > 0 && (
          <div className="rate-features">
            {rate.features.map((feature, idx) => (
              <span key={idx} className="feature-tag">{feature}</span>
            ))}
          </div>
        )}
      </div>

      <div className="rate-card-footer">
        <div className="verification-info">
          <CheckCircle size={16} />
          <span>{rate.verifications} verified</span>
        </div>
        
        {rate.reports > 0 && (
          <div className="report-info">
            <AlertCircle size={16} />
            <span>{rate.reports} reports</span>
          </div>
        )}
        {rate.scrapedUrl && (
          <a 
            href={rate.scrapedUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="source-link"
            title="View source"
          >
            Source
          </a>
        )}
        {rate.scrapedUrl && (
          <a 
            href={rate.scrapedUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="source-link"
            title="View source"
          >
            Source
          </a>
        )}

        <div className="rate-actions">
          <button 
            className="btn-small btn-outline" 
            onClick={() => onVerify(rate._id, rate)}
          >
            Verify
          </button>
          <button 
            className="btn-small btn-text" 
            onClick={() => onReport(rate._id, rate)}
          >
            Report
          </button>
        </div>
      </div>
    </div>
  );
}
