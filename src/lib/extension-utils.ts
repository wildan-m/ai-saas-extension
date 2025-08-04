/**
 * Extension Utilities - Handle Common Chrome Extension Issues
 */

export class ExtensionUtils {
  /**
   * Check if extension context is still valid
   */
  static isContextValid(): boolean {
    try {
      return !!(chrome?.runtime?.id);
    } catch (error) {
      return false;
    }
  }

  /**
   * Safe chrome.runtime.sendMessage with context validation
   */
  static async sendMessage(message: any, options: { retries?: number; timeout?: number } = {}): Promise<any> {
    const { retries = 2, timeout = 5000 } = options;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        if (!this.isContextValid()) {
          throw new Error('Extension context invalidated');
        }

        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Message timeout')), timeout);
        });

        const messagePromise = chrome.runtime.sendMessage(message);
        const result = await Promise.race([messagePromise, timeoutPromise]);

        return result;
      } catch (error) {
        console.warn(`[ExtensionUtils] Message attempt ${attempt + 1} failed:`, error);

        if (attempt === retries) {
          if (error instanceof Error && error.message.includes('Extension context invalidated')) {
            throw new ExtensionContextError('Extension was reloaded. Please try again.');
          }
          throw error;
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }
  }

  /**
   * Safe chrome.tabs.sendMessage with context validation
   */
  static async sendTabMessage(tabId: number, message: any, options: { retries?: number; timeout?: number } = {}): Promise<any> {
    const { retries = 2, timeout = 5000 } = options;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        if (!this.isContextValid()) {
          throw new Error('Extension context invalidated');
        }

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Tab message timeout')), timeout);
        });

        const messagePromise = chrome.tabs.sendMessage(tabId, message);
        const result = await Promise.race([messagePromise, timeoutPromise]);

        return result;
      } catch (error) {
        console.warn(`[ExtensionUtils] Tab message attempt ${attempt + 1} failed:`, error);

        if (attempt === retries) {
          if (error instanceof Error && error.message.includes('Extension context invalidated')) {
            throw new ExtensionContextError('Extension was reloaded. Please try again.');
          }
          if (error instanceof Error && error.message.includes('Receiving end does not exist')) {
            throw new ContentScriptError('Content script not ready. Please refresh the page and try again.');
          }
          throw error;
        }

        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }
  }

  /**
   * Safe storage operations
   */
  static async safeStorageGet(keys: string | string[]): Promise<any> {
    try {
      if (!this.isContextValid()) {
        throw new Error('Extension context invalidated');
      }
      return await chrome.storage.local.get(keys);
    } catch (error) {
      console.error('[ExtensionUtils] Storage get failed:', error);
      return {};
    }
  }

  static async safeStorageSet(items: { [key: string]: any }): Promise<void> {
    try {
      if (!this.isContextValid()) {
        throw new Error('Extension context invalidated');
      }
      await chrome.storage.local.set(items);
    } catch (error) {
      console.error('[ExtensionUtils] Storage set failed:', error);
    }
  }

  /**
   * Get current active tab safely
   */
  static async getCurrentTab(): Promise<chrome.tabs.Tab | null> {
    try {
      if (!this.isContextValid()) {
        throw new Error('Extension context invalidated');
      }

      const [tab] = await chrome.tabs.query({ 
        active: true, 
        currentWindow: true 
      });
      
      return tab || null;
    } catch (error) {
      console.error('[ExtensionUtils] Get current tab failed:', error);
      return null;
    }
  }

  /**
   * Handle extension lifecycle events
   */
  static setupLifecycleHandlers() {
    // Handle service worker restart
    chrome.runtime.onStartup.addListener(() => {
      console.log('[ExtensionUtils] Extension startup detected');
    });

    // Handle extension install/update
    chrome.runtime.onInstalled.addListener((details) => {
      console.log('[ExtensionUtils] Extension installed/updated:', details.reason);
    });

    // Handle connection errors
    chrome.runtime.onConnect.addListener((port) => {
      port.onDisconnect.addListener(() => {
        if (chrome.runtime.lastError) {
          console.warn('[ExtensionUtils] Port disconnected:', chrome.runtime.lastError.message);
        }
      });
    });
  }
}

/**
 * Custom error classes for better error handling
 */
export class ExtensionContextError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExtensionContextError';
  }
}

export class ContentScriptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContentScriptError';
  }
}

export class BackgroundServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackgroundServiceError';
  }
}