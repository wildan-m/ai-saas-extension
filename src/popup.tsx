import { useState, useEffect } from 'react';

interface ContentAnalysis {
  summary: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  keyInsights: string[];
  confidence: number;
  actionableItems: string[];
  categories: string[];
}

interface AnalysisState {
  analysis: ContentAnalysis | null;
  loading: boolean;
  error: string | null;
  lastAnalyzed: string | null;
}

export default function Popup() {
  const [state, setState] = useState<AnalysisState>({
    analysis: null,
    loading: false,
    error: null,
    lastAnalyzed: null
  });

  const [currentTab, setCurrentTab] = useState<chrome.tabs.Tab | null>(null);

  useEffect(() => {
    getCurrentTab();
    loadCachedAnalysis();
  }, []);

  const getCurrentTab = async () => {
    try {
      const [tab] = await chrome.tabs.query({ 
        active: true, 
        currentWindow: true 
      });
      setCurrentTab(tab);
    } catch (error) {
      console.error('Failed to get current tab:', error);
    }
  };

  const loadCachedAnalysis = async () => {
    try {
      const result = await chrome.storage.local.get(['lastAnalysis', 'lastAnalyzedUrl']);
      if (result.lastAnalysis && result.lastAnalyzedUrl) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.url === result.lastAnalyzedUrl) {
          setState(prev => ({
            ...prev,
            analysis: result.lastAnalysis,
            lastAnalyzed: result.lastAnalyzedUrl
          }));
        }
      }
    } catch (error) {
      console.error('Failed to load cached analysis:', error);
    }
  };

  const analyzeCurrentPage = async () => {
    if (!currentTab?.id) {
      setState(prev => ({ ...prev, error: 'No active tab found' }));
      return;
    }

    setState(prev => ({ 
      ...prev, 
      loading: true, 
      error: null,
      analysis: null 
    }));

    try {
      // Extract content data (content script is auto-injected by Plasmo)
      const response = await chrome.tabs.sendMessage(currentTab.id, {
        type: 'EXTRACT_CONTENT'
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to extract content');
      }

      // Send to background for analysis
      const analysisResponse = await chrome.runtime.sendMessage({
        type: 'ANALYZE_CONTENT',
        data: response.data
      });

      if (!analysisResponse.success) {
        throw new Error(analysisResponse.error || 'Failed to analyze content');
      }

      const analysis = analysisResponse.analysis;
      
      // Cache the result
      await chrome.storage.local.set({
        lastAnalysis: analysis,
        lastAnalyzedUrl: currentTab.url
      });

      setState(prev => ({
        ...prev,
        analysis,
        lastAnalyzed: currentTab.url || null
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
      setState(prev => ({ ...prev, error: errorMessage }));
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const clearAnalysis = () => {
    setState(prev => ({
      ...prev,
      analysis: null,
      error: null,
      lastAnalyzed: null
    }));
    chrome.storage.local.remove(['lastAnalysis', 'lastAnalyzedUrl']);
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-100 text-green-800 border-green-200';
      case 'negative': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return '😊';
      case 'negative': return '😞';
      default: return '😐';
    }
  };

  return (
    <div className="w-96 min-h-96 bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">AI Content Analyzer</h1>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs opacity-75">Active</span>
          </div>
        </div>
        {currentTab && (
          <div className="mt-2 text-xs opacity-75 truncate">
            {new URL(currentTab.url || '').hostname}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Action Button */}
        <button
          onClick={analyzeCurrentPage}
          disabled={state.loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 
                     text-white font-medium py-3 px-4 rounded-lg transition-all duration-200
                     flex items-center justify-center space-x-2 mb-4 transform hover:scale-105 disabled:transform-none"
        >
          {state.loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <span>🔍</span>
              <span>Analyze Page Content</span>
            </>
          )}
        </button>

        {/* Error Display */}
        {state.error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <span className="text-red-500">⚠️</span>
              <p className="text-red-700 text-sm">{state.error}</p>
            </div>
          </div>
        )}

        {/* Analysis Results */}
        {state.analysis && (
          <div className="space-y-4">
            {/* Sentiment and Confidence */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-lg">{getSentimentIcon(state.analysis.sentiment)}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getSentimentColor(state.analysis.sentiment)}`}>
                  {state.analysis.sentiment}
                </span>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">Confidence</div>
                <div className="font-medium">{Math.round(state.analysis.confidence * 100)}%</div>
              </div>
            </div>

            {/* Categories */}
            {state.analysis.categories.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-800 mb-2 flex items-center">
                  <span className="mr-1">🏷️</span>
                  Categories
                </h3>
                <div className="flex flex-wrap gap-1">
                  {state.analysis.categories.map((category, index) => (
                    <span 
                      key={index} 
                      className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                    >
                      {category}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            <div>
              <h3 className="font-medium text-gray-800 mb-2 flex items-center">
                <span className="mr-1">📄</span>
                Summary
              </h3>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                {state.analysis.summary}
              </p>
            </div>

            {/* Key Insights */}
            {state.analysis.keyInsights.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-800 mb-2 flex items-center">
                  <span className="mr-1">💡</span>
                  Key Insights
                </h3>
                <ul className="space-y-2">
                  {state.analysis.keyInsights.map((insight, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-start bg-yellow-50 p-2 rounded">
                      <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actionable Items */}
            {state.analysis.actionableItems.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-800 mb-2 flex items-center">
                  <span className="mr-1">✅</span>
                  Action Items
                </h3>
                <ul className="space-y-2">
                  {state.analysis.actionableItems.map((item, index) => (
                    <li key={index} className="text-sm text-gray-600 flex items-start bg-green-50 p-2 rounded">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Clear Button */}
            <button
              onClick={clearAnalysis}
              className="w-full mt-4 py-2 px-4 text-sm text-gray-600 border border-gray-300 
                         rounded-lg hover:bg-gray-50 transition-colors"
            >
              Clear Analysis
            </button>
          </div>
        )}

        {/* Empty State */}
        {!state.analysis && !state.loading && !state.error && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🤖</div>
            <p className="text-sm">Click "Analyze Page Content" to get AI-powered insights about this page</p>
          </div>
        )}
      </div>
    </div>
  );
}