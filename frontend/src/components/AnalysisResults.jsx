import React, { useEffect, useState } from 'react';
import { getAnalysis } from '../utils/api';

function AnalysisResults({ contractId, onNewAnalysis }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let interval;
    
    const fetchAnalysis = async () => {
      try {
        const data = await getAnalysis(contractId);
        
        if (data.status === 'completed') {
          setAnalysis(data.analysis);
          setLoading(false);
          clearInterval(interval);
        } else if (data.status === 'failed') {
          setError('Analysis failed. Please try again.');
          setLoading(false);
          clearInterval(interval);
        }
        // If still analyzing, keep polling
      } catch (err) {
        console.error(err);
        setError('Failed to load analysis');
        setLoading(false);
        clearInterval(interval);
      }
    };

    // Poll every 3 seconds
    fetchAnalysis();
    interval = setInterval(fetchAnalysis, 3000);

    return () => clearInterval(interval);
  }, [contractId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center">
        <div className="animate-pulse">
          <div className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xl font-medium text-gray-700">Analyzing contract...</p>
          <p className="text-gray-500 mt-2">Claude AI is reviewing your document</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded">
          <p className="text-red-800 font-medium">{error}</p>
          <button
            onClick={onNewAnalysis}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try Another Contract
          </button>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return <div className="text-center p-8">No analysis found</div>;
  }

  const getRiskColor = (score) => {
    if (score >= 70) return 'text-red-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getRiskBgColor = (score) => {
    if (score >= 70) return 'bg-red-50 border-red-500';
    if (score >= 40) return 'bg-yellow-50 border-yellow-500';
    return 'bg-green-50 border-green-500';
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Analysis Results</h2>
        <button
          onClick={onNewAnalysis}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
        >
          ← New Analysis
        </button>
      </div>

      {/* Risk Score Card */}
      <div className={`border-l-4 p-6 rounded-lg mb-6 ${getRiskBgColor(analysis.riskScore)}`}>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Overall Risk Score</h3>
        <div className={`text-5xl font-bold ${getRiskColor(analysis.riskScore)}`}>
          {analysis.riskScore}/100
        </div>
        <p className="text-sm text-gray-600 mt-2">
          {analysis.riskScore >= 70 ? '⚠️ High Risk' : analysis.riskScore >= 40 ? '⚡ Medium Risk' : '✅ Low Risk'}
        </p>
      </div>

      {/* Critical Issues */}
      {analysis.criticalIssues && analysis.criticalIssues.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg mb-6">
          <h3 className="text-lg font-bold text-red-900 mb-4 flex items-center">
            <span className="text-2xl mr-2">🚨</span>
            Critical Issues ({analysis.criticalIssues.length})
          </h3>
          <div className="space-y-4">
            {analysis.criticalIssues.map((issue, idx) => (
              <div key={idx} className="bg-white p-4 rounded border border-red-200">
                <div className="font-semibold text-red-900 mb-1">
                  {issue.category || issue.clause}
                </div>
                <p className="text-red-700 text-sm mb-2">{issue.issue}</p>
                {issue.suggestion && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">💡 Suggestion:</span> {issue.suggestion}
                  </p>
                )}
                {issue.playbookRequirement && (
                  <p className="text-xs text-gray-500 mt-1">
                    Playbook requires: {issue.playbookRequirement}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Medium Issues */}
      {analysis.mediumIssues && analysis.mediumIssues.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-lg mb-6">
          <h3 className="text-lg font-bold text-yellow-900 mb-4 flex items-center">
            <span className="text-2xl mr-2">⚠️</span>
            Medium Issues ({analysis.mediumIssues.length})
          </h3>
          <div className="space-y-3">
            {analysis.mediumIssues.map((issue, idx) => (
              <div key={idx} className="bg-white p-4 rounded border border-yellow-200">
                <div className="font-semibold text-yellow-900 mb-1">
                  {issue.category || issue.clause}
                </div>
                <p className="text-yellow-700 text-sm">{issue.issue}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compliant Sections */}
      {analysis.compliantSections && analysis.compliantSections.length > 0 && (
        <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-lg">
          <h3 className="text-lg font-bold text-green-900 mb-3 flex items-center">
            <span className="text-2xl mr-2">✅</span>
            Compliant Sections ({analysis.compliantSections.length})
          </h3>
          <ul className="list-disc list-inside space-y-1">
            {analysis.compliantSections.map((section, idx) => (
              <li key={idx} className="text-green-700 text-sm">
                {typeof section === 'string' ? section : section.category || section.requirement}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default AnalysisResults;