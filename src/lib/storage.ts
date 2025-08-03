import { Storage } from "@plasmohq/storage"

// Initialize Plasmo storage
const storage = new Storage()

export class ExtensionStorage {
  static async setAnalysis(url: string, analysis: any) {
    await storage.set(`analysis_${url}`, analysis)
    await storage.set('lastAnalyzedUrl', url)
  }

  static async getAnalysis(url: string) {
    return await storage.get(`analysis_${url}`)
  }

  static async getLastAnalyzedUrl() {
    return await storage.get('lastAnalyzedUrl')
  }

  static async clearAnalysis(url?: string) {
    if (url) {
      await storage.remove(`analysis_${url}`)
    } else {
      // Clear all analysis data
      const keys = await storage.getAll()
      const analysisKeys = Object.keys(keys).filter(key => key.startsWith('analysis_'))
      for (const key of analysisKeys) {
        await storage.remove(key)
      }
      await storage.remove('lastAnalyzedUrl')
    }
  }

  static async setSettings(settings: Record<string, any>) {
    await storage.set('settings', settings)
  }

  static async getSettings() {
    return await storage.get('settings') || {}
  }
}

export default storage