import Perplexity from '@perplexity-ai/perplexity_ai';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;

if (!PERPLEXITY_API_KEY) {
  throw new Error('PERPLEXITY_API_KEY is not set in environment variables');
}

const client = new Perplexity({
  apiKey: PERPLEXITY_API_KEY
});

export interface NewsArticle {
  title: string;
  summary: string;
  source: string;
  url: string;
  date: string;
  category: string;
}

// Fallback news articles when API fails
function getFallbackNews(): NewsArticle[] {
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  
  return [
    {
      title: "Federal Reserve Maintains Steady Interest Rate Policy",
      summary: "The Federal Reserve continues its current monetary policy stance, keeping rates stable as inflation shows signs of cooling. This maintains favorable conditions for savers looking at high-yield savings accounts.",
      source: "Federal Reserve",
      url: "https://www.federalreserve.gov/",
      date: today,
      category: "fed-news"
    },
    {
      title: "Best High-Yield Savings Accounts Offering Over 4% APY",
      summary: "Several online banks continue to offer competitive rates above 4% APY for high-yield savings accounts. Compare rates on BankBud to find the best options for your savings goals.",
      source: "BankBud",
      url: "/compare",
      date: today,
      category: "savings-advice"
    },
    {
      title: "Building an Emergency Fund: How Much Do You Really Need?",
      summary: "Financial experts recommend saving 3-6 months of expenses in an easily accessible savings account. Learn how to calculate your emergency fund target and choose the right account type.",
      source: "BankBud",
      url: "/ai-advisor",
      date: today,
      category: "money-tips"
    },
    {
      title: "CD Rates Remain Attractive for Long-Term Savers",
      summary: "Certificate of Deposit rates continue to offer solid returns for those willing to lock in their money. Compare CD terms and rates to maximize your savings potential.",
      source: "BankBud",
      url: "/compare",
      date: today,
      category: "rate-change"
    },
    {
      title: "Smart Banking: Tips for Choosing the Right Account",
      summary: "Selecting the right bank account depends on your financial goals, access needs, and savings timeline. Consider factors like APY, minimum deposits, and account fees when comparing options.",
      source: "BankBud",
      url: "/recommendations",
      date: today,
      category: "money-tips"
    },
    {
      title: "FDIC Insurance: Protecting Your Deposits",
      summary: "Understanding FDIC insurance is crucial for bank account safety. Learn how the $250,000 coverage limit works and strategies for protecting larger deposit amounts.",
      source: "FDIC",
      url: "https://www.fdic.gov/",
      date: today,
      category: "regulation"
    }
  ];
}

export async function fetchBankingNews(limit: number = 6): Promise<NewsArticle[]> {
  try {
    const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    
    const prompt = `Find the ${limit} most recent and important banking, personal finance, and money management news articles from ${currentDate}. Focus on:
    - Interest rate changes and announcements
    - Banking products and services (savings accounts, CDs, checking accounts)
    - Federal Reserve decisions and monetary policy
    - Personal finance tips and money-saving strategies
    - Budgeting advice and financial planning
    - Savings strategies and investment tips for beginners
    - Credit card offers and consumer banking updates
    - Financial regulations affecting consumers
    - Money management best practices
    - Retirement savings and emergency fund guidance
    
    For each article, provide:
    1. A clear, concise title
    2. A 2-3 sentence summary
    3. The source publication
    4. The article URL
    5. The publication date
    6. Category (rate-change, new-product, regulation, fed-news, market-trend, money-tips, or savings-advice)
    
    Format as a list of articles with these fields clearly labeled.`;

    const response = await client.chat.completions.create({
      model: 'sonar',
      messages: [
        { role: 'system', content: 'You are a financial news aggregator. Provide current, factual banking and finance news.' },
        { role: 'user', content: prompt }
      ],
      stream: false
    });
    
    const content = response.choices?.[0]?.message?.content;
    const text = typeof content === 'string' ? content : '';
    
    if (!text) {
      console.error('No response from Perplexity for news, using fallback');
      return getFallbackNews();
    }
    
    // Parse the response to extract news articles
    const articles = parseNewsArticles(text);
    
    // If parsing fails or returns no articles, use fallback
    if (articles.length === 0) {
      console.log('No articles parsed from response, using fallback news');
      return getFallbackNews();
    }
    
    console.log(`Fetched ${articles.length} banking news articles`);
    return articles;
    
  } catch (error) {
    console.error('Error fetching banking news, using fallback:', error);
    return getFallbackNews();
  }
}

function parseNewsArticles(text: string): NewsArticle[] {
  const articles: NewsArticle[] = [];
  
  // Split by numbered list or clear article separators
  const articleBlocks = text.split(/\n\d+\.|###|\*\*Article \d+/i).filter(block => block.trim().length > 50);
  
  for (const block of articleBlocks) {
    try {
      // Extract title (usually first line or after "Title:")
      const titleMatch = block.match(/(?:Title:|^|\n)([^\n]+?)(?:\n|Source:|Summary:)/i);
      let title = titleMatch ? titleMatch[1].trim().replace(/^[:\-*]+/, '').trim() : '';
      
      // Remove common prefixes like "Title:", "**Title:**", etc.
      title = title.replace(/^\*{0,2}\s*Title:\*{0,2}\s*/i, '').trim();
      
      // Extract summary
      const summaryMatch = block.match(/Summary:?\s*([^\n]+(?:\n[^\n]+){0,2})/i);
      const summary = summaryMatch ? summaryMatch[1].trim() : '';
      
      // Extract source
      const sourceMatch = block.match(/Source:?\s*([^\n,]+)/i);
      const source = sourceMatch ? sourceMatch[1].trim() : 'Unknown';
      
      // Extract URL
      const urlMatch = block.match(/(?:URL:|Link:)?\s*(https?:\/\/[^\s\)]+)/i);
      const url = urlMatch ? urlMatch[1].trim() : '';
      
      // Extract date
      const dateMatch = block.match(/(?:Date:|Published:)?\s*([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/i);
      const date = dateMatch ? dateMatch[1].trim() : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      
      // Extract or infer category
      const categoryMatch = block.match(/Category:?\s*([\w-]+)/i);
      let category = categoryMatch ? categoryMatch[1].trim().toLowerCase() : 'market-trend';
      
      // Infer category from content if not explicitly stated
      if (!categoryMatch) {
        if (/interest rate|fed|federal reserve|rate cut|rate hike/i.test(block)) {
          category = 'rate-change';
        } else if (/new product|launch|introduce|offering/i.test(block)) {
          category = 'new-product';
        } else if (/regulation|law|policy|SEC|FDIC/i.test(block)) {
          category = 'regulation';
        } else if (/federal reserve|fed chair|powell/i.test(block)) {
          category = 'fed-news';
        }
      }
      
      if (title && summary) {
        articles.push({
          title,
          summary: summary.length > 200 ? summary.substring(0, 200) + '...' : summary,
          source,
          url: url || '#',
          date,
          category
        });
      }
    } catch (err) {
      console.error('Error parsing article block:', err);
      continue;
    }
  }
  
  return articles.slice(0, 6); // Return up to 6 articles
}
