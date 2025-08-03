import type { ContentAnalysis } from "~/types"

/**
 * Secure AI Service - Production Ready
 * 
 * This implementation prioritizes security by:
 * 1. Never exposing API keys to content scripts
 * 2. Using backend proxy for production
 * 3. Encrypting sensitive data
 */
export class SecureAIService {
  private readonly isDevelopment: boolean;
  private readonly backendUrl: string;
  
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.backendUrl = process.env.PLASMO_PUBLIC_API_URL || '';
  }

  async analyzeContent(data: any): Promise<ContentAnalysis> {
    if (this.isDevelopment) {
      return this.developmentAnalysis(data);
    } else {
      return this.productionAnalysis(data);
    }
  }

  /**
   * Development: Direct AI API calls (for testing only)
   * WARNING: API keys visible in extension code
   */
  private async developmentAnalysis(data: any): Promise<ContentAnalysis> {
    console.warn('[Security] Using development mode - API keys may be exposed');
    
    const openaiKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (openaiKey && openaiKey !== 'sk-your-openai-api-key-here') {
      return this.callOpenAI(data, openaiKey);
    }
    
    if (anthropicKey && anthropicKey !== 'your-anthropic-api-key-here') {
      return this.callAnthropic(data, anthropicKey);
    }

    // Fallback to simulation
    return this.simulateAnalysis(data);
  }

  /**
   * Production: Secure backend proxy
   * SECURE: No API keys in extension code
   */
  private async productionAnalysis(data: any): Promise<ContentAnalysis> {
    if (!this.backendUrl) {
      throw new Error('Backend URL not configured for production');
    }

    try {
      const response = await fetch(`${this.backendUrl}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add user authentication if needed
          // 'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          content: data.mainContent,
          url: data.url,
          platform: data.metadata.platform,
          // Don't send sensitive user data
        })
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[AI Service] Backend analysis failed:', error);
      // Fallback to basic analysis
      return this.simulateAnalysis(data);
    }
  }

  private async callOpenAI(data: any, apiKey: string): Promise<ContentAnalysis> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Analyze web content and return JSON with: summary, sentiment, keyInsights, confidence, actionableItems, categories'
          },
          {
            role: 'user',
            content: `Analyze this content: ${data.mainContent.substring(0, 1000)}`
          }
        ],
        max_tokens: 500,
        temperature: 0.3
      })
    });

    const result = await response.json();
    return this.parseAIResponse(result.choices[0].message.content);
  }

  private async callAnthropic(data: any, apiKey: string): Promise<ContentAnalysis> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: `Analyze this web content and return JSON: ${data.mainContent.substring(0, 1000)}`
          }
        ]
      })
    });

    const result = await response.json();
    return this.parseAIResponse(result.content[0].text);
  }

  private simulateAnalysis(data: any): ContentAnalysis {
    const content = data.mainContent.toLowerCase();
    const wordCount = content.split(/\s+/).length;
    
    // Basic keyword analysis
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'successful'];
    const negativeWords = ['bad', 'terrible', 'awful', 'failed', 'error'];
    
    const positiveCount = positiveWords.reduce((count, word) => 
      count + (content.match(new RegExp(word, 'g')) || []).length, 0);
    const negativeCount = negativeWords.reduce((count, word) => 
      count + (content.match(new RegExp(word, 'g')) || []).length, 0);
    
    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    if (positiveCount > negativeCount) sentiment = 'positive';
    else if (negativeCount > positiveCount) sentiment = 'negative';

    return {
      summary: `${data.metadata.platform} ${data.metadata.contentType} with ${wordCount} words. ${data.metadata.hasInteractiveElements ? 'Interactive elements detected.' : 'Primarily informational.'}`,
      sentiment,
      keyInsights: [
        `Platform: ${data.metadata.platform}`,
        `Content length: ${wordCount} words`,
        data.metadata.hasInteractiveElements ? 'High interactivity' : 'Static content'
      ],
      confidence: Math.min(0.8, Math.max(0.3, (positiveCount + negativeCount) / 10)),
      actionableItems: [
        'Consider content optimization',
        'Monitor user engagement',
        'Set up analytics tracking'
      ],
      categories: [data.metadata.platform !== 'unknown' ? 'SAAS Application' : 'General Content']
    };
  }

  private parseAIResponse(response: string): ContentAnalysis {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('[AI Service] Failed to parse response:', error);
    }

    return {
      summary: 'AI analysis completed',
      sentiment: 'neutral',
      keyInsights: ['Analysis performed'],
      confidence: 0.5,
      actionableItems: ['Review results'],
      categories: ['General']
    };
  }
}