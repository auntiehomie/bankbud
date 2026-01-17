import { useEffect, useState } from 'react';
import axios from 'axios';
import { TrendingUp, Activity } from 'lucide-react';
import './BenchmarkRates.css';

interface BenchmarkData {
  savings: number | null;
  checking: number | null;
  moneyMarket: number | null;
  cd12Month: number | null;
  cd6Month: number | null;
  timestamp: string;
}

export default function BenchmarkRates() {
  const [benchmarks, setBenchmarks] = useState<BenchmarkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBenchmarks();
  }, []);

  const loadBenchmarks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/api/benchmarks');
      setBenchmarks(response.data.data);
    } catch (err) {
      console.error('Error loading benchmarks:', err);
      setError('Unable to load benchmark rates');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="benchmark-rates loading">
        <Activity className="icon-spin" size={20} />
        <span>Loading national averages...</span>
      </div>
    );
  }

  if (error || !benchmarks) {
    return null; // Silently hide if benchmarks aren't available
  }

  const formatRate = (rate: number | null) => {
    if (rate === null) return 'N/A';
    return `${rate.toFixed(2)}%`;
  };

  return (
    <div className="benchmark-rates">
      <div className="benchmark-header">
        <TrendingUp size={18} />
        <h3>National Average Rates</h3>
        <span className="benchmark-source">Federal Reserve Data</span>
      </div>
      <div className="benchmark-grid">
        {benchmarks.savings !== null && (
          <div className="benchmark-item">
            <span className="benchmark-label">Savings</span>
            <span className="benchmark-value">{formatRate(benchmarks.savings)}</span>
          </div>
        )}
        {benchmarks.checking !== null && (
          <div className="benchmark-item">
            <span className="benchmark-label">Checking</span>
            <span className="benchmark-value">{formatRate(benchmarks.checking)}</span>
          </div>
        )}
        {benchmarks.moneyMarket !== null && (
          <div className="benchmark-item">
            <span className="benchmark-label">Money Market</span>
            <span className="benchmark-value">{formatRate(benchmarks.moneyMarket)}</span>
          </div>
        )}
        {benchmarks.cd12Month !== null && (
          <div className="benchmark-item">
            <span className="benchmark-label">12-Month CD</span>
            <span className="benchmark-value">{formatRate(benchmarks.cd12Month)}</span>
          </div>
        )}
        {benchmarks.cd6Month !== null && (
          <div className="benchmark-item">
            <span className="benchmark-label">6-Month CD</span>
            <span className="benchmark-value">{formatRate(benchmarks.cd6Month)}</span>
          </div>
        )}
      </div>
      <p className="benchmark-note">
        These are national averages. Top banks often offer rates 10-20x higher.
      </p>
    </div>
  );
}
