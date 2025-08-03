import type { ContentAnalysis, RateLimitEntry, ChromeMessage } from "~/types"
import { MessageHandler } from "~/lib/messaging"

class AIService {
  private rateLimiter = new Map<string, RateLimitEntry>();
  private cache = new Map<string, { data: ContentAnalysis; timestamp: number }>();
  private readonly RATE_LIMIT = 10; // requests per minute
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.setupMessageHandlers();
    this.setupKeepAlive();
    this.initializeExtension();
  }

  private initializeExtension(): void {
    // Plasmo-specific initialization
    console.log('[Background] AI Service initialized');
  }

  setupMessageHandlers(): void {
    MessageHandler.setupListener((message: ChromeMessage, _sender, sendResponse) => {
      if (message.type === 'ANALYZE_CONTENT') {
        this.handleContentAnalysis(message.data)
          .then(analysis => sendResponse({ success: true, analysis }))
          .catch(error => {
            console.error('[Background] Analysis failed:', error);
            sendResponse({ success: false, error: error.message });
          });
        return true;
      }
      
      if (message.type === 'CONTENT_CHANGED') {
        this.handleContentChange(message.url || '');
        sendResponse({ success: true });
        return false;
      }
      
      return false;
    });
  }

  setupKeepAlive(): void {
    // Plasmo handles service worker lifecycle automatically
    // This is mainly for logging/debugging purposes
    chrome.runtime.onConnect.addListener(port => {
      if (port.name === 'keepAlive') {
        port.onDisconnect.addListener(() => {
          console.log('[Background] Port disconnected, service worker may terminate');
        });
      }
    });
  }

  async handleContentAnalysis(data: any): Promise<ContentAnalysis> {
    const contentHash = this.generateContentHash(data.mainContent);
    
    // Check cache first
    const cached = this.cache.get(contentHash);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      return cached.data;
    }

    // Check rate limit
    if (!this.checkRateLimit()) {
      throw new Error('Rate limit exceeded. Please wait before making another request.');
    }

    // Simulate AI analysis (replace with actual API call in production)
    const analysis = await this.simulateAIAnalysis(data);
    
    // Cache the result
    this.cache.set(contentHash, { data: analysis, timestamp: Date.now() });
    
    return analysis;
  }

  private checkRateLimit(): boolean {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window
    const userKey = 'default_user'; // In production, use actual user identification
    
    // Clean old entries
    for (const [key, entry] of this.rateLimiter) {
      if (entry.timestamp < windowStart) {
        this.rateLimiter.delete(key);
      }
    }
    
    const currentEntry = this.rateLimiter.get(userKey);
    if (!currentEntry) {
      this.rateLimiter.set(userKey, { timestamp: now, count: 1 });
      return true;
    }
    
    if (currentEntry.count >= this.RATE_LIMIT) {
      return false;
    }
    
    currentEntry.count++;
    return true;
  }

  private generateContentHash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  private async simulateAIAnalysis(data: any): Promise<ContentAnalysis> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const content = data.mainContent.toLowerCase();
    const wordCount = content.split(/\s+/).length;
    
    // Simple keyword-based analysis for demo
    const sentimentKeywords = {
      positive: ['good', 'great', 'excellent', 'amazing', 'successful', 'growth', 'improve', 'better'],
      negative: ['bad', 'terrible', 'awful', 'failed', 'error', 'problem', 'issue', 'decrease']
    };
    
    let positiveCount = 0;
    let negativeCount = 0;
    
    sentimentKeywords.positive.forEach(word => {
      positiveCount += (content.match(new RegExp(word, 'g')) || []).length;
    });
    
    sentimentKeywords.negative.forEach(word => {
      negativeCount += (content.match(new RegExp(word, 'g')) || []).length;
    });
    
    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    if (positiveCount > negativeCount) sentiment = 'positive';
    else if (negativeCount > positiveCount) sentiment = 'negative';
    
    const keyInsights = this.extractKeyInsights(data);
    const actionableItems = this.generateActionableItems(data);
    const categories = this.categorizeContent(data);
    
    return {
      summary: this.generateSummary(data, wordCount),
      sentiment,
      keyInsights,
      confidence: Math.min(0.9, Math.max(0.3, (positiveCount + negativeCount) / 10)),
      actionableItems,
      categories
    };
  }

  private extractKeyInsights(data: any): string[] {
    const insights: string[] = [];
    const content = data.mainContent.toLowerCase();
    
    if (content.includes('dashboard')) {
      insights.push('Page appears to be a dashboard interface');
    }
    
    if (data.forms && data.forms.length > 0) {
      insights.push(`Contains ${data.forms.length} interactive form${data.forms.length > 1 ? 's' : ''}`);
    }
    
    if (data.metadata.hasInteractiveElements) {
      insights.push('High level of user interaction elements detected');
    }
    
    if (data.metadata.wordCount > 500) {
      insights.push('Content-rich page with substantial information');
    }
    
    const platform = data.metadata.platform;
    if (platform !== 'unknown') {
      insights.push(`Optimized for ${platform} platform integration`);
    }
    
    return insights.length > 0 ? insights : ['Standard web content detected'];
  }

  private generateActionableItems(data: any): string[] {
    const items: string[] = [];
    
    if (data.forms && data.forms.length > 0) {
      items.push('Review form completion rates and user experience');
    }
    
    if (data.metadata.wordCount > 1000) {
      items.push('Consider content summarization for better readability');
    }
    
    if (data.metadata.hasInteractiveElements) {
      items.push('Monitor user interaction patterns and optimize workflow');
    }
    
    items.push('Set up automated monitoring for content changes');
    
    return items;
  }

  private categorizeContent(data: any): string[] {
    const categories: string[] = [];
    const content = data.mainContent.toLowerCase();
    const url = data.url.toLowerCase();
    
    if (url.includes('dashboard') || content.includes('dashboard')) {
      categories.push('Dashboard');
    }
    
    if (data.forms && data.forms.length > 0) {
      categories.push('Forms');
    }
    
    if (content.includes('analytics') || content.includes('metrics')) {
      categories.push('Analytics');
    }
    
    if (content.includes('settings') || content.includes('configuration')) {
      categories.push('Configuration');
    }
    
    if (data.metadata.platform !== 'unknown') {
      categories.push('SAAS Application');
    }
    
    return categories.length > 0 ? categories : ['General Content'];
  }

  private generateSummary(data: any, wordCount: number): string {
    const platform = data.metadata.platform;
    const contentType = data.metadata.contentType;
    
    if (platform !== 'unknown') {
      return `${platform.charAt(0).toUpperCase() + platform.slice(1)} ${contentType} page with ${wordCount} words. ${data.metadata.hasInteractiveElements ? 'High user interaction potential.' : 'Primarily informational content.'}`;
    }
    
    return `Web ${contentType} with ${wordCount} words. ${data.forms && data.forms.length > 0 ? `Contains ${data.forms.length} forms.` : ''} ${data.metadata.hasInteractiveElements ? 'Interactive elements detected.' : ''}`;
  }

  private handleContentChange(url: string): void {
    console.log(`Content changed on: ${url}`);
    // In a real implementation, you might want to invalidate cache or trigger re-analysis
  }
}

// Initialize the service
const aiService = new AIService();

// Plasmo-specific extension lifecycle handlers
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Background] AI SAAS Extension installed:', details.reason);
  
  if (details.reason === 'install') {
    // First time installation
    console.log('[Background] First time installation');
  } else if (details.reason === 'update') {
    // Extension update
    console.log('[Background] Extension updated from:', details.previousVersion);
  }
});

// Export for Plasmo (optional but recommended for debugging)
export default aiService;