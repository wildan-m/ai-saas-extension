# Security Best Practices for API Keys

## ⚠️ CURRENT RISK ASSESSMENT

Your extension has **MEDIUM RISK** for API key exposure. Here's what you need to know:

## 🔍 Risk Analysis

### ✅ SAFE: Environment Variables (Background Only)
- `API_KEY` - Only accessible in background script
- Not exposed to content scripts or web pages
- Not visible in browser DevTools console

### ❌ UNSAFE: Public Environment Variables  
- `PLASMO_PUBLIC_*` variables are exposed everywhere
- Never put API keys in `PLASMO_PUBLIC_*` variables
- Only use for non-sensitive configuration

### ⚠️ MODERATE RISK: Extension Inspection
- Users can inspect extension files via `chrome://extensions`
- Bundled JavaScript may contain embedded secrets
- Requires manual source code examination

## 🛡️ SECURITY SOLUTIONS

### Option 1: Backend Proxy (RECOMMENDED)
Create a backend service that handles AI API calls:

```
Browser Extension → Your Backend → AI Service
                     (API key here)
```

**Pros:**
- API keys never leave your server
- Can implement rate limiting, logging, billing
- Better control over API usage

**Cons:**
- Requires maintaining a backend service
- Additional infrastructure costs

### Option 2: User-Provided API Keys
Let users enter their own API keys:

```javascript
// In popup, ask user for their API key
const userApiKey = await chrome.storage.local.get('userApiKey');
```

**Pros:**
- No API key exposure from your side
- Users control their own costs
- Transparent usage

**Cons:**
- Poor user experience
- Users need to get API keys themselves
- May limit adoption

### Option 3: Chrome Extension with Secure Storage
Use Chrome's secure storage with additional encryption:

```javascript
// Encrypt API key before storing
const encryptedKey = await encryptApiKey(apiKey);
await chrome.storage.local.set({ apiKey: encryptedKey });
```

**Pros:**
- Better than plaintext storage
- Still works offline

**Cons:**
- Encryption key needs to be stored somewhere
- Can still be extracted by determined users

## 🔒 IMMEDIATE SECURITY MEASURES

### 1. Update .env Structure
```bash
# NEVER put API keys in PLASMO_PUBLIC_* variables
PLASMO_PUBLIC_API_URL=https://your-backend.com/api  # Your backend, not direct AI service

# Keep API keys private (no PLASMO_PUBLIC_ prefix)
OPENAI_API_KEY=sk-your-key-here
ANTHROPIC_API_KEY=your-key-here
```

### 2. Add .env to .gitignore
```bash
# .gitignore
.env
.env.local
.env.development
.env.production
node_modules/
build/
```

### 3. Use Environment Detection
```javascript
// Only use API keys in development
if (process.env.NODE_ENV === 'development') {
  // Use API keys for development
} else {
  // Use backend proxy for production
}
```

## 📋 PRODUCTION RECOMMENDATIONS

### For MVP/Demo (Low Security)
- Keep current setup with API keys in background script
- Add API key rotation
- Monitor usage closely
- Clear documentation about risks

### For Production (High Security)  
- Build a backend proxy service
- Never include API keys in extension
- Implement user authentication
- Add usage monitoring and rate limiting

## 🚨 RED FLAGS - NEVER DO THIS

```bash
# ❌ NEVER - API key exposed to content scripts
PLASMO_PUBLIC_API_KEY=sk-your-key-here

# ❌ NEVER - Commit API keys to git  
git add .env

# ❌ NEVER - Hardcode in source files
const API_KEY = "sk-hardcoded-key-here";
```

## ✅ SECURITY CHECKLIST

- [ ] API keys only in private environment variables (no `PLASMO_PUBLIC_`)
- [ ] .env files in .gitignore
- [ ] No hardcoded secrets in source code
- [ ] API usage monitoring enabled
- [ ] Consider backend proxy for production
- [ ] Regular API key rotation
- [ ] Clear user documentation about data handling