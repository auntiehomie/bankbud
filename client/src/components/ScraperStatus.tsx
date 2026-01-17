import { useState, useEffect } from 'react';
import { RefreshCw, Database } from 'lucide-react';
import axios from 'axios';
import './ScraperStatus.css';

export default function ScraperStatus() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [scraping, setScraping] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/scraper/status');
      setStatus(response.data);
    } catch (error) {
      console.error('Failed to load scraper status:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerScrape = async () => {
    setScraping(true);
    try {
      await axios.post('/api/scraper/scrape-all');
      alert('Scraping started! This will take a few minutes. Refresh the page to see new rates.');
      setTimeout(loadStatus, 60000); // Reload status after 1 minute
    } catch (error) {
      console.error('Failed to trigger scrape:', error);
      alert('Failed to start scraping. Please try again.');
    } finally {
      setScraping(false);
    }
  };

  if (loading) return null;

  return (
    <div className="scraper-status">
      <div className="scraper-info">
        <Database size={16} />
        <span>
          {status?.scrapedCount || 0} auto-updated rates
          {status?.lastScrapeTime && (
            <> · Last updated: {new Date(status.lastScrapeTime).toLocaleDateString()}</>
          )}
        </span>
      </div>
      
      <button 
        className="btn-small btn-outline refresh-btn" 
        onClick={triggerScrape}
        disabled={scraping}
      >
        <RefreshCw size={16} className={scraping ? 'spinning' : ''} />
        {scraping ? 'Updating...' : 'Update Rates'}
      </button>
    </div>
  );
}
