import { Link } from 'react-router-dom';
import { Building2, TrendingUp, Send, Sparkles, MessageCircle, Newspaper } from 'lucide-react';
import './Header.css';

export default function Header() {
  return (
    <header className="header">
      <div className="container header-content">
        <Link to="/" className="logo">
          <Building2 size={32} />
          <span>BankBud</span>
        </Link>
        
        <nav className="nav">
          <Link to="/compare" className="nav-link">
            <TrendingUp size={20} />
            <span>Compare Rates</span>
          </Link>
          <Link to="/ai-advisor" className="nav-link">
            <MessageCircle size={20} />
            <span>AI Advisor</span>
          </Link>
          <Link to="/news" className="nav-link">
            <Newspaper size={20} />
            <span>News</span>
          </Link>
          <Link to="/recommendations" className="nav-link">
            <Sparkles size={20} />
            <span>Get Recommendations</span>
          </Link>
          <Link to="/submit" className="nav-link">
            <Send size={20} />
            <span>Submit Rate</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
