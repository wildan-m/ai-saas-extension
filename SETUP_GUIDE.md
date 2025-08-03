# 🚀 Quick Setup Guide

## 📋 **What to Fill in .env**

### **For Development/Testing (Quick Start):**

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Fill in your .env file:**
   ```bash
   # Set mode to development
   NODE_ENV=development

   # Add your OpenAI API key (recommended for testing)
   OPENAI_API_KEY=sk-your-actual-openai-key-here
   ```

3. **Get OpenAI API key:**
   - Go to: https://platform.openai.com/api-keys
   - Click "Create new secret key"
   - Copy the key (starts with `sk-`)
   - Paste it in your `.env` file

4. **Start development:**
   ```bash
   npm run dev
   ```

### **For Production (When Publishing):**

1. **Build your backend server** (Node.js/Python/etc.) that:
   - Receives content from your extension
   - Calls AI APIs with your API keys (secure)
   - Returns analysis results

2. **Update .env for production:**
   ```bash
   # Set mode to production
   NODE_ENV=production

   # Point to your backend (not AI service directly)
   PLASMO_PUBLIC_BACKEND_URL=https://your-backend.herokuapp.com
   ```

3. **Build for production:**
   ```bash
   npm run build
   ```

## 🔒 **Security Explanation**

### **Development Mode** ✅
```
Extension → AI Service (OpenAI/Claude)
    ↑
 API Key Here
```
- **Safe for testing**: API key stays in background script
- **Risk**: Can be extracted by determined users
- **Use for**: Development, prototyping, testing

### **Production Mode** 🛡️
```
Extension → Your Backend → AI Service
              ↑
           API Key Here
```
- **Secure**: API keys never leave your server
- **Benefits**: Rate limiting, logging, user auth
- **Use for**: Real users, published extensions

## 📝 **What Each Variable Does**

| Variable | Used For | Security Level |
|----------|----------|----------------|
| `NODE_ENV` | Switches between dev/prod modes | Safe |
| `OPENAI_API_KEY` | Direct OpenAI calls (dev only) | Private* |
| `ANTHROPIC_API_KEY` | Direct Claude calls (dev only) | Private* |
| `PLASMO_PUBLIC_BACKEND_URL` | Your backend server URL | Public |

*Private = Not exposed to web pages, but can be extracted from extension files

## 🎯 **Current Setup**

Your extension is currently configured for:
- ✅ **Development mode** with simulated analysis
- ✅ **Safe for testing** without API keys
- ✅ **Ready to add** real AI when you get API keys

To use real AI, just add your OpenAI key to `.env` and restart the dev server!