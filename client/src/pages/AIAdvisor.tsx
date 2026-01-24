import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Trash2, Loader, Sparkles, TrendingUp, DollarSign } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { api } from '../utils/api';
import { ChatMessage } from '../types';
import './AIAdvisor.css';

export default function AIAdvisor() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [aiAvailable, setAiAvailable] = useState(true);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAIStatus();
    loadSessionFromStorage();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const checkAIStatus = async () => {
    try {
      const status = await api.getAIStatus();
      setAiAvailable(status.available);
      
      if (!status.available) {
        setMessages([{
          role: 'assistant',
          content: 'Hi! I\'m BankBuddy AI, but I\'m currently offline. To enable AI features, the administrator needs to configure an OpenAI API key. In the meantime, feel free to explore our Compare Rates page to see the best banking options available!',
          timestamp: new Date()
        }]);
      } else {
        // Welcome message
        setMessages([{
          role: 'assistant',
          content: 'Hi! I\'m BankBuddy AI, your personal banking advisor. I can help you find the perfect bank account, explain different banking products, and provide personalized recommendations based on your financial goals. What can I help you with today?',
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Error checking AI status:', error);
      setAiAvailable(false);
    }
  };

  const loadSessionFromStorage = () => {
    const savedSessionId = localStorage.getItem('bankbud_chat_session');
    if (savedSessionId) {
      setSessionId(savedSessionId);
      loadConversationHistory(savedSessionId);
    }
  };

  const loadConversationHistory = async (sid: string) => {
    try {
      const history = await api.getConversationHistory(sid);
      if (history.messages && history.messages.length > 0) {
        setMessages(history.messages.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
      }
    } catch (error) {
      console.error('Error loading conversation history:', error);
      // If conversation not found, clear the session
      localStorage.removeItem('bankbud_chat_session');
      setSessionId(null);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || !aiAvailable) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.sendChatMessage(input.trim(), sessionId || undefined);
      
      // Save session ID
      if (!sessionId) {
        setSessionId(response.sessionId);
        localStorage.setItem('bankbud_chat_session', response.sessionId);
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.message,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      if (response.suggestions) {
        setSuggestions(response.suggestions);
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: error.response?.data?.fallback || 'I apologize, but I\'m having trouble connecting right now. Please try again in a moment or check out our Compare Rates page for current offers.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearConversation = async () => {
    if (!sessionId || !confirm('Are you sure you want to clear this conversation? This cannot be undone.')) {
      return;
    }

    try {
      await api.clearConversation(sessionId);
      localStorage.removeItem('bankbud_chat_session');
      setSessionId(null);
      setMessages([{
        role: 'assistant',
        content: 'Conversation cleared! How can I help you today?',
        timestamp: new Date()
      }]);
      setSuggestions([]);
    } catch (error) {
      console.error('Error clearing conversation:', error);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (suggestion === 'Compare rates') {
      window.location.href = '/compare';
    } else if (suggestion === 'Submit a rate') {
      window.location.href = '/submit';
    } else {
      setInput(suggestion);
    }
  };

  const starterQuestions = [
    "What's the best savings account right now?",
    "I want to save $10,000. What should I do?",
    "What's the difference between a CD and savings account?",
    "Help me build an emergency fund"
  ];

  return (
    <div className="ai-advisor">
      <div className="container">
        <div className="chat-header">
          <div className="chat-header-content">
            <Sparkles size={32} className="sparkle-icon" />
            <div>
              <h1>AI Banking Advisor</h1>
              <p>Get personalized financial advice powered by AI</p>
            </div>
          </div>
          {sessionId && (
            <button
              className="btn-icon"
              onClick={handleClearConversation}
              title="Clear conversation"
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>

        <div className="chat-container">
          <div className="messages-container">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
              >
                <div className="message-icon">
                  {message.role === 'user' ? (
                    <MessageCircle size={20} />
                  ) : (
                    <Sparkles size={20} />
                  )}
                </div>
                <div className="message-content">
                  <div className="message-text">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                  <div className="message-time">
                    {new Date(message.timestamp).toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="message assistant-message">
                <div className="message-icon">
                  <Loader size={20} className="spinner" />
                </div>
                <div className="message-content">
                  <div className="message-text">Thinking...</div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {messages.length === 1 && !loading && (
            <div className="starter-questions">
              <p className="starter-label">Try asking:</p>
              <div className="starter-buttons">
                {starterQuestions.map((question, index) => (
                  <button
                    key={index}
                    className="starter-question"
                    onClick={() => setInput(question)}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {suggestions.length > 0 && (
            <div className="suggestions">
              <p className="suggestions-label">Quick actions:</p>
              <div className="suggestion-buttons">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    className="suggestion-button"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion === 'Compare rates' && <TrendingUp size={16} />}
                    {suggestion === 'Submit a rate' && <DollarSign size={16} />}
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form className="chat-input-form" onSubmit={handleSubmit}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={aiAvailable ? "Ask me anything about banking..." : "AI is currently unavailable"}
              disabled={loading || !aiAvailable}
              className="chat-input"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading || !aiAvailable}
              className="btn-send"
            >
              {loading ? <Loader size={20} className="spinner" /> : <Send size={20} />}
            </button>
          </form>
        </div>

        <div className="ai-features">
          <div className="feature-card">
            <MessageCircle size={24} />
            <h3>Remembers Context</h3>
            <p>I remember our conversation to provide better advice</p>
          </div>
          <div className="feature-card">
            <TrendingUp size={24} />
            <h3>Real-Time Rates</h3>
            <p>Get recommendations based on current market rates</p>
          </div>
          <div className="feature-card">
            <Sparkles size={24} />
            <h3>Personalized Advice</h3>
            <p>Tailored suggestions based on your goals and budget</p>
          </div>
        </div>
      </div>
    </div>
  );
}
