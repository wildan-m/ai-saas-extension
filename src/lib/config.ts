/**
 * Configuration - Manual environment variable injection for Plasmo
 * 
 * Since Plasmo only auto-injects PLASMO_PUBLIC_* variables,
 * we manually inject private API keys at build time.
 */

// Manual environment variable injection (replaced during build)
// @ts-ignore - This will be replaced by build script
const INJECTED_OPENAI_KEY = "INJECT_OPENAI_KEY_HERE";
// @ts-ignore - This will be replaced by build script  
const INJECTED_ANTHROPIC_KEY = "INJECT_ANTHROPIC_KEY_HERE";

const config = {
  // Environment
  isDevelopment: process.env.NODE_ENV === 'development',
  
  // API Keys - manually injected during build
  openaiApiKey: INJECTED_OPENAI_KEY !== "INJECT_OPENAI_KEY_HERE" ? INJECTED_OPENAI_KEY : undefined,
  anthropicApiKey: INJECTED_ANTHROPIC_KEY !== "INJECT_ANTHROPIC_KEY_HERE" ? INJECTED_ANTHROPIC_KEY : undefined,
  
  // Public URLs (auto-injected by Plasmo)
  backendUrl: process.env.PLASMO_PUBLIC_BACKEND_URL,
  
  // App info
  appName: process.env.PLASMO_PUBLIC_APP_NAME || 'AI SAAS Content Analyzer',
  appVersion: process.env.PLASMO_PUBLIC_VERSION || '1.0.0',
  
  // Limits  
  rateLimit: parseInt(process.env.RATE_LIMIT || '10'),
  cacheDuration: parseInt(process.env.CACHE_DURATION || '300000')
};

export default config;

// Helper functions
export const hasValidOpenAIKey = (): boolean => {
  return !!(config.openaiApiKey && 
           config.openaiApiKey !== 'sk-your-openai-api-key-here' &&
           config.openaiApiKey !== 'your-actual-openai-key-here');
};

export const hasValidAnthropicKey = (): boolean => {
  return !!(config.anthropicApiKey && 
           config.anthropicApiKey !== 'your-anthropic-api-key-here' &&
           config.anthropicApiKey !== 'your-actual-anthropic-key-here');
};

export const getApiMode = (): 'openai' | 'anthropic' | 'backend' | 'simulation' => {
  if (!config.isDevelopment && config.backendUrl) {
    return 'backend';
  }
  
  if (config.isDevelopment) {
    if (hasValidOpenAIKey()) return 'openai';
    if (hasValidAnthropicKey()) return 'anthropic';
  }
  
  return 'simulation';
};

// Log configuration (development only)
if (config.isDevelopment) {
  console.log('[Config] Extension configuration:', {
    mode: getApiMode(),
    hasOpenAI: hasValidOpenAIKey(),
    hasAnthropic: hasValidAnthropicKey(),
    hasBackend: !!config.backendUrl,
    nodeEnv: process.env.NODE_ENV
  });
}