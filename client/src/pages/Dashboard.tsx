import { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, PiggyBank, Target, Plus, X } from 'lucide-react';
import './Dashboard.css';

interface UserAccount {
  id: string;
  bankName: string;
  accountType: string;
  balance: number;
  currentRate: number;
}

interface BestRate {
  bankName: string;
  rate: number;
  accountType: string;
}

export default function Dashboard() {
  const [accounts, setAccounts] = useState<UserAccount[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [bestRates, setBestRates] = useState<Record<string, BestRate>>({});
  
  // Form fields
  const [bankName, setBankName] = useState('');
  const [accountType, setAccountType] = useState('high-yield-savings');
  const [balance, setBalance] = useState('');
  const [currentRate, setCurrentRate] = useState('');

  useEffect(() => {
    loadAccounts();
    loadBestRates();
  }, []);

  const loadAccounts = () => {
    const saved = localStorage.getItem('userAccounts');
    if (saved) {
      setAccounts(JSON.parse(saved));
    }
  };

  const saveAccounts = (newAccounts: UserAccount[]) => {
    localStorage.setItem('userAccounts', JSON.stringify(newAccounts));
    setAccounts(newAccounts);
  };

  const loadBestRates = async () => {
    try {
      // This would normally fetch from API, but we'll use mock data for now
      const mockBestRates = {
        'high-yield-savings': { bankName: 'American Express', rate: 4.50, accountType: 'high-yield-savings' },
        'savings': { bankName: 'Ally Bank', rate: 4.35, accountType: 'savings' },
        'cd': { bankName: 'Marcus by Goldman Sachs', rate: 5.10, accountType: 'cd' },
        'checking': { bankName: 'Lake Michigan Credit Union', rate: 3.00, accountType: 'checking' },
        'money-market': { bankName: 'CIT Bank', rate: 4.75, accountType: 'money-market' }
      };
      setBestRates(mockBestRates);
    } catch (error) {
      console.error('Error loading best rates:', error);
    }
  };

  const addAccount = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newAccount: UserAccount = {
      id: Date.now().toString(),
      bankName,
      accountType,
      balance: parseFloat(balance),
      currentRate: parseFloat(currentRate)
    };

    saveAccounts([...accounts, newAccount]);
    
    // Reset form
    setBankName('');
    setAccountType('high-yield-savings');
    setBalance('');
    setCurrentRate('');
    setShowAddForm(false);
  };

  const removeAccount = (id: string) => {
    if (confirm('Are you sure you want to remove this account?')) {
      saveAccounts(accounts.filter(a => a.id !== id));
    }
  };

  const calculatePotentialEarnings = (account: UserAccount) => {
    const bestRate = bestRates[account.accountType];
    if (!bestRate) return 0;
    
    const currentEarnings = account.balance * (account.currentRate / 100);
    const potentialEarnings = account.balance * (bestRate.rate / 100);
    return potentialEarnings - currentEarnings;
  };

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  const totalCurrentEarnings = accounts.reduce((sum, a) => sum + (a.balance * (a.currentRate / 100)), 0);
  const totalPotentialGain = accounts.reduce((sum, a) => sum + calculatePotentialEarnings(a), 0);

  const accountTypeLabels: Record<string, string> = {
    'savings': 'Savings',
    'high-yield-savings': 'High-Yield Savings',
    'cd': 'Certificate of Deposit (CD)',
    'checking': 'Checking',
    'money-market': 'Money Market'
  };

  return (
    <div className="dashboard">
      <div className="container">
        <div className="dashboard-header">
          <div>
            <h1>My Dashboard</h1>
            <p>Track your accounts and compare rates</p>
          </div>
        </div>

        {accounts.length === 0 && !showAddForm && (
          <div className="empty-state">
            <PiggyBank size={64} className="empty-icon" />
            <h2>No accounts added yet</h2>
            <p>Add your accounts to compare rates and see how much you could be earning</p>
            <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
              <Plus size={20} />
              Add Your First Account
            </button>
          </div>
        )}

        {(accounts.length > 0 || showAddForm) && (
          <>
            {/* Summary Cards */}
            {accounts.length > 0 && (
              <div className="summary-grid">
                <div className="summary-card">
                  <div className="summary-icon">
                    <DollarSign size={24} />
                  </div>
                  <div className="summary-content">
                    <div className="summary-label">Total Balance</div>
                    <div className="summary-value">${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                </div>

                <div className="summary-card">
                  <div className="summary-icon">
                    <TrendingUp size={24} />
                  </div>
                  <div className="summary-content">
                    <div className="summary-label">Current Annual Earnings</div>
                    <div className="summary-value">${totalCurrentEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                </div>

                <div className="summary-card highlight">
                  <div className="summary-icon">
                    <Target size={24} />
                  </div>
                  <div className="summary-content">
                    <div className="summary-label">Potential Extra Earnings</div>
                    <div className="summary-value">
                      +${totalPotentialGain.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/year
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Add Account Button */}
            {accounts.length > 0 && !showAddForm && (
              <button className="btn btn-primary add-account-btn" onClick={() => setShowAddForm(true)}>
                <Plus size={20} />
                Add Another Account
              </button>
            )}

            {/* Add Account Form */}
            {showAddForm && (
              <div className="add-account-form">
                <div className="form-header">
                  <h2>Add Account</h2>
                  <button className="close-btn" onClick={() => setShowAddForm(false)}>
                    <X size={20} />
                  </button>
                </div>
                <form onSubmit={addAccount}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Bank Name</label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="Chase, Ally, etc."
                        required
                      />
                    </div>
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
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Current Balance ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={balance}
                        onChange={(e) => setBalance(e.target.value)}
                        placeholder="10000.00"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Current Rate (APY %)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="20"
                        value={currentRate}
                        onChange={(e) => setCurrentRate(e.target.value)}
                        placeholder="4.50"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-actions">
                    <button type="button" className="btn btn-text" onClick={() => setShowAddForm(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Add Account
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Accounts List */}
            {accounts.length > 0 && (
              <div className="accounts-section">
                <h2>Your Accounts</h2>
                <div className="accounts-list">
                  {accounts.map((account) => {
                    const bestRate = bestRates[account.accountType];
                    const potentialGain = calculatePotentialEarnings(account);
                    const currentEarnings = account.balance * (account.currentRate / 100);

                    return (
                      <div key={account.id} className="account-card">
                        <div className="account-header">
                          <div>
                            <h3>{account.bankName}</h3>
                            <span className="account-type">{accountTypeLabels[account.accountType]}</span>
                          </div>
                          <button className="delete-btn" onClick={() => removeAccount(account.id)}>
                            <X size={18} />
                          </button>
                        </div>

                        <div className="account-details">
                          <div className="detail-row">
                            <span>Balance:</span>
                            <strong>${account.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                          </div>
                          <div className="detail-row">
                            <span>Your Rate:</span>
                            <strong>{account.currentRate.toFixed(2)}% APY</strong>
                          </div>
                          <div className="detail-row">
                            <span>Annual Earnings:</span>
                            <strong>${currentEarnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                          </div>
                        </div>

                        {bestRate && potentialGain > 0 && (
                          <div className="improvement-section">
                            <div className="improvement-header">
                              <TrendingUp size={16} />
                              <span>Better Rate Available</span>
                            </div>
                            <div className="improvement-details">
                              <div className="best-rate-info">
                                <div className="best-rate-bank">{bestRate.bankName}</div>
                                <div className="best-rate-value">{bestRate.rate.toFixed(2)}% APY</div>
                              </div>
                              <div className="potential-gain">
                                You could earn <strong>${potentialGain.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> more per year
                              </div>
                              <a href="/compare" className="btn btn-small btn-primary">
                                Compare Rates →
                              </a>
                            </div>
                          </div>
                        )}

                        {bestRate && potentialGain <= 0 && (
                          <div className="good-rate">
                            ✅ You already have a great rate!
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        <div className="dashboard-info">
          <h3>💡 Tips</h3>
          <ul>
            <li>Add all your savings and checking accounts to see your total potential earnings</li>
            <li>We compare your rates with the best available rates from banks in our database</li>
            <li>Set up <a href="/rate-alerts">rate alerts</a> to be notified when better rates become available</li>
            <li>Your account data is stored locally in your browser and never leaves your device</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
