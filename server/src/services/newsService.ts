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

export async function fetchBankingNews(limit: number = 6): Promise<NewsArticle[]> {
  try {
    const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    
    const prompt = `Find the ${limit} most recent and important banking and finance news articles from ${currentDate}. Focus on:
    - Interest rate changes and announcements
    - New banking products or services
    - Federal Reserve decisions
    - Bank mergers or acquisitions
    - Financial regulations affecting consumers
    - Savings account and CD rate trends
    
    For each article, provide:
    1. A clear, concise title
    2. A 2-3 sentence summary
    3. The source publication
    4. The article URL
    5. The publication date
    6. Category (rate-change, new-product, regulation, fed-news, or market-trend)
    
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
      console.error('No response from Perplexity for news');
      return [];
    }
    
    // Parse the response to extract news articles
    const articles = parseNewsArticles(text);
    
    console.log(`Fetched ${articles.length} banking news articles`);
    return articles;
    
  } catch (error) {
    console.error('Error fetching banking news:', error);
    return [];
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
      const title = titleMatch ? titleMatch[1].trim().replace(/^[:\-*]+/, '').trim() : '';
      
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
