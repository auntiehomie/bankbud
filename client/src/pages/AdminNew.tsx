import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Trash2, Shield, AlertTriangle, TrendingUp, Database, Mail } from 'lucide-react';
import { BankRate } from '../types';
import './Admin.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function Admin() {
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get('token');
  
  // Auth state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accountExists, setAccountExists] = useState<boolean | null>(null);
  const [showResetForm, setShowResetForm] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(!!resetToken);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | null>(null);
  
  // Data state
  const [rates, setRates] = useState<BankRate[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [dataSourceFilter, setDataSourceFilter] = useState('all');
  const [accountTypeFilter, setAccountTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('apy');
  const [selectedRates, setSelectedRates] = useState<Set<string>>(new Set());
  
  // Stored credentials
  const [storedUsername, setStoredUsername] = useState('');
  const [storedPassword, setStoredPassword] = useState('');

  useEffect(() => {
    checkAccountExists();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadRates();
    }
  }, [isAuthenticated, dataSourceFilter, accountTypeFilter, sortBy]);

  const checkAccountExists = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/account-exists`);
      const data = await response.json();
      setAccountExists(data.exists);
    } catch (err) {
      console.error('Error checking account:', err);
      setAccountExists(true);
    }
  };

  const calculatePasswordStrength = (pwd: string): 'weak' | 'medium' | 'strong' => {
    let strength = 0;
    
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength++;
    
    if (strength <= 2) return 'weak';
    if (strength <= 3) return 'medium';
    return 'strong';
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (value.length > 0) {
      setPasswordStrength(calculatePasswordStrength(value));
    } else {
      setPasswordStrength(null);
    }
  };

  const handleCreateAccount = async () => {
    setError('');
    
    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError('Please enter a valid email address');
      return;
    }
    
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
      const response = await fetch(`${API_URL}/admin/create-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, email, password })
      });

      if (response.ok) {
        setSuccessMessage('Account created successfully! Logging in...');
        setStoredUsername(username);
        setStoredPassword(password);
        setTimeout(() => {
          setAccountExists(true);
          setIsAuthenticated(true);
          loadData(username, password);
        }, 1500);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create account');
      }
    } catch (err) {
      setError('Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      if (response.ok) {
        setStoredUsername(username);
        setStoredPassword(password);
        setIsAuthenticated(true);
        loadData(username, password);
      } else {
        const data = await response.json();
        setError(data.error || 'Invalid username or password');
      }
    } catch (err) {
      setError('Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async () => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/admin/request-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: resetEmail })
      });

      const data = await response.json();
      setSuccessMessage(data.message);
      setTimeout(() => {
        setShowResetForm(false);
        setResetEmail('');
      }, 3000);
    } catch (err) {
      setError('Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError('');
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/admin/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: resetToken, newPassword })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage(data.message + ' You can now log in.');
        setTimeout(() => {
          window.location.href = '/admin';
        }, 2000);
      } else {
        setError(data.error || 'Failed to reset password');
      }
    } catch (err) {
      setError('Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const loadData = async (user: string, pass: string) => {
    await Promise.all([loadRates(user, pass), loadStats(user, pass)]);
  };

  const loadRates = async (user?: string, pass?: string) => {
    const authUser = user || storedUsername;
    const authPass = pass || storedPassword;
    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams();
      if (dataSourceFilter !== 'all') params.append('dataSource', dataSourceFilter);
      if (accountTypeFilter !== 'all') params.append('accountType', accountTypeFilter);
      if (sortBy) params.append('sortBy', sortBy);

      const response = await fetch(`${API_URL}/admin/rates?${params}`, {
        headers: {
          'x-admin-username': authUser,
          'x-admin-password': authPass
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

  const loadStats = async (user?: string, pass?: string) => {
    const authUser = user || storedUsername;
    const authPass = pass || storedPassword;
    
    try {
      const response = await fetch(`${API_URL}/admin/stats`, {
        headers: {
          'x-admin-username': authUser,
          'x-admin-password': authPass
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

  const handleDeleteRate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rate?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/admin/rates/${id}`, {
        method: 'DELETE',
        headers: {
          'x-admin-username': storedUsername,
          'x-admin-password': storedPassword
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete rate');
      }

      setSuccessMessage('Rate deleted successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
      loadData(storedUsername, storedPassword);
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
      const response = await fetch(`${API_URL}/admin/rates/bulk-delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-username': storedUsername,
          'x-admin-password': storedPassword
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
      loadData(storedUsername, storedPassword);
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

  // Password reset page (when coming from email link)
  if (showResetPassword && resetToken) {
    return (
      <div className="admin-login">
        <div className="admin-login-card">
          <Shield size={48} className="admin-icon" />
          <h1>Reset Your Password</h1>
          <p>Enter your new password below</p>
          
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New Password (min 6 characters)"
            className="admin-password-input"
          />
          
          <input
            type="password"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleResetPassword()}
            placeholder="Confirm New Password"
            className="admin-password-input"
          />
          
          <button onClick={handleResetPassword} disabled={loading} className="btn btn-primary">
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
          
          {error && <div className="error-message">{error}</div>}
          {successMessage && <div className="success-message">{successMessage}</div>}
        </div>
      </div>
    );
  }

  // Authentication screens
  if (!isAuthenticated) {
    if (accountExists === null) {
      return (
        <div className="admin-login">
          <div className="admin-login-card">
            <Shield size={48} className="admin-icon" />
            <p>Checking admin status...</p>
          </div>
        </div>
      );
    }

    // Create account screen (first time setup)
    if (!accountExists) {
      return (
        <div className="admin-login">
          <div className="admin-login-card">
            <Shield size={48} className="admin-icon" />
            <h1>Create Admin Account</h1>
            <p>Set up your admin account (first time setup)</p>
            
            <div className="info-box">
              <p><strong>Important:</strong> Save your credentials securely. You'll need your email for password resets.</p>
            </div>

            <div className="password-suggestions">
              <p><strong>Account Requirements:</strong></p>
              <ul>
                <li>✓ Username: 3+ characters</li>
                <li>✓ Valid email address</li>
                <li>✓ Password: 6+ characters (12+ recommended)</li>
                <li>✓ Mix uppercase, lowercase, numbers, symbols</li>
              </ul>
            </div>
            
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="admin-password-input"
            />
            
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email Address"
              className="admin-password-input"
            />
            
            <input
              type="password"
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              placeholder="Password"
              className="admin-password-input"
            />

            {passwordStrength && (
              <div className={`password-strength ${passwordStrength}`}>
                <div className="strength-bar"></div>
                <span className="strength-label">
                  Strength: {passwordStrength.charAt(0).toUpperCase() + passwordStrength.slice(1)}
                </span>
              </div>
            )}
            
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateAccount()}
              placeholder="Confirm Password"
              className="admin-password-input"
            />
            
            <button onClick={handleCreateAccount} disabled={loading} className="btn btn-primary">
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
            
            {error && <div className="error-message">{error}</div>}
            {successMessage && <div className="success-message">{successMessage}</div>}
          </div>
        </div>
      );
    }

    // Password reset request screen
    if (showResetForm) {
      return (
        <div className="admin-login">
          <div className="admin-login-card">
            <Mail size={48} className="admin-icon" />
            <h1>Reset Password</h1>
            <p>Enter your email to receive a password reset link</p>
            
            <div className="info-box">
              <p>We'll send a secure reset link to your email address. The link will expire in 1 hour.</p>
            </div>
            
            <input
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleRequestReset()}
              placeholder="Your Email Address"
              className="admin-password-input"
            />
            
            <button onClick={handleRequestReset} disabled={loading} className="btn btn-primary">
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
            
            <button 
              onClick={() => { setShowResetForm(false); setResetEmail(''); setError(''); }}
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

    // Login screen
    return (
      <div className="admin-login">
        <div className="admin-login-card">
          <Shield size={48} className="admin-icon" />
          <h1>Admin Login</h1>
          <p>Enter your credentials to continue</p>
          
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            className="admin-password-input"
          />
          
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="Password"
            className="admin-password-input"
          />
          
          <button onClick={handleLogin} disabled={loading} className="btn btn-primary">
            {loading ? 'Logging in...' : 'Login'}
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

  // Admin dashboard (rest of the component stays the same as before)
  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div>
          <h1><Shield size={32} /> Admin Dashboard</h1>
          <p className="admin-welcome">Welcome, {storedUsername}</p>
        </div>
        <button 
          onClick={() => {
            setIsAuthenticated(false);
            setStoredUsername('');
            setStoredPassword('');
            setUsername('');
            setPassword('');
          }}
          className="btn btn-outline"
        >
          Logout
        </button>
      </div>

      {successMessage && (
        <div className="success-banner">{successMessage}</div>
      )}

      {error && (
        <div className="error-banner">{error}</div>
      )}

      {stats && (
        <div className="stats-grid">
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
              <div className="stat-label">Community Rates</div>
            </div>
          </div>
          <div className="stat-card">
            <AlertTriangle size={24} />
            <div>
              <div className="stat-value">{stats.reportedRates}</div>
              <div className="stat-label">Reported Rates</div>
            </div>
          </div>
          <div className="stat-card alert">
            <AlertTriangle size={24} />
            <div>
              <div className="stat-value">{stats.highReports}</div>
              <div className="stat-label">High Priority (3+ reports)</div>
            </div>
          </div>
        </div>
      )}

      <div className="admin-controls">
        <div className="filters">
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
            <option value="cd">CDs</option>
            <option value="money-market">Money Market</option>
          </select>

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="apy">Highest APY</option>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="reports">Most Reported</option>
          </select>
        </div>

        {selectedRates.size > 0 && (
          <div className="bulk-actions">
            <span>{selectedRates.size} selected</span>
            <button onClick={handleBulkDelete} className="btn btn-danger-outline">
              <Trash2 size={16} /> Delete Selected
            </button>
          </div>
        )}
      </div>

      <div className="rates-table-container">
        <table className="rates-table">
          <thead>
            <tr>
              <th>
                <input 
                  type="checkbox" 
                  checked={selectedRates.size === rates.length && rates.length > 0}
                  onChange={selectAll}
                />
              </th>
              <th>Bank</th>
              <th>Type</th>
              <th>APY</th>
              <th>Min Deposit</th>
              <th>Source</th>
              <th>Reports</th>
              <th>Verifications</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rates.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty-state">
                  {loading ? 'Loading rates...' : 'No rates found'}
                </td>
              </tr>
            ) : (
              rates.map(rate => (
                <tr key={rate._id} className={rate.reports >= 3 ? 'high-priority' : ''}>
                  <td>
                    <input 
                      type="checkbox"
                      checked={selectedRates.has(rate._id)}
                      onChange={() => toggleRateSelection(rate._id)}
                    />
                  </td>
                  <td className="bank-name">{rate.bankName}</td>
                  <td>
                    <span className={`account-type-badge ${rate.accountType}`}>
                      {rate.accountType}
                    </span>
                  </td>
                  <td className="apy-cell">{(rate.apy || rate.rate).toFixed(2)}%</td>
                  <td>${(rate.minDeposit || 0).toLocaleString()}</td>
                  <td>
                    <span className={`source-badge ${rate.dataSource}`}>
                      {rate.dataSource || 'unknown'}
                    </span>
                  </td>
                  <td>
                    {rate.reports > 0 && (
                      <span className={`reports-badge ${rate.reports >= 3 ? 'high' : ''}`}>
                        {rate.reports}
                      </span>
                    )}
                  </td>
                  <td>{rate.verifications || 0}</td>
                  <td>
                    <button
                      onClick={() => handleDeleteRate(rate._id)}
                      className="btn-icon-danger"
                      title="Delete rate"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
