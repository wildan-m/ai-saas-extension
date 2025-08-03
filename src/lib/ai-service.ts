import type { ContentAnalysis } from "~/types"

export class RealAIService {
  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor() {
    this.apiUrl = process.env.PLASMO_PUBLIC_API_URL || '';
    this.apiKey = process.env.API_KEY || '';
  }

  async analyzeContent(data: any): Promise<ContentAnalysis> {
    const prompt = this.buildAnalysisPrompt(data);

    // Example for OpenAI API
    if (this.apiUrl.includes('openai')) {
      return this.callOpenAI(prompt);
    }
    
    // Example for Anthropic Claude API
    if (this.apiUrl.includes('anthropic')) {
      return this.callClaude(prompt);
    }

    // Example for custom backend
    return this.callCustomAPI(data);
  }

  private async callOpenAI(prompt: string): Promise<ContentAnalysis> {
    const response = await fetch(`${this.apiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an AI that analyzes web content and returns structured JSON analysis.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3
      })
    });

    const result = await response.json();
    return this.parseAIResponse(result.choices[0].message.content);
  }

  private async callClaude(prompt: string): Promise<ContentAnalysis> {
    const response = await fetch(`${this.apiUrl}/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    const result = await response.json();
    return this.parseAIResponse(result.content[0].text);
  }

  private async callCustomAPI(data: any): Promise<ContentAnalysis> {
    const response = await fetch(`${this.apiUrl}/analyze`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: data.mainContent,
        url: data.url,
        platform: data.metadata.platform
      })
    });

    return await response.json();
  }

  private buildAnalysisPrompt(data: any): string {
    return `
Analyze the following web content and return a JSON response with this exact structure:

{
  "summary": "Brief summary of the content",
  "sentiment": "positive" | "negative" | "neutral",
  "keyInsights": ["insight1", "insight2", "insight3"],
  "confidence": 0.85,
  "actionableItems": ["action1", "action2"],
  "categories": ["category1", "category2"]
}

Content to analyze:
Title: ${data.title}
URL: ${data.url}
Platform: ${data.metadata.platform}
Content: ${data.mainContent.substring(0, 2000)}
Word Count: ${data.metadata.wordCount}
Has Interactive Elements: ${data.metadata.hasInteractiveElements}

Provide actionable insights for improving the user experience and content effectiveness.
`;
  }

  private parseAIResponse(response: string): ContentAnalysis {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          summary: parsed.summary || 'No summary available',
          sentiment: parsed.sentiment || 'neutral',
          keyInsights: parsed.keyInsights || [],
          confidence: parsed.confidence || 0.5,
          actionableItems: parsed.actionableItems || [],
          categories: parsed.categories || ['General Content']
        };
      }
    } catch (error) {
      console.error('[AI Service] Failed to parse AI response:', error);
    }

    // Fallback to basic analysis if parsing fails
    return {
      summary: 'AI analysis completed but response format was unexpected',
      sentiment: 'neutral',
      keyInsights: ['Content analysis performed'],
      confidence: 0.3,
      actionableItems: ['Review AI service configuration'],
      categories: ['General Content']
    };
  }
}