# Plasmo Framework Development Best Practices (2024-2025)

This document outlines the comprehensive best practices for developing browser extensions using the Plasmo Framework, based on the latest documentation and community recommendations.

## Table of Contents

1. [Getting Started & Setup](#getting-started--setup)
2. [Project Structure](#project-structure)
3. [Development Workflow](#development-workflow)
4. [File-Based Architecture](#file-based-architecture)
5. [Hot Module Replacement & Live Reload](#hot-module-replacement--live-reload)
6. [Inter-Component Communication](#inter-component-communication)
7. [UI Development](#ui-development)
8. [Storage & State Management](#storage--state-management)
9. [Environment Variables](#environment-variables)
10. [TypeScript Integration](#typescript-integration)
11. [Testing & Debugging](#testing--debugging)
12. [Performance Considerations](#performance-considerations)
13. [Production Build & Deployment](#production-build--deployment)
14. [Multi-Browser Support](#multi-browser-support)
15. [Common Issues & Solutions](#common-issues--solutions)

## Getting Started & Setup

### Installation
```bash
# Create new project
pnpm create plasmo example-dir
cd example-dir
pnpm dev

# Or with existing project
npm install plasmo@latest
```

### Initial Setup
```bash
npm run dev    # Start development server
```

### Browser Extension Loading
1. Navigate to `chrome://extensions`
2. Enable **Developer Mode**
3. Click **"Load Unpacked"**
4. Select `build/chrome-mv3-dev` directory
5. **Pin extension** to Chrome toolbar for easy access

## Project Structure

### Recommended Directory Structure
```
src/
├── components/        # Shared React components
├── lib/              # Utility functions and services
├── types/            # TypeScript type definitions
├── popup.tsx         # Main popup UI
├── content.ts        # Content script logic
├── background.ts     # Background service worker
├── options.tsx       # Options page (optional)
└── sidepanel.tsx     # Side panel (optional)

assets/               # Icons and static files
├── icon.png         # Main icon (auto-generates all sizes)
└── ...

.env                 # Environment variables
.env.example         # Environment variables template
```

### Key Principles
- **Convention over Configuration**: Files automatically become extension components
- **No Manual Manifest**: Plasmo auto-generates `manifest.json`
- **Declarative Development**: Export a component, Plasmo handles the rest

## Development Workflow

### Core Philosophy
> **"Learn once, write everywhere"** - Build an extension once and easily target multiple browsers and manifest versions.

### Development Commands
```bash
npm run dev      # Start development with hot reload
npm run build    # Create production build
npm run package  # Package for store submission
```

### Development Indicators
- Extension name prefixed with `DEV |`
- Grayscale icon to distinguish from production
- Console logging for development insights

## File-Based Architecture

### Component Types
- `popup.tsx` → Extension popup UI (click extension icon)
- `content.ts` → Content script injected into web pages
- `background.ts` → Service worker/background script
- `options.tsx` → Extension settings/preferences page
- `sidepanel.tsx` → Browser-native side panel
- `devtools.tsx` → Developer tools panel

### Auto-Generated Manifest
Plasmo automatically generates the manifest based on:
- Source files present
- Package.json configuration
- Environment settings

## Hot Module Replacement & Live Reload

### Features
- **React HMR**: Live component updates without losing state
- **Live Reload**: Automatic extension reload on file changes
- **WebSocket**: Uses `localhost:1815` for HMR by default
- **Build Reporter**: Uses port `1816` for build status

### Configuration
```bash
# Custom host/port
plasmo dev --serve-host=localhost --serve-port=1012
```

### Known Limitations
- HMR reliability decreases with project size (100+ files)
- May require dev server restart for large projects
- Service worker reload challenges in Manifest V3

## Inter-Component Communication

### Messaging Patterns
```typescript
// Background to Content Script
chrome.runtime.sendMessage({
  type: 'ANALYZE_CONTENT', 
  data: content
});

// Content Script to Background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXTRACT_CONTENT') {
    // Handle message
    sendResponse({ success: true, data: extractedData });
    return true; // Keep channel open for async response
  }
});
```

### Best Practices
- Use consistent message types with TypeScript interfaces
- Always include error handling
- Return `true` for async responses
- Add comprehensive logging for debugging

### Message Type Definitions
```typescript
export type MessageType = 
  | 'EXTRACT_CONTENT'
  | 'ANALYZE_CONTENT'
  | 'CONTENT_CHANGED';

export interface ChromeMessage {
  type: MessageType;
  data?: any;
  url?: string;
}
```

## UI Development

### Component Architecture
- **Popup**: Main user interface (most common)
- **Content Scripts**: Interact with web pages, modify DOM
- **Side Panel**: Browser-native panel (use carefully)
- **Options Page**: Extension settings and preferences

### Styling Recommendations
```javascript
// tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}",
    "./popup.html"
  ],
  // ... custom theme
}
```

### UI Best Practices
- Keep popup components lightweight (< 600px width)
- Use consistent color schemes and animations
- Implement proper loading states
- Handle error states gracefully

## Storage & State Management

### Plasmo Storage API
```typescript
import { Storage } from "@plasmohq/storage"

const storage = new Storage()

// Basic usage
await storage.set("key", value)
const value = await storage.get("key")
await storage.remove("key")
```

### Storage Wrapper Example
```typescript
export class ExtensionStorage {
  static async setAnalysis(url: string, analysis: any) {
    await storage.set(`analysis_${url}`, analysis)
  }

  static async getAnalysis(url: string) {
    return await storage.get(`analysis_${url}`)
  }

  static async clearAnalysis(url?: string) {
    if (url) {
      await storage.remove(`analysis_${url}`)
    }
  }
}
```

### State Management Integration
- Works with Redux, Zustand, or other state libraries
- Persistent storage across extension lifecycle
- Automatic synchronization across extension contexts

## Environment Variables

### Configuration
```bash
# .env
PLASMO_PUBLIC_API_URL=https://api.example.com
PLASMO_PUBLIC_APP_NAME=My Extension
PLASMO_PUBLIC_VERSION=1.0.0

# Private variables (not exposed to content scripts)
API_KEY=your_api_key_here
RATE_LIMIT=10
```

### Usage
```typescript
// Public variables (accessible in content scripts)
const apiUrl = process.env.PLASMO_PUBLIC_API_URL

// Private variables (background/popup only)
const apiKey = process.env.API_KEY
```

### Best Practices
- Use `PLASMO_PUBLIC_*` prefix for public variables
- Never expose sensitive data in public variables
- Create `.env.example` for team documentation

## TypeScript Integration

### Configuration
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["DOM", "DOM.Iterable", "ES6"],
    "strict": true,
    "jsx": "react-jsx",
    "types": ["chrome", "node"],
    "baseUrl": ".",
    "paths": {
      "~/*": ["src/*"]
    }
  },
  "include": [
    ".plasmo/index.d.ts",
    "src/**/*"
  ]
}
```

### Type Definitions
```typescript
// src/types/index.ts
export interface ContentAnalysis {
  summary: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  keyInsights: string[];
  confidence: number;
}

export interface ExtractedData {
  title: string;
  url: string;
  mainContent: string;
  metadata: PageMetadata;
}
```

### Best Practices
- Create shared type definitions in `src/types/`
- Use path aliases (`~/`) for clean imports
- Enable strict mode for better type safety
- Include Chrome extension types

## Testing & Debugging

### Current Limitations
- Limited built-in testing framework
- Debugging relies on Chrome DevTools
- Manual testing in browser environment

### Debugging Strategy
```typescript
// Consistent logging patterns
console.log('[Background] Service initialized');
console.log('[Content] Message received:', message);
console.error('[Popup] Analysis failed:', error);
```

### Debug Tools
1. **Chrome DevTools**: For popup/options debugging
2. **Content Script**: Debug in page context
3. **Background Script**: Debug in extension context
4. **Network Tab**: Monitor API calls
5. **Storage Tab**: Inspect extension storage

### Testing Approach
1. Load extension in Chrome
2. Test on various websites
3. Check console logs for errors
4. Verify message passing between components
5. Test storage persistence

## Performance Considerations

### Optimization Tips
- Keep components modular and small
- Use proper caching strategies
- Minimize content script payload
- Implement debouncing for frequent operations

### Content Script Best Practices
```typescript
class ContentExtractor {
  private debounceTimer: number | null = null;

  debounceContentChange(func: Function, delay: number): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = window.setTimeout(func, delay);
  }
}
```

### Background Script Optimization
- Implement rate limiting
- Use efficient caching mechanisms
- Clean up resources properly
- Handle service worker lifecycle

## Production Build & Deployment

### Build Process
```bash
npm run build    # Creates build/chrome-mv3-prod
npm run package  # Creates packages/chrome-mv3-prod.zip
```

### Publishing Workflow
1. **Build Production**: `plasmo build`
2. **Test Production Build**: Load unpacked from `build/chrome-mv3-prod`
3. **Package**: `plasmo package` for store submission
4. **Submit**: Upload to Chrome Web Store

### Production Checklist
- [ ] Remove development logging
- [ ] Test all functionality in production build
- [ ] Verify icon and metadata
- [ ] Check permissions are minimal
- [ ] Test on multiple browsers if targeting them

## Multi-Browser Support

### Browser Compatibility
- **Primary**: Chrome/Chromium (full support)
- **Secondary**: Firefox, Safari, Edge (bonus support)
- **Single Codebase**: Target multiple browsers without code changes

### Platform-Specific Considerations
```typescript
// Platform detection
const isFirefox = navigator.userAgent.includes('Firefox');
const isChrome = navigator.userAgent.includes('Chrome');
```

## Common Issues & Solutions

### "Receiving end does not exist" Error
**Cause**: Content script not injected or messaging setup issues

**Solution**:
```typescript
// Ensure proper async handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXTRACT_CONTENT') {
    extractData()
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open
  }
});
```

### HMR Not Working
**Cause**: Project size or file watching issues

**Solution**:
- Restart development server
- Check file paths in includes
- Reduce project complexity

### Service Worker Issues
**Cause**: Manifest V3 service worker limitations

**Solution**:
```typescript
// Proper service worker setup
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason);
});
```

### Storage Sync Issues
**Cause**: Incorrect storage API usage

**Solution**:
```typescript
// Use Plasmo storage abstraction
import { Storage } from "@plasmohq/storage"
const storage = new Storage()
```

## Learning Resources

### Official Documentation
- **Main Docs**: https://docs.plasmo.com
- **Examples**: https://github.com/PlasmoHQ/examples
- **Discord**: Active developer community

### Example Integrations
- Firebase Authentication
- Redux state management
- Tailwind CSS styling
- Supabase backend integration

### Community Resources
- GitHub Discussions
- Discord Community (400+ developers)
- Stack Overflow (tagged `plasmo`)

## Conclusion

Plasmo simplifies browser extension development by:
- **Removing boilerplate**: Focus on features, not configuration
- **Modern tooling**: React, TypeScript, HMR out of the box
- **Developer experience**: Intuitive file-based architecture
- **Cross-browser**: Single codebase for multiple platforms

The framework follows the philosophy of **"build your product and stop worrying about config files"**, making extension development as intuitive as modern web app development while handling complex extension-specific concerns automatically.

---

*This document is based on Plasmo Framework v0.90.5 and reflects best practices as of 2024-2025.*