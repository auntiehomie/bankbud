import { useState, useEffect } from 'react';
import { Filter, TrendingUp, CheckCircle, AlertCircle, X, Users } from 'lucide-react';
import { api } from '../utils/api';
import { BankRate } from '../types';
import { useStore } from '../store';
import BenchmarkRates from '../components/BenchmarkRates';
import './Compare.css';

export default function Compare() {
  const { rates, setRates, loading, setLoading, error, setError } = useStore();
  const [accountType, setAccountType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'rate' | 'verifications'>('rate');
  const [dataSourceFilter, setDataSourceFilter] = useState<'all' | 'community' | 'ai'>('all');
  const [showCommunityOnly, setShowCommunityOnly] = useState(false);
  const [filteredRates, setFilteredRates] = useState<BankRate[]>([]);
  const [recentRates, setRecentRates] = useState<BankRate[]>([]);
  const [zipCode, setZipCode] = useState<string>('');
  const [showModal, setShowModal] = useState<{ type: 'verify' | 'report' | null, rateId: string | null, rate: BankRate | null }>({ type: null, rateId: null, rate: null });
  const [verifyType, setVerifyType] = useState<'seen' | 'false' | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [banksProcessed, setBanksProcessed] = useState<number>(0);
  const [totalBanks, setTotalBanks] = useState<number>(18);
  const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  const [locationRequested, setLocationRequested] = useState(false);
  const [detectedZipCode, setDetectedZipCode] = useState<string>('');

  const CACHE_KEY = 'bankbud_rates_cache';
  const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  // Load rates on initial mount with caching
  useEffect(() => {
    loadRatesWithCache();
  }, []);

  // Reload rates when account type changes (except 'all')
  useEffect(() => {
    if (accountType !== 'all') {
      loadRatesForAccountType(accountType);
    }
  }, [accountType]);

  useEffect(() => {
    filterAndSortRates();
    getRecentSubmissions();
  }, [rates, accountType, sortBy, dataSourceFilter, showCommunityOnly]);

  const getCacheKey = (type: string) => {
    return type === 'all' ? CACHE_KEY : `${CACHE_KEY}_${type}`;
  };

  const loadRatesForAccountType = async (type: string) => {
    const cacheKey = getCacheKey(type);
    
    // Check for cached data first
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        
        // If cache is less than 24 hours old, use it
        if (age < CACHE_DURATION) {
          console.log(`Using cached ${type} rates, age:`, Math.round(age / (60 * 1000)), 'minutes');
          setRates(data);
          return;
        }
      } catch (err) {
        console.error('Error reading cache:', err);
      }
    }
    
    // Fetch fresh data for this account type
    await loadRates(type);
  };

  const loadRatesWithCache = async () => {
    // Check for cached data first
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        
        // If cache is less than 24 hours old, use it
        if (age < CACHE_DURATION) {
          console.log('Using cached rates, age:', Math.round(age / (60 * 1000)), 'minutes');
          setRates(data);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error('Error reading cache:', err);
      }
    }
    
    // If no valid cache, fetch fresh data
    await loadRates();
  };

  const loadRates = async (type?: string) => {
    setLoading(true);
    setError(null);
    setLoadingProgress(0);
    setBanksProcessed(0);
    setLoadingMessage('Initializing search...');
    
    const targetType = type || (accountType !== 'all' ? accountType : undefined);
    const cacheKey = getCacheKey(targetType || 'all');
    
    // Poll for progress updates
    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setLoadingMessage(`Searching banks... (${elapsed}s elapsed)`);
    }, 1000);
    
    try {
      setLoadingMessage('Contacting bank APIs...');
      const data = await api.getRatesAI(
        zipCode, 
        targetType, 
        userLocation?.latitude, 
        userLocation?.longitude
      );
      console.log('📊 Loaded rates:', data.length);
      console.log('📊 Community rates:', data.filter(r => r.dataSource === 'community').length);
      console.log('📊 First 3 rates:', data.slice(0, 3).map(r => ({ bank: r.bankName, source: r.dataSource })));
      setRates(data);
      
      // Cache the data
      localStorage.setItem(cacheKey, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
      
      setLoadingProgress(100);
      setLoadingMessage('Complete!');
    } catch (err) {
      setError('Failed to load rates. Please try again.');
    } finally {
      clearInterval(progressInterval);
      setTimeout(() => {
        setLoading(false);
        setLoadingProgress(0);
        setBanksProcessed(0);
        setLoadingMessage('');
      }, 300);
    }
  };

  const filterAndSortRates = () => {
    let filtered = accountType === 'all' 
      ? rates 
      : rates.filter(r => r.accountType === accountType);

    console.log('🔍 Filtering - Total rates:', rates.length);
    console.log('🔍 After account type filter:', filtered.length);
    console.log('🔍 Show community only:', showCommunityOnly);
    console.log('🔍 Data source filter:', dataSourceFilter);

    // Toggle for community only
    if (showCommunityOnly) {
      filtered = filtered.filter(rate => rate.dataSource === 'community');
      console.log('🔍 After community toggle:', filtered.length);
    }
    // Filter by data source dropdown (only if toggle is off)
    else if (dataSourceFilter === 'community') {
      filtered = filtered.filter(rate => rate.dataSource === 'community');
      console.log('🔍 After community dropdown:', filtered.length);
    } else if (dataSourceFilter === 'ai') {
      filtered = filtered.filter(rate => rate.dataSource === 'api' || rate.dataSource === 'scraped');
      console.log('🔍 After AI filter:', filtered.length);
    }

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
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <h2>Fetching Current Rates</h2>
          <p className="loading-description">
            We're searching {totalBanks}+ banks and credit unions for the best rates.
            This may take 20-30 seconds.
          </p>
          
          <div className="loading-steps">
            <div className="loading-step">
              <div className="step-icon">🏦</div>
              <div className="step-text">Querying major banks</div>
            </div>
            <div className="loading-step">
              <div className="step-icon">💻</div>
              <div className="step-text">Checking online banks</div>
            </div>
            <div className="loading-step">
              <div className="step-icon">🏛️</div>
              <div className="step-text">Searching credit unions</div>
            </div>
            <div className="loading-step">
              <div className="step-icon">📊</div>
              <div className="step-text">Calculating distances</div>
            </div>
          </div>
          
          {loadingMessage && (
            <p className="loading-status">{loadingMessage}</p>
          )}
          
          <div className="loading-tips">
            <p><strong>💡 Tip:</strong> Results are cached for 24 hours for faster loading next time!</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="compare">
      <div className="container">
        <div className="compare-header">
          <h1>Compare Bank Rates</h1>
          <p>Live rates from top Michigan banks and online banks</p>
          
          {rates.length > 0 && (
            <div className="header-actions">
              <button 
                className={`btn-toggle ${showCommunityOnly ? 'active' : ''}`}
                onClick={() => setShowCommunityOnly(!showCommunityOnly)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  border: showCommunityOnly ? '2px solid var(--primary)' : '2px solid #ddd',
                  borderRadius: '0.5rem',
                  background: showCommunityOnly ? 'var(--primary)' : 'white',
                  color: showCommunityOnly ? 'white' : '#666',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  transition: 'all 0.2s'
                }}
              >
                <Users size={18} />
                {showCommunityOnly ? 'Showing Community Only' : 'Show Community Only'}
              </button>
              <div className="last-updated">
                <span className="update-label">Rates updated as of:</span>
                <span className="update-time">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
              </div>
              <button 
                className="btn-small btn-outline" 
                onClick={() => loadRates()}
              >
                🔄 Refresh Rates
              </button>
            </div>
          )}
          
          <div className="disclaimer">
            <div className="disclaimer-icon">⚠️</div>
            <div className="disclaimer-content">
              <strong>Important Disclaimer:</strong> The rates displayed are for informational purposes only and do not constitute financial advice. 
              Rates are subject to change and may vary based on location, account balance, and other factors. 
              <strong> Always verify current rates by contacting the financial institution directly before making any decisions.</strong>
            </div>
          </div>
        </div>

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

          <div className="filter-group">
            <Filter size={20} />
            <label>Data Source:</label>
            <select value={dataSourceFilter} onChange={(e) => setDataSourceFilter(e.target.value as 'all' | 'community' | 'ai')}>
              <option value="all">All Sources</option>
              <option value="community">Community Submitted</option>
              <option value="ai">AI Generated</option>
            </select>
          </div>

          <div className="filter-group location-search">
            <label>Zip Code (optional):</label>
            <input
              type="text"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              placeholder="Enter zip code"
              maxLength={5}
            />
            <button 
              className="btn-small btn-primary" 
              onClick={() => loadRates()}
              disabled={zipCode.length > 0 && zipCode.length !== 5}
            >
              Search
            </button>
            {zipCode && (
              <button 
                className="btn-small btn-text" 
                onClick={() => { setZipCode(''); setUserLocation(null); loadRates(); }}
              >
                Clear
              </button>
            )}
          </div>

          <div className="filter-group">
            <button 
              className="btn-small btn-outline" 
              onClick={() => {
                if (!navigator.geolocation) {
                  setError('Geolocation is not supported by your browser');
                  return;
                }
                
                setLocationRequested(true);
                setLoadingMessage('Getting your location...');
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    const { latitude, longitude } = position.coords;
                    setUserLocation({ latitude, longitude });
                    setZipCode(''); // Clear zip when using location
                    setLoadingMessage('Detecting your zip code...');
                    loadRates(); // Reload with new location
                  },
                  (error) => {
                    console.error('Geolocation error:', error);
                    setError('Unable to get your location. Please enable location services.');
                    setLocationRequested(false);
                  }
                );
              }}
              disabled={locationRequested && userLocation !== null}
            >
              📍 {userLocation ? 'Location Set' : 'Use My Location'}
            </button>
            {userLocation && (
              <button 
                className="btn-small btn-text" 
                onClick={() => { 
                  setUserLocation(null); 
                  setLocationRequested(false); 
                  setDetectedZipCode('');
                  loadRates(); 
                }}
              >
                Clear Location
              </button>
            )}
          </div>
        </div>

        {/* Show detected zip code when using geolocation */}
        {userLocation && (
          <div style={{ 
            textAlign: 'center', 
            fontSize: '0.875rem', 
            color: 'var(--text-secondary)',
            marginTop: '0.5rem',
            marginBottom: '1rem'
          }}>
            📍 Searching rates near your location
            {detectedZipCode && ` (ZIP: ${detectedZipCode})`}
          </div>
        )}

        <BenchmarkRates />

        {/* Community Contribution Call-to-Action */}
        <div className="community-cta">
          <div className="community-cta-content">
            <div className="community-cta-icon">👥</div>
            <div className="community-cta-text">
              <h3>Help Keep Rates Accurate</h3>
              <p>Found a better rate? Noticed outdated information? Share it with the community!</p>
            </div>
            <a href="/submit" className="btn btn-primary">
              📝 Submit a Rate
            </a>
          </div>
        </div>

        {recentRates.length > 0 && (
          <div className="recent-submissions">
            <div className="recent-header">
              <CheckCircle size={20} />
              <h2>Recently Submitted by Community</h2>
              <span className="recent-count">{recentRates.length} new</span>
              <a href="/submit" className="submit-link">
                Submit yours →
              </a>
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
  const accountTypeLabels: Record<string, string> = {
    'savings': 'Savings Account',
    'checking': 'Checking Account', 
    'cd': 'Certificate of Deposit',
    'money-market': 'Money Market Account'
  };

  const accountTypeColors: Record<string, string> = {
    'savings': 'type-savings',
    'checking': 'type-checking',
    'cd': 'type-cd',
    'money-market': 'type-money-market'
  };

  return (
    <div className="rate-card">
      <div className="rate-card-header">
        <div>
          <h3>{rate.bankName}</h3>
          <span className={`account-type-badge ${accountTypeColors[rate.accountType]}`}>
            {accountTypeLabels[rate.accountType] || rate.accountType}
          </span>
          {rate.term && (
            <span className="term-badge">{rate.term} Month{rate.term > 1 ? 's' : ''}</span>
          )}
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
          {rate.dataSource === 'api' && (
            <span className="ai-warning" title="AI-generated rate - verify with bank">
              ⚠️ Verify
            </span>
          )}
        </div>
      </div>

      <div className="rate-card-body">
        {/* Auto-flagged rates warning */}
        {rate.reports > rate.verifications && (
          <div className="rate-notice" style={{ borderLeft: '4px solid #e53e3e', background: '#fff5f5' }}>
            <strong>⚠️ Flagged Rate:</strong> This rate has been reported as potentially inaccurate and is under review. 
            Verifications: {rate.verifications} | Reports: {rate.reports}
          </div>
        )}
        
        {rate.dataSource === 'api' && (
          <div className="rate-notice">
            <strong>⚠️ AI-Generated Rate:</strong> This rate was found using AI search and may not be current. 
            Always verify by calling the bank or visiting their website.
            {rate.rateInfo && (
              <details style={{ marginTop: '0.75rem' }} open>
                <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#4a5568', marginBottom: '0.5rem' }}>
                  📝 Full AI Response (Click to collapse)
                </summary>
                <div style={{ 
                  marginTop: '0.5rem', 
                  padding: '1rem', 
                  background: '#f8f9fa', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '0.9rem',
                  color: '#2d3748',
                  whiteSpace: 'pre-wrap',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  lineHeight: '1.6',
                  fontFamily: 'system-ui, -apple-system, sans-serif'
                }}>
                  {rate.rateInfo}
                </div>
              </details>
            )}
          </div>
        )}
        
        {rate.minDeposit !== undefined && (
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
        
        {/* Show "Submit Rate" button if no rate is available */}
        {(!rate.apy && !rate.rate) || rate.apy === 0 && (
          <div className="no-rate-available">
            <p>Rate information not available</p>
            <a 
              href="/submit" 
              className="btn-small btn-primary"
              style={{ marginTop: '10px' }}
            >
              📝 Have a rate? Submit it here
            </a>
          </div>
        )}
      </div>

      <div className="rate-card-footer">
        <div className="verification-info-section">
          <button 
            className="verification-info-button"
            onClick={() => {
              if (rate.scrapedUrl) {
                window.open(rate.scrapedUrl, '_blank');
              }
            }}
            title={rate.scrapedUrl 
              ? `Last verified: ${new Date(rate.lastVerified).toLocaleDateString()}\nClick to view source` 
              : `Last verified: ${new Date(rate.lastVerified).toLocaleDateString()}\nNo source URL available`}
            style={{ cursor: rate.scrapedUrl ? 'pointer' : 'default' }}
          >
            <CheckCircle size={16} />
            <span>{rate.verifications} verified</span>
          </button>
          
          {rate.reports > 0 && (
            <div className="report-info">
              <AlertCircle size={16} />
              <span>{rate.reports} reports</span>
            </div>
          )}
        </div>

        <div className="rate-actions">
          {rate.phone && (
            <a 
              href={`tel:${rate.phone}`}
              className="btn-small btn-primary verify-rate-btn"
              title="Call to verify rate"
            >
              📞 Verify Rate
            </a>
          )}
          {rate.scrapedUrl && (
            <a 
              href={rate.scrapedUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn-small btn-outline"
              title="View official source"
            >
              🔗 Source
            </a>
          )}
          <button 
            className="btn-small btn-outline" 
            onClick={() => onVerify(rate._id, rate)}
          >
            ✓ Verify
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
