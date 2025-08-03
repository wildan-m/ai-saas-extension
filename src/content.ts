import type { ExtractedData, FormData, FormField, PageMetadata, ChromeMessage } from "~/types"
import { MessageHandler } from "~/lib/messaging"

class SaasContentExtractor {
  private mutationObserver: MutationObserver;
  private debounceTimer: number | null = null;

  constructor() {
    this.setupMessageListener();
    this.setupMutationObserver();
    this.detectPlatform();
  }

  setupMessageListener(): void {
    MessageHandler.setupListener((message: ChromeMessage, _sender, sendResponse) => {
      if (message.type === 'EXTRACT_CONTENT') {
        this.extractPageData()
          .then(data => sendResponse({ success: true, data }))
          .catch(error => {
            console.error('[Content] Extraction failed:', error);
            sendResponse({ success: false, error: error.message });
          });
        return true;
      }
      return false;
    });
  }

  setupMutationObserver(): void {
    this.mutationObserver = new MutationObserver((mutations) => {
      this.debounceContentChange(() => {
        this.handleContentChange(mutations);
      }, 1000);
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'id', 'data-*']
    });
  }

  debounceContentChange(func: Function, delay: number): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = window.setTimeout(func, delay);
  }

  handleContentChange(mutations: MutationRecord[]): void {
    const hasSignificantChanges = mutations.some(mutation => 
      mutation.type === 'childList' && mutation.addedNodes.length > 0
    );

    if (hasSignificantChanges) {
      MessageHandler.sendToBackground({
        type: 'CONTENT_CHANGED',
        url: window.location.href
      }).catch(error => {
        console.error('[Content] Failed to notify background of content change:', error);
      });
    }
  }

  detectPlatform(): string {
    const hostname = window.location.hostname.toLowerCase();
    const platforms = {
      'notion.so': 'notion',
      'airtable.com': 'airtable',
      'salesforce.com': 'salesforce',
      'hubspot.com': 'hubspot',
      'gmail.com': 'gmail',
      'slack.com': 'slack',
      'trello.com': 'trello',
      'asana.com': 'asana'
    };

    for (const [domain, platform] of Object.entries(platforms)) {
      if (hostname.includes(domain)) {
        return platform;
      }
    }
    return 'unknown';
  }

  async extractPageData(): Promise<ExtractedData> {
    const platform = this.detectPlatform();
    
    return {
      title: document.title,
      url: window.location.href,
      mainContent: this.extractMainContent(platform),
      forms: this.extractForms(),
      metadata: this.extractMetadata(platform),
      timestamp: Date.now()
    };
  }

  extractMainContent(platform: string): string {
    const platformSelectors: Record<string, string[]> = {
      notion: ['.notion-page-content', '[data-block-id]', '.notion-scroller'],
      airtable: ['.grid-container', '.record-container', '.form-container'],
      salesforce: ['.forceRecordLayout', '.slds-grid', '.oneContent'],
      gmail: ['.ii', '.a3s', '.im'],
      slack: ['.p-rich_text_section', '.c-message__body', '.p-message_pane'],
      unknown: ['main', '[role="main"]', '.content', '#content', 'article']
    };

    const selectors = platformSelectors[platform] || platformSelectors.unknown;
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent) {
        const content = element.textContent.trim();
        if (content.length > 50) {
          return content.slice(0, 2000);
        }
      }
    }

    return this.fallbackContentExtraction();
  }

  fallbackContentExtraction(): string {
    const excludeSelectors = ['script', 'style', 'nav', 'header', 'footer', '.ad', '.advertisement'];
    const bodyClone = document.body.cloneNode(true) as HTMLElement;
    
    excludeSelectors.forEach(selector => {
      bodyClone.querySelectorAll(selector).forEach(el => el.remove());
    });

    return bodyClone.textContent?.slice(0, 2000) || '';
  }

  extractForms(): FormData[] {
    const forms = Array.from(document.querySelectorAll('form'));
    
    return forms.map((form, index) => ({
      id: form.id || `form-${index}`,
      action: form.action || '',
      fields: this.extractFormFields(form)
    }));
  }

  extractFormFields(form: HTMLFormElement): FormField[] {
    const fields = Array.from(form.querySelectorAll('input, textarea, select'));
    
    return fields.map(field => {
      const input = field as HTMLInputElement;
      const label = this.findFieldLabel(input);
      
      return {
        name: input.name || input.id || '',
        type: input.type || input.tagName.toLowerCase(),
        value: input.type === 'password' ? '[HIDDEN]' : (input.value || ''),
        label: label
      };
    });
  }

  findFieldLabel(field: HTMLElement): string {
    if (field.getAttribute('aria-label')) {
      return field.getAttribute('aria-label') || '';
    }
    
    const labelElement = document.querySelector(`label[for="${field.id}"]`);
    if (labelElement) {
      return labelElement.textContent?.trim() || '';
    }
    
    const parentLabel = field.closest('label');
    if (parentLabel) {
      return parentLabel.textContent?.trim() || '';
    }
    
    return field.getAttribute('placeholder') || '';
  }

  extractMetadata(platform: string): PageMetadata {
    const content = this.extractMainContent(platform);
    const hasInteractiveElements = this.hasInteractiveElements();
    
    return {
      platform,
      contentType: this.determineContentType(),
      wordCount: content.split(/\s+/).length,
      hasInteractiveElements
    };
  }

  determineContentType(): string {
    const url = window.location.href.toLowerCase();
    const content = document.body.textContent?.toLowerCase() || '';
    
    if (url.includes('dashboard') || content.includes('dashboard')) return 'dashboard';
    if (url.includes('form') || document.querySelectorAll('form').length > 0) return 'form';
    if (url.includes('settings') || content.includes('settings')) return 'settings';
    if (url.includes('profile') || content.includes('profile')) return 'profile';
    if (document.querySelectorAll('table, .grid, .list').length > 0) return 'data-view';
    
    return 'content';
  }

  hasInteractiveElements(): boolean {
    const interactiveElements = document.querySelectorAll(
      'button, input, select, textarea, [role="button"], [contenteditable="true"]'
    );
    return interactiveElements.length > 5;
  }

  destroy(): void {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
  }
}

const contentExtractor = new SaasContentExtractor();

window.addEventListener('beforeunload', () => {
  contentExtractor.destroy();
});