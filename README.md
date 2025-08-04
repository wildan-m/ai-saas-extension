# AI SAAS Content Analyzer Extension

A sophisticated Chrome extension that analyzes SAAS application content using AI, designed to showcase modern extension development practices for interview demonstrations.

## 🚀 Features

- **Smart Content Extraction**: Platform-aware DOM manipulation for popular SAAS apps (Notion, Airtable, Salesforce, etc.)
- **AI-Powered Analysis**: Simulated AI content analysis with sentiment detection and insights
- **Modern Architecture**: Manifest V3 service workers with proper lifecycle management
- **React + Tailwind UI**: Beautiful, responsive popup interface
- **Rate Limiting & Caching**: Production-ready performance optimizations
- **Cross-Platform Support**: Works across all major SAAS platforms

## 🛠️ Tech Stack

- **Framework**: Plasmo (Zero-config extension framework)
- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Architecture**: Manifest V3 with service workers
- **Content Extraction**: Advanced DOM manipulation patterns

## 📦 Installation & Development

### Prerequisites
- Node.js 16+
- pnpm (recommended) or npm

### Setup
```bash
# Clone the repository
cd ai-saas-extension

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Building for Production
```bash
# Build the extension
pnpm build

# Package for distribution
pnpm package
```

## 🏗️ Architecture Overview

### Content Script (`src/content.ts`)
- Platform-aware content extraction
- MutationObserver for dynamic content
- Form data extraction with privacy considerations
- Metadata collection and categorization

### Background Service Worker (`src/background.ts`)
- AI analysis simulation with realistic response times
- Rate limiting (10 requests/minute)
- Content-based caching (5-minute TTL)
- Proper service worker lifecycle management

### Popup Interface (`src/popup.tsx`)
- Real-time analysis display
- Sentiment visualization
- Actionable insights presentation
- Error handling and loading states

## 🎯 Demo Capabilities

### SAAS Platform Integration
- **Notion**: Content extraction from pages and databases
- **Airtable**: Form and grid content analysis
- **Salesforce**: Record and layout content parsing
- **Gmail**: Email content extraction
- **Slack**: Message and channel content analysis

### AI Analysis Features
- Content summarization
- Sentiment analysis (positive/negative/neutral)
- Key insights extraction
- Actionable item generation
- Content categorization

### Performance Features
- Intelligent caching system
- Rate limiting protection
- Debounced content monitoring
- Memory-efficient DOM observation

## 🔧 Technical Highlights

### Manifest V3 Compliance
```javascript
// Service worker keep-alive pattern
chrome.runtime.onConnect.addListener(port => {
  if (port.name === 'keepAlive') {
    port.onDisconnect.addListener(() => {
      console.log('Port disconnected, service worker may terminate');
    });
  }
});
```

### Advanced Content Extraction
```javascript
// Platform-specific selector strategies
const platformSelectors = {
  notion: ['.notion-page-content', '[data-block-id]'],
  airtable: ['.grid-container', '.record-container'],
  salesforce: ['.forceRecordLayout', '.slds-grid']
};
```

### Smart Rate Limiting
```javascript
// Token-bucket style rate limiting
private checkRateLimit(): boolean {
  const now = Date.now();
  const windowStart = now - 60000; // 1 minute window
  // Implementation handles cleanup and limits
}
```

## 🎨 UI/UX Features

- **Gradient Header**: Modern visual design
- **Real-time Status**: Connection and analysis state indicators
- **Sentiment Visualization**: Color-coded sentiment with confidence scores
- **Categorized Insights**: Organized display of analysis results
- **Responsive Design**: Optimized for various screen sizes

## 🔒 Security & Privacy

- **Content Sanitization**: Secure handling of extracted content
- **API Key Management**: Environment-based configuration
- **Permission Minimization**: Only requests necessary permissions
- **Form Data Protection**: Sensitive data filtering

## 📊 Performance Optimizations

- **Content Hashing**: Avoid duplicate analysis
- **Debounced Updates**: Efficient DOM change monitoring
- **Lazy Loading**: On-demand script injection
- **Memory Management**: Proper cleanup of observers and timers

## 🚀 Future Enhancements

- Real AI API integration (OpenAI, Claude, etc.)
- Advanced form validation detection
- Cross-tab content synchronization
- Analytics dashboard integration
- Custom prompt engineering interface

## 📄 License

MIT License - Built for interview demonstration purposes.
