import { Mistral } from '@mistralai/mistralai';
import Conversation, { IMessage } from '../models/Conversation.js';
import BankRate from '../models/BankRate.js';

let mistral: Mistral | null = null;

if (process.env.MISTRAL_API_KEY && process.env.MISTRAL_API_KEY !== 'your_mistral_api_key_here') {
  mistral = new Mistral({
    apiKey: process.env.MISTRAL_API_KEY,
  });
}

interface ChatRequest {
  sessionId: string;
  message: string;
  includeRates?: boolean;
}

interface ChatResponse {
  message: string;
  suggestions?: string[];
  relatedRates?: any[];
}

export async function chatWithAI(request: ChatRequest): Promise<ChatResponse> {
  if (!mistral) {
    throw new Error('Mistral AI is not configured. Please add your API key to use AI features.');
  }

  const { sessionId, message, includeRates = true } = request;

  // Get or create conversation
  let conversation = await Conversation.findOne({ sessionId });
  
  if (!conversation) {
    conversation = new Conversation({
      sessionId,
      messages: [],
      userPreferences: {}
    });
  }

  // Add user message to conversation
  conversation.messages.push({
    role: 'user',
    content: message,
    timestamp: new Date()
  });

  // Get relevant bank rates if requested
  let ratesContext = '';
  let relatedRates: any[] = [];
  
  if (includeRates) {
    const rates = await BankRate.find()
      .sort({ apy: -1, verifications: -1 })
      .limit(10);
    
    relatedRates = rates.map(r => ({
      _id: r._id,
      bankName: r.bankName,
      accountType: r.accountType,
      apy: r.apy || r.rate,
      minDeposit: r.minDeposit,
      features: r.features,
      verifications: r.verifications
    }));

    ratesContext = `\n\nCurrent Top Bank Rates Available:\n${JSON.stringify(relatedRates, null, 2)}`;
  }

  // Build conversation history for context
  const conversationHistory = conversation.messages.slice(-10).map(msg => ({
    role: msg.role,
    content: msg.content
  }));

  // System prompt with financial advisor persona
  const systemPrompt = `You are BankBuddy AI, a knowledgeable and friendly financial advisor specializing in helping people find the best banking products. You always have access to current web information to provide the most up-to-date advice.

Your role:
- Help users understand different banking products (savings, checking, CDs, money market accounts)
- Recommend specific banks and rates based on their needs and goals
- Remember previous conversation context to provide personalized advice
- Ask clarifying questions to better understand their situation
- Explain financial concepts in simple terms
- Be encouraging and supportive about their financial goals
- Use current web information to provide accurate, up-to-date responses

Capabilities:
- You automatically access current web information for all financial queries
- You provide the latest banking news, rates, and financial information as of January 2026
- Always use the most current data available from web searches
- Cite sources when providing specific current information

Important guidelines:
- Always consider the user's complete conversation history
- Reference specific rates and banks from the available data when relevant
- Prioritize current web information over older database data when there's a conflict
- When you use web search results, mention that the information is current
- Help users compare options based on their priorities
- Ask about their goals, budget, time horizon, and risk tolerance
- Be conversational and empathetic

User Preferences from conversation history:
${JSON.stringify(conversation.userPreferences || {}, null, 2)}

${ratesContext}`;

  try {
    // Always try to get current web information for better, up-to-date responses
    let webSearchContext = '';
    
    // Use Perplexity for web search to get current information
    try {
      const Perplexity = (await import('@perplexity-ai/perplexity_ai')).default;
      const perplexityClient = new Perplexity({
        apiKey: process.env.PERPLEXITY_API_KEY || ''
      });
      
      const searchResponse = await perplexityClient.chat.completions.create({
        model: 'sonar',
        messages: [
          { role: 'system', content: 'You are a financial information researcher. Provide current, factual information about banking rates and financial products as of January 2026.' },
          { role: 'user', content: `Find current information relevant to this question: ${message}` }
        ],
        stream: false
      });
      
      const messageContent = searchResponse.choices?.[0]?.message?.content;
      webSearchContext = typeof messageContent === 'string' ? messageContent : '';
      if (webSearchContext) {
        webSearchContext = `\n\nCurrent Web Information (January 2026):\n${webSearchContext}\n`;
      }
    } catch (searchError) {
      console.error('Web search error:', searchError);
      // Continue without web search if it fails
    }

    const completion = await mistral.chat.complete({
      model: 'mistral-large-latest',
      messages: [
        { role: 'system', content: systemPrompt + webSearchContext },
        ...conversationHistory
      ],
      temperature: 0.7,
      maxTokens: 800,
    });

    const assistantMessage = completion.choices?.[0]?.message?.content || 'I apologize, but I encountered an error. Please try again.';

    // Add assistant response to conversation
    conversation.messages.push({
      role: 'assistant',
      content: assistantMessage,
      timestamp: new Date()
    });

    // Extract and update user preferences from conversation
    updateUserPreferences(conversation, message);

    // Generate summary if conversation is getting long
    if (conversation.messages.length > 20) {
      conversation.summary = await generateConversationSummary(conversation.messages);
    }

    await conversation.save();

    // Extract suggestions from the response
    const suggestions = extractSuggestions(assistantMessage);

    return {
      message: assistantMessage,
      suggestions,
      relatedRates: includeRates ? relatedRates : undefined
    };

  } catch (error) {
    console.error('Error in AI chat:', error);
    throw new Error('Failed to process your message. Please try again.');
  }
}

// Helper function to update user preferences based on conversation
function updateUserPreferences(conversation: any, message: string) {
  const lowerMessage = message.toLowerCase();
  
  // Extract account type preference
  if (lowerMessage.includes('savings')) {
    conversation.userPreferences.accountType = 'savings';
  } else if (lowerMessage.includes('checking')) {
    conversation.userPreferences.accountType = 'checking';
  } else if (lowerMessage.includes('cd') || lowerMessage.includes('certificate')) {
    conversation.userPreferences.accountType = 'cd';
  } else if (lowerMessage.includes('money market')) {
    conversation.userPreferences.accountType = 'money-market';
  }

  // Extract goals
  if (!conversation.userPreferences.goals) {
    conversation.userPreferences.goals = [];
  }
  
  const goalKeywords = ['save', 'emergency fund', 'retirement', 'house', 'vacation', 'college', 'debt'];
  goalKeywords.forEach(keyword => {
    if (lowerMessage.includes(keyword) && !conversation.userPreferences.goals.includes(keyword)) {
      conversation.userPreferences.goals.push(keyword);
    }
  });

  // Extract budget/deposit amount
  const amountMatch = message.match(/\$?([\d,]+)/);
  if (amountMatch) {
    const amount = parseInt(amountMatch[1].replace(/,/g, ''));
    if (amount > 100 && amount < 10000000) {
      conversation.userPreferences.budget = amount;
    }
  }

  // Extract risk tolerance
  if (lowerMessage.includes('safe') || lowerMessage.includes('conservative') || lowerMessage.includes('secure')) {
    conversation.userPreferences.riskTolerance = 'conservative';
  } else if (lowerMessage.includes('aggressive') || lowerMessage.includes('high return')) {
    conversation.userPreferences.riskTolerance = 'aggressive';
  }
}

// Helper function to generate conversation summary
async function generateConversationSummary(messages: IMessage[]): Promise<string> {
  if (!mistral) return 'Conversation about banking needs';

  const recentMessages = messages.slice(-20).map(m => `${m.role}: ${m.content}`).join('\n');
  
  try {
    const completion = await mistral.chat.complete({
      model: 'mistral-small-latest',
      messages: [
        {
          role: 'system',
          content: 'Summarize this banking conversation in 1-2 sentences, focusing on the user\'s needs and preferences.'
        },
        {
          role: 'user',
          content: recentMessages
        }
      ],
      temperature: 0.5,
      maxTokens: 100,
    });

    return completion.choices?.[0]?.message?.content || 'Banking conversation';
  } catch (error) {
    console.error('Error generating summary:', error);
    return 'Banking conversation';
  }
}

// Helper function to extract action suggestions from AI response
function extractSuggestions(message: string): string[] {
  const suggestions: string[] = [];
  
  // Look for common suggestion patterns
  if (message.toLowerCase().includes('compare')) {
    suggestions.push('Compare rates');
  }
  if (message.toLowerCase().includes('submit') || message.toLowerCase().includes('add your')) {
    suggestions.push('Submit a rate');
  }
  if (message.toLowerCase().includes('more about')) {
    suggestions.push('Learn more');
  }
  
  return suggestions;
}

// Get conversation history
export async function getConversationHistory(sessionId: string) {
  const conversation = await Conversation.findOne({ sessionId });
  return conversation || null;
}

// Clear conversation
export async function clearConversation(sessionId: string) {
  await Conversation.findOneAndDelete({ sessionId });
}

export default {
  chatWithAI,
  getConversationHistory,
  clearConversation
};
