import type { ChromeMessage } from "~/types"

export class MessageHandler {
  static async sendToBackground(message: ChromeMessage): Promise<any> {
    try {
      const response = await chrome.runtime.sendMessage(message)
      if (!response.success) {
        throw new Error(response.error || 'Message failed')
      }
      return response
    } catch (error) {
      console.error('[Messaging] Failed to send message to background:', error)
      throw error
    }
  }

  static async sendToContent(tabId: number, message: ChromeMessage): Promise<any> {
    try {
      const response = await chrome.tabs.sendMessage(tabId, message)
      if (!response.success) {
        throw new Error(response.error || 'Message failed')
      }
      return response
    } catch (error) {
      console.error('[Messaging] Failed to send message to content script:', error)
      throw error
    }
  }

  static setupListener(handler: (message: ChromeMessage, sender: chrome.runtime.MessageSender, sendResponse: Function) => boolean | void) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      try {
        return handler(message as ChromeMessage, sender, sendResponse)
      } catch (error) {
        console.error('[Messaging] Error in message handler:', error)
        sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' })
        return false
      }
    })
  }
}