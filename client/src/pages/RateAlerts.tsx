import { useState, useEffect } from 'react';
import { Bell, Trash2, Plus, CheckCircle } from 'lucide-react';
import { api } from '../utils/api';
import './RateAlerts.css';

interface RateAlert {
  _id: string;
  email: string;
  accountType: string;
  targetRate: number;
  frequency: 'daily' | 'weekly' | 'instant';
  active: boolean;
  lastNotified?: string;
  createdAt: string;
}

export default function RateAlerts() {
  const [alerts, setAlerts] = useState<RateAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [accountType, setAccountType] = useState('high-yield-savings');
  const [targetRate, setTargetRate] = useState('4.50');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'instant'>('daily');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    // Load email from localStorage if available
    const savedEmail = localStorage.getItem('userEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      loadAlerts(savedEmail);
    }
  }, []);

  const loadAlerts = async (userEmail: string) => {
    try {
      setLoading(true);
      const response = await api.get(`/rate-alerts/user/${encodeURIComponent(userEmail)}`);
      setAlerts(response);
    } catch (error) {
      console.error('Error loading alerts:', error);
      showMessage('error', 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  const createAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !targetRate) {
      showMessage('error', 'Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/rate-alerts', {
        email,
        accountType,
        targetRate: parseFloat(targetRate),
        frequency
      });

      // Save email to localStorage
      localStorage.setItem('userEmail', email);

      showMessage('success', `Alert created! ${response.matchingRates > 0 ? `Found ${response.matchingRates} matching rates.` : ''}`);
      
      // Reload alerts
      await loadAlerts(email);
      
      // Reset form
      setTargetRate('4.50');
    } catch (error: any) {
      console.error('Error creating alert:', error);
      showMessage('error', error.response?.data?.error || 'Failed to create alert');
    } finally {
      setLoading(false);
    }
  };

  const deleteAlert = async (alertId: string) => {
    if (!confirm('Are you sure you want to delete this alert?')) {
      return;
    }

    try {
      setLoading(true);
      await api.delete(`/rate-alerts/${alertId}`);
      showMessage('success', 'Alert deleted successfully');
      
      // Reload alerts
      if (email) {
        await loadAlerts(email);
      }
    } catch (error) {
      console.error('Error deleting alert:', error);
      showMessage('error', 'Failed to delete alert');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const accountTypeLabels: Record<string, string> = {
    'savings': 'Savings',
    'high-yield-savings': 'High-Yield Savings',
    'cd': 'Certificate of Deposit (CD)',
    'checking': 'Checking',
    'money-market': 'Money Market'
  };

  return (
    <div className="rate-alerts">
      <div className="container">
        <div className="alerts-header">
          <div className="header-content">
            <Bell size={48} className="header-icon" />
            <div>
              <h1>Rate Alerts</h1>
              <p>Get notified when rates meet your targets</p>
            </div>
          </div>
        </div>

        {message && (
          <div className={`alert-message ${message.type}`}>
            {message.type === 'success' ? <CheckCircle size={20} /> : <Bell size={20} />}
            {message.text}
          </div>
        )}

        <div className="alerts-content">
          <div className="create-alert-section">
            <h2>Create New Alert</h2>
            <form onSubmit={createAlert} className="alert-form">
              <div className="form-group">
                <label>Your Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Account Type</label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value)}
                  >
                    <option value="high-yield-savings">High-Yield Savings</option>
                    <option value="savings">Savings</option>
                    <option value="cd">Certificate of Deposit (CD)</option>
                    <option value="checking">Checking</option>
                    <option value="money-market">Money Market</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Target Rate (APY %)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="20"
                    value={targetRate}
                    onChange={(e) => setTargetRate(e.target.value)}
                    placeholder="4.50"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Notification Frequency</label>
                <div className="frequency-options">
                  <label className={`frequency-option ${frequency === 'instant' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="frequency"
                      value="instant"
                      checked={frequency === 'instant'}
                      onChange={(e) => setFrequency(e.target.value as any)}
                    />
                    <div>
                      <strong>Instant</strong>
                      <p>Notify me immediately</p>
                    </div>
                  </label>
                  <label className={`frequency-option ${frequency === 'daily' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="frequency"
                      value="daily"
                      checked={frequency === 'daily'}
                      onChange={(e) => setFrequency(e.target.value as any)}
                    />
                    <div>
                      <strong>Daily</strong>
                      <p>Once per day at 9 AM</p>
                    </div>
                  </label>
                  <label className={`frequency-option ${frequency === 'weekly' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="frequency"
                      value="weekly"
                      checked={frequency === 'weekly'}
                      onChange={(e) => setFrequency(e.target.value as any)}
                    />
                    <div>
                      <strong>Weekly</strong>
                      <p>Once per week</p>
                    </div>
                  </label>
                </div>
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                <Plus size={20} />
                {loading ? 'Creating...' : 'Create Alert'}
              </button>
            </form>
          </div>

          <div className="active-alerts-section">
            <h2>Your Active Alerts</h2>
            {!email && (
              <p className="no-alerts">Enter your email above to view your alerts</p>
            )}
            {email && alerts.length === 0 && !loading && (
              <p className="no-alerts">You don't have any active alerts yet</p>
            )}
            {loading && <p className="loading-text">Loading alerts...</p>}
            
            {alerts.length > 0 && (
              <div className="alerts-list">
                {alerts.map((alert) => (
                  <div key={alert._id} className="alert-card">
                    <div className="alert-info">
                      <div className="alert-type">
                        <span className="type-icon">🏦</span>
                        <span>{accountTypeLabels[alert.accountType]}</span>
                      </div>
                      <div className="alert-target">
                        <span className="target-label">Target Rate:</span>
                        <span className="target-rate">{alert.targetRate.toFixed(2)}% APY</span>
                      </div>
                      <div className="alert-frequency">
                        <Bell size={14} />
                        <span>Notifications: {alert.frequency}</span>
                      </div>
                      {alert.lastNotified && (
                        <div className="alert-last-notified">
                          Last notified: {new Date(alert.lastNotified).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <button
                      className="delete-alert-btn"
                      onClick={() => deleteAlert(alert._id)}
                      disabled={loading}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="alerts-info">
          <h3>How Rate Alerts Work</h3>
          <div className="info-grid">
            <div className="info-card">
              <div className="info-icon">🎯</div>
              <h4>Set Your Target</h4>
              <p>Choose your desired account type and minimum rate</p>
            </div>
            <div className="info-card">
              <div className="info-icon">🔔</div>
              <h4>Get Notified</h4>
              <p>Receive email alerts when rates match or exceed your target</p>
            </div>
            <div className="info-card">
              <div className="info-icon">💰</div>
              <h4>Save More</h4>
              <p>Never miss out on competitive rates again</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
