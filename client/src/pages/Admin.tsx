import { useState, useEffect } from 'react';
import { Trash2, Shield, AlertTriangle, TrendingUp, Database } from 'lucide-react';
import { BankRate } from '../types';
import './Admin.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function Admin() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordExists, setPasswordExists] = useState<boolean | null>(null);
  const [isCreatingPassword, setIsCreatingPassword] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetKey, setResetKey] = useState('');
  const [rates, setRates] = useState<BankRate[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [dataSourceFilter, setDataSourceFilter] = useState('all');
  const [accountTypeFilter, setAccountTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('apy');
  const [selectedRates, setSelectedRates] = useState<Set<string>>(new Set());

  useEffect(() => {
    checkPasswordExists();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadRates();
    }
  }, [isAuthenticated, dataSourceFilter, accountTypeFilter, sortBy]);

  const checkPasswordExists = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/password-exists`);
      const data = await response.json();
      setPasswordExists(data.exists);
      setIsCreatingPassword(!data.exists);
    } catch (err) {
      console.error('Error checking password:', err);
      setPasswordExists(true); // Assume password exists on error
    }
  };

  const loadData = async (pwd: string) => {
    await Promise.all([loadRates(pwd), loadStats(pwd)]);
  };

  const loadRates = async (pwd?: string) => {
    const authPassword = pwd || password;
    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams();
      if (dataSourceFilter !== 'all') params.append('dataSource', dataSourceFilter);
      if (accountTypeFilter !== 'all') params.append('accountType', accountTypeFilter);
      if (sortBy) params.append('sortBy', sortBy);

      const response = await fetch(`${API_URL}/api/admin/rates?${params}`, {
        headers: {
          'x-admin-password': authPassword
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch rates');
      }

      const data = await response.json();
      setRates(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (pwd?: string) => {
    const authPassword = pwd || password;
    
    try {
      const response = await fetch(`${API_URL}/api/admin/stats`, {
        headers: {
          'x-admin-password': authPassword
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();
      setStats(data);
    } catch (err: any) {
      console.error('Error loading stats:', err);
    }
  };

  const handleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/admin/stats`, {
        headers: {
          'x-admin-password': password
        }
      });

      if (response.ok) {
        setIsAuthenticated(true);
        loadData(password);
      } else {
        setError('Invalid password');
      }
    } catch (err) {
      setError('Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePassword = async () => {
    setError('');
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/admin/set-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password })
      });

      if (response.ok) {
        setSuccessMessage('Password created successfully! Logging in...');
        setTimeout(() => {
          setPasswordExists(true);
          setIsCreatingPassword(false);
          setIsAuthenticated(true);
          loadData(password);
        }, 1500);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create password');
      }
    } catch (err) {
      setError('Failed to create password');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/admin/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ resetKey })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage(data.message);
        setTimeout(() => {
          setShowResetForm(false);
          setResetKey('');
          checkPasswordExists();
        }, 2000);
      } else {
        setError(data.error || 'Invalid reset key');
      }
    } catch (err) {
      setError('Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rate?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/admin/rates/${id}`, {
        method: 'DELETE',
        headers: {
          'x-admin-password': password
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete rate');
      }

      setSuccessMessage('Rate deleted successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
      loadData(password);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRates.size === 0) {
      setError('No rates selected');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedRates.size} rates?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/admin/rates/bulk-delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': password
        },
        body: JSON.stringify({ ids: Array.from(selectedRates) })
      });

      if (!response.ok) {
        throw new Error('Failed to bulk delete rates');
      }

      const result = await response.json();
      setSuccessMessage(result.message);
      setTimeout(() => setSuccessMessage(''), 3000);
      setSelectedRates(new Set());
      loadData(password);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggleRateSelection = (id: string) => {
    const newSelection = new Set(selectedRates);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedRates(newSelection);
  };

  const selectAll = () => {
    if (selectedRates.size === rates.length) {
      setSelectedRates(new Set());
    } else {
      setSelectedRates(new Set(rates.map(r => r._id)));
    }
  };

  if (!isAuthenticated) {
    if (passwordExists === null) {
      return (
        <div className="admin-login">
          <div className="admin-login-card">
            <Shield size={48} className="admin-icon" />
            <p>Checking admin status...</p>
          </div>
        </div>
      );
    }

    if (isCreatingPassword) {
      return (
        <div className="admin-login">
          <div className="admin-login-card">
            <Shield size={48} className="admin-icon" />
            <h1>Create Admin Password</h1>
            <p>Set up your admin password (first time setup)</p>
            
            <div className="info-box">
              <p><strong>Important:</strong> This password will be stored securely and used for all future logins.</p>
              <p>If you forget your password, you'll need the reset key from your server's .env file to reset it.</p>
            </div>
            
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create Password (min 6 characters)"
              className="admin-password-input"
            />
            
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreatePassword()}
              placeholder="Confirm Password"
              className="admin-password-input"
            />
            
            <button onClick={handleCreatePassword} disabled={loading} className="btn btn-primary">
              {loading ? 'Creating...' : 'Create Password'}
            </button>
            
            {error && <div className="error-message">{error}</div>}
            {successMessage && <div className="success-message">{successMessage}</div>}
          </div>
        </div>
      );
    }

    if (showResetForm) {
      return (
        <div className="admin-login">
          <div className="admin-login-card">
            <Shield size={48} className="admin-icon" />
            <h1>Reset Admin Password</h1>
            <p>Enter your reset key to reset the admin password</p>
            
            <div className="info-box">
              <p><strong>Reset Key Location:</strong></p>
              <p>Find your reset key in the server's .env file:</p>
              <code>ADMIN_RESET_KEY=your_reset_key_here</code>
              <p style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>If not set, contact your system administrator.</p>
            </div>
            
            <input
              type="text"
              value={resetKey}
              onChange={(e) => setResetKey(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleResetPassword()}
              placeholder="Enter Reset Key"
              className="admin-password-input"
            />
            
            <button onClick={handleResetPassword} disabled={loading} className="btn btn-primary">
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
            
            <button 
              onClick={() => { setShowResetForm(false); setResetKey(''); setError(''); }}
              className="btn btn-outline"
              style={{ marginTop: '0.5rem' }}
            >
              Back to Login
            </button>
            
            {error && <div className="error-message">{error}</div>}
            {successMessage && <div className="success-message">{successMessage}</div>}
          </div>
        </div>
      );
    }

    return (
      <div className="admin-login">
        <div className="admin-login-card">
          <Shield size={48} className="admin-icon" />
          <h1>Admin Access</h1>
          <p>Enter your admin password to continue</p>
          
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="Admin Password"
            className="admin-password-input"
          />
          
          <button onClick={handleLogin} disabled={loading} className="btn btn-primary">
            {loading ? 'Authenticating...' : 'Login'}
          </button>
          
          <button 
            onClick={() => setShowResetForm(true)}
            className="btn btn-text"
            style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}
          >
            Forgot Password?
          </button>
          
          {error && <div className="error-message">{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1><Shield size={32} /> Admin Dashboard</h1>
          <p>Manage and moderate bank rates</p>
        </div>
        <button 
          onClick={() => {
            setIsAuthenticated(false);
            setPassword('');
            setRates([]);
          }}
          className="btn btn-outline"
        >
          Logout
        </button>
      </div>

      {stats && (
        <div className="admin-stats">
          <div className="stat-card">
            <Database size={24} />
            <div>
              <div className="stat-value">{stats.totalRates}</div>
              <div className="stat-label">Total Rates</div>
            </div>
          </div>
          <div className="stat-card">
            <TrendingUp size={24} />
            <div>
              <div className="stat-value">{stats.communityRates}</div>
              <div className="stat-label">Community</div>
            </div>
          </div>
          <div className="stat-card">
            <TrendingUp size={24} />
            <div>
              <div className="stat-value">{stats.scrapedRates}</div>
              <div className="stat-label">Scraped</div>
            </div>
          </div>
          <div className="stat-card warning">
            <AlertTriangle size={24} />
            <div>
              <div className="stat-value">{stats.reportedRates}</div>
              <div className="stat-label">Reported</div>
            </div>
          </div>
        </div>
      )}

      <div className="admin-controls">
        <div className="admin-filters">
          <select value={dataSourceFilter} onChange={(e) => setDataSourceFilter(e.target.value)}>
            <option value="all">All Sources</option>
            <option value="community">Community</option>
            <option value="scraped">Scraped</option>
            <option value="api">API</option>
          </select>

          <select value={accountTypeFilter} onChange={(e) => setAccountTypeFilter(e.target.value)}>
            <option value="all">All Types</option>
            <option value="savings">Savings</option>
            <option value="checking">Checking</option>
            <option value="cd">CD</option>
            <option value="money-market">Money Market</option>
          </select>

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="apy">Highest APY</option>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="reports">Most Reported</option>
          </select>
        </div>

        <div className="bulk-actions">
          <button onClick={selectAll} className="btn btn-outline">
            {selectedRates.size === rates.length ? 'Deselect All' : 'Select All'}
          </button>
          {selectedRates.size > 0 && (
            <button onClick={handleBulkDelete} className="btn btn-danger">
              <Trash2 size={16} /> Delete {selectedRates.size} Selected
            </button>
          )}
        </div>
      </div>

      {successMessage && (
        <div className="success-message">{successMessage}</div>
      )}

      {error && (
        <div className="error-message">{error}</div>
      )}

      {loading ? (
        <div className="loading-state">Loading rates...</div>
      ) : (
        <div className="admin-rates-table">
          <table>
            <thead>
              <tr>
                <th><input type="checkbox" onChange={selectAll} checked={selectedRates.size === rates.length && rates.length > 0} /></th>
                <th>Bank</th>
                <th>Type</th>
                <th>APY</th>
                <th>Source</th>
                <th>Verified</th>
                <th>Reports</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((rate) => (
                <tr key={rate._id} className={rate.reports > 2 ? 'reported-row' : ''}>
                  <td>
                    <input 
                      type="checkbox" 
                      checked={selectedRates.has(rate._id)}
                      onChange={() => toggleRateSelection(rate._id)}
                    />
                  </td>
                  <td className="bank-name">{rate.bankName}</td>
                  <td><span className="account-badge">{rate.accountType}</span></td>
                  <td className="apy-value">{rate.apy || rate.rate}%</td>
                  <td><span className={`source-badge ${rate.dataSource}`}>{rate.dataSource}</span></td>
                  <td>{rate.verifications}</td>
                  <td className={rate.reports > 2 ? 'high-reports' : ''}>{rate.reports}</td>
                  <td className="date-cell">{new Date(rate.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button 
                      onClick={() => handleDeleteRate(rate._id)}
                      className="btn-icon btn-danger"
                      title="Delete rate"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {rates.length === 0 && (
            <div className="no-results">No rates found</div>
          )}
        </div>
      )}
    </div>
  );
}
