import { useState, useEffect } from 'react';
import type { AnalysisState } from "~/types";
import { ExtensionStorage } from "~/lib/storage";
import { ExtensionUtils, ExtensionContextError, ContentScriptError } from "~/lib/extension-utils";
import "./style.css";

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
      const tab = await ExtensionUtils.getCurrentTab();
      setCurrentTab(tab);
    } catch (error) {
      console.error('[Popup] Failed to get current tab:', error);
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to access current tab. Please refresh and try again.' 
      }));
    }
  };

  const loadCachedAnalysis = async () => {
    try {
      const tab = await ExtensionUtils.getCurrentTab();
      if (tab?.url) {
        const analysis = await ExtensionStorage.getAnalysis(tab.url);
        if (analysis) {
          setState(prev => ({
            ...prev,
            analysis,
            lastAnalyzed: tab.url
          }));
        }
      }
    } catch (error) {
      console.error('[Popup] Failed to load cached analysis:', error);
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
      console.log('[Popup] Sending message to content script, tab ID:', currentTab.id);
      
      // Extract content data using safe messaging
      const response = await ExtensionUtils.sendTabMessage(currentTab.id, {
        type: 'EXTRACT_CONTENT'
      });

      console.log('[Popup] Content response:', response);

      // Send to background for analysis using safe messaging
      const analysisResponse = await ExtensionUtils.sendMessage({
        type: 'ANALYZE_CONTENT',
        data: response.data
      });

      console.log('[Popup] Analysis response:', analysisResponse);

      const analysis = analysisResponse.analysis;
      
      // Cache the result using Plasmo storage
      if (currentTab.url) {
        await ExtensionStorage.setAnalysis(currentTab.url, analysis);
      }

      setState(prev => ({
        ...prev,
        analysis,
        lastAnalyzed: currentTab.url || null
      }));

    } catch (error) {
      console.error('[Popup] Analysis failed:', error);
      
      let errorMessage = 'Analysis failed';
      
      if (error instanceof ExtensionContextError) {
        errorMessage = 'Extension was reloaded. Please try again.';
      } else if (error instanceof ContentScriptError) {
        errorMessage = 'Content script not ready. Please refresh the page and try again.';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setState(prev => ({ ...prev, error: errorMessage }));
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const clearAnalysis = async () => {
    setState(prev => ({
      ...prev,
      analysis: null,
      error: null,
      lastAnalyzed: null
    }));
    
    if (currentTab?.url) {
      await ExtensionStorage.clearAnalysis(currentTab.url);
    }
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

  const getAnalysisType = (summary: string) => {
    if (summary.includes('🤖')) return { type: 'Simulation', emoji: '🔮', color: 'bg-gray-100 text-gray-800' };
    if (summary.includes('🚀')) return { type: 'OpenAI', emoji: '⚡', color: 'bg-blue-100 text-blue-800' };
    if (summary.includes('🧠')) return { type: 'Claude', emoji: '🔥', color: 'bg-purple-100 text-purple-800' };
    if (summary.includes('🔒')) return { type: 'Backend', emoji: '🛡️', color: 'bg-green-100 text-green-800' };
    return { type: 'Unknown', emoji: '❔', color: 'bg-gray-100 text-gray-800' };
  };

  const cleanText = (text: string) => {
    // Remove emoji indicators and clean up text
    return text
      .replace(/^[🤖🚀🧠🔒]\s*(SIMULATED ANALYSIS:|OpenAI Analysis:|Claude Analysis:|Backend Analysis:)\s*/i, '')
      .replace(/^[🤖🚀🧠🔒]\s*/g, '')
      // Clean up multiple spaces
      .replace(/\s+/g, ' ')
      .trim();
  };

  return (
    <div className="popup-container w-[800px] min-h-[650px] bg-gradient-to-br from-white to-gray-50 shadow-2xl rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 p-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center space-x-3">
              <span className="bg-white/20 p-2 rounded-lg">🎯</span>
              <span>AI Content Analyzer</span>
            </h1>
            {currentTab && (
              <div className="mt-2 text-sm opacity-80 bg-white/10 px-3 py-1 rounded-full inline-block">
                📍 {new URL(currentTab.url || '').hostname}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-3 bg-white/20 px-4 py-2 rounded-full">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg"></div>
            <span className="text-sm font-medium">Live</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {/* Action Button */}
        <button
          onClick={analyzeCurrentPage}
          disabled={state.loading}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 
                     disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-5 px-8 rounded-xl 
                     transition-all duration-300 flex items-center justify-center space-x-3 mb-8 
                     transform hover:scale-105 disabled:transform-none text-lg shadow-xl hover:shadow-2xl
                     relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>
          {state.loading ? (
            <>
              <div className="animate-spin rounded-full h-6 w-6 border-3 border-white border-t-transparent"></div>
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <span className="text-2xl">🔍</span>
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
            {/* Analysis Type Badge */}
            {(() => {
              const analysisType = getAnalysisType(state.analysis.summary);
              return (
                <div className="flex items-center justify-center mb-6">
                  <div className={`px-6 py-3 rounded-2xl text-base font-bold ${analysisType.color} flex items-center space-x-3 
                                   shadow-lg border-2 border-white/50 backdrop-blur-sm transform hover:scale-105 transition-all duration-200`}>
                    <span className="text-xl">{analysisType.emoji}</span>
                    <span>{analysisType.type} Analysis</span>
                    <div className="w-2 h-2 bg-current rounded-full opacity-60 animate-pulse"></div>
                  </div>
                </div>
              );
            })()}

            {/* Sentiment and Confidence */}
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1">
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-500 p-3 rounded-xl shadow-lg">
                    <span className="text-2xl">{getSentimentIcon(state.analysis.sentiment)}</span>
                  </div>
                  <div>
                    <div className="text-sm text-blue-600 font-medium mb-2">Sentiment</div>
                    <span className={`px-4 py-2 rounded-full text-base font-bold border-2 ${getSentimentColor(state.analysis.sentiment)} shadow-md`}>
                      {state.analysis.sentiment}
                    </span>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1">
                <div className="flex items-center space-x-4">
                  <div className="bg-green-500 p-3 rounded-xl shadow-lg">
                    <span className="text-2xl text-white">📈</span>
                  </div>
                  <div>
                    <div className="text-sm text-green-600 font-medium mb-2">Confidence</div>
                    <div className="text-2xl font-bold text-green-800">{Math.round(state.analysis.confidence * 100)}%</div>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1">
                <div className="flex items-center space-x-4">
                  <div className="bg-purple-500 p-3 rounded-xl shadow-lg">
                    <span className="text-2xl text-white">✅</span>
                  </div>
                  <div>
                    <div className="text-sm text-purple-600 font-medium mb-2">Status</div>
                    <div className="text-base font-bold text-purple-800">Complete</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Categories */}
            {state.analysis.categories.length > 0 && (
              <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-200 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center text-lg">
                  <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center mr-3 shadow-md">
                    <span className="text-white text-sm">📋</span>
                  </div>
                  Categories
                </h3>
                <div className="flex flex-wrap gap-2">
                  {state.analysis.categories.map((category, index) => {
                    const cleanedText = cleanText(category);
                    
                    // Define icon mapping with simpler color schemes
                    let icon = '🏷️';
                    let text = cleanedText;
                    let colorClass = 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200';
                    
                    if (cleanedText.includes('AI Powered') || cleanedText.includes('OpenAI') || cleanedText.includes('GPT')) {
                      icon = '🚀';
                      text = cleanedText.replace(/^[🤖🚀🧠🔒]\s*/, '');
                      colorClass = 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200';
                    } else if (cleanedText.includes('Claude') || cleanedText.includes('Anthropic')) {
                      icon = '🧠';
                      text = cleanedText.replace(/^[🤖🚀🧠🔒]\s*/, '');
                      colorClass = 'bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200';
                    } else if (cleanedText.includes('Backend') || cleanedText.includes('Production')) {
                      icon = '🔒';
                      text = cleanedText.replace(/^[🤖🚀🧠🔒]\s*/, '');
                      colorClass = 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200';
                    } else if (cleanedText.includes('Simulation')) {
                      icon = '🤖';
                      text = cleanedText.replace(/^[🤖🚀🧠🔒]\s*/, '');
                      colorClass = 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200';
                    } else if (cleanedText.includes('VPN')) {
                      icon = '🔐';
                      text = cleanedText;
                      colorClass = 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200';
                    } else if (cleanedText.includes('Privacy')) {
                      icon = '🛡️';
                      text = cleanedText;
                      colorClass = 'bg-teal-100 text-teal-800 border-teal-300 hover:bg-teal-200';
                    } else if (cleanedText.includes('Security')) {
                      icon = '🔒';
                      text = cleanedText;
                      colorClass = 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200';
                    } else if (cleanedText.includes('Forms')) {
                      icon = '📝';
                      text = cleanedText;
                      colorClass = 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200';
                    } else if (cleanedText.includes('Customer') || cleanedText.includes('Support')) {
                      icon = '🎧';
                      text = cleanedText;
                      colorClass = 'bg-indigo-100 text-indigo-800 border-indigo-300 hover:bg-indigo-200';
                    } else if (cleanedText.includes('Anonymity')) {
                      icon = '👤';
                      text = cleanedText;
                      colorClass = 'bg-violet-100 text-violet-800 border-violet-300 hover:bg-violet-200';
                    } else {
                      text = cleanedText.replace(/^[🤖🚀🧠🔒]\s*/, '');
                      icon = '🏷️';
                    }
                    
                    return (
                      <div 
                        key={index} 
                        className={`inline-flex items-center px-3 py-2 text-sm font-semibold
                                  rounded-lg border-2 shadow-sm hover:shadow-md transform hover:scale-105 
                                  transition-all duration-200 ${colorClass}`}
                      >
                        <span className="mr-2 text-base">{icon}</span>
                        <span>{text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Summary */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center text-lg">
                <span className="mr-3 text-xl">📝</span>
                Summary
              </h3>
              <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-200">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 h-1 w-20 rounded-full mb-4"></div>
                <p className="text-base text-gray-800 leading-relaxed font-medium">
                  {cleanText(state.analysis.summary)}
                </p>
              </div>
            </div>

            {/* Key Insights and Action Items - Two Column Layout */}
            {(state.analysis.keyInsights.length > 0 || state.analysis.actionableItems.length > 0) && (
              <div className="grid grid-cols-2 gap-8">
                {/* Key Insights */}
                {state.analysis.keyInsights.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-4 flex items-center text-lg">
                      <span className="mr-3 text-xl">🔍</span>
                      Key Insights
                    </h3>
                    <div className="space-y-4">
                      {state.analysis.keyInsights.map((insight, index) => (
                        <div key={index} className="bg-gradient-to-br from-yellow-50 to-orange-50 p-5 rounded-xl border border-yellow-200 shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1">
                          <div className="flex items-start space-x-4">
                            <div className="bg-yellow-400 p-2 rounded-full shadow-md">
                              <span className="w-2 h-2 bg-white rounded-full block"></span>
                            </div>
                            <p className="text-base text-gray-800 leading-relaxed font-medium">
                              {cleanText(insight)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actionable Items */}
                {state.analysis.actionableItems.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-4 flex items-center text-lg">
                      <span className="mr-3 text-xl">⚡</span>
                      Action Items
                    </h3>
                    <div className="space-y-4">
                      {state.analysis.actionableItems.map((item, index) => (
                        <div key={index} className="bg-gradient-to-br from-green-50 to-emerald-50 p-5 rounded-xl border border-green-200 shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1">
                          <div className="flex items-start space-x-4">
                            <div className="bg-green-500 p-2 rounded-full shadow-md">
                              <span className="w-2 h-2 bg-white rounded-full block"></span>
                            </div>
                            <p className="text-base text-gray-800 leading-relaxed font-medium">
                              {cleanText(item)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Clear Button */}
            <button
              onClick={clearAnalysis}
              className="w-full mt-8 py-4 px-6 text-base text-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 
                         border-2 border-gray-200 rounded-xl hover:from-gray-100 hover:to-gray-200 hover:border-gray-300 
                         transition-all duration-200 flex items-center justify-center space-x-3 shadow-md hover:shadow-lg
                         transform hover:scale-105 font-medium"
            >
              <span className="text-lg">🧹</span>
              <span>Clear Analysis</span>
            </button>
          </div>
        )}

        {/* Empty State */}
        {!state.analysis && !state.loading && !state.error && (
          <div className="text-center py-16">
            <div className="bg-gradient-to-br from-blue-100 to-purple-100 p-8 rounded-3xl shadow-lg mx-auto max-w-md">
              <div className="text-7xl mb-6 animate-bounce">🤖</div>
              <h3 className="text-xl font-bold text-gray-800 mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Ready to Analyze
              </h3>
              <p className="text-base text-gray-600 leading-relaxed max-w-xs mx-auto">
                Click the button above to get AI-powered insights about this page's content, sentiment, and actionable recommendations.
              </p>
              <div className="mt-6 flex justify-center space-x-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse delay-100"></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse delay-200"></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}