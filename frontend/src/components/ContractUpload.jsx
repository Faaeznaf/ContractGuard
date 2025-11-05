import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { getUploadUrl, uploadToS3, analyzeContract } from '../utils/api';

function ContractUpload({ onAnalysisComplete }) {
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);

  const onDrop = async (files) => {
    const file = files[0];
    setUploading(true);
    setProgress(0);
    
    try {
      setStatus('Getting upload URL...');
      setProgress(25);
      const { uploadUrl, contractId, s3Key } = await getUploadUrl(
        file.name,
        file.type
      );
      
      setStatus('Uploading contract...');
      setProgress(50);
      await uploadToS3(uploadUrl, file);
      
      setStatus('Analyzing with AI...');
      setProgress(75);
      await analyzeContract(contractId, s3Key);
      
      setStatus('Complete!');
      setProgress(100);
      
      setTimeout(() => {
        onAnalysisComplete(contractId);
      }, 1000);
      
    } catch (error) {
      console.error(error);
      setStatus(`Error: ${error.message}`);
      setProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt']
    },
    maxSize: 10485760,
    disabled: uploading
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-800 to-green-900 text-white py-6 px-8 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <img 
              src={`${process.env.PUBLIC_URL}/apex-logo.png`}
              alt="APEX Logo" 
              className="h-16 w-16 bg-white rounded-lg p-2"
            />
            <div>
              <h1 className="text-4xl font-bold mb-1">ContractGuard</h1>
              <p className="text-green-200 text-sm">by APEX Consulting LLC</p>
            </div>
          </div>
          <div className="hidden md:flex items-center space-x-6 text-sm">
            <span className="flex items-center">
              <span className="text-green-400 mr-2">✓</span>
              AI-Powered
            </span>
            <span className="flex items-center">
              <span className="text-green-400 mr-2">✓</span>
              SOC 2 Ready
            </span>
            <span className="flex items-center">
              <span className="text-green-400 mr-2">✓</span>
              AWS Bedrock
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="inline-block bg-yellow-400 text-green-900 px-6 py-2 rounded-full font-bold text-sm mb-4">
            ⚡ AI-Powered • Privacy-First • Results in 60 Seconds
          </div>
          
          <h2 className="text-5xl font-extrabold text-gray-900 mb-4">
            Stop Wasting Time on Manual Contract Review
          </h2>
          
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Let AI analyze your contracts against your company playbook. 
            Find risky clauses, save thousands in legal fees, and close deals faster.
          </p>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-6 max-w-3xl mx-auto mb-12">
            <div className="bg-white rounded-lg p-6 shadow-md border-t-4 border-green-600">
              <div className="text-3xl font-bold text-green-700">85%</div>
              <div className="text-sm text-gray-600 mt-1">Time Saved</div>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md border-t-4 border-yellow-500">
              <div className="text-3xl font-bold text-yellow-600">$44.5K</div>
              <div className="text-sm text-gray-600 mt-1">Monthly Savings</div>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-md border-t-4 border-green-600">
              <div className="text-3xl font-bold text-green-700">60 sec</div>
              <div className="text-sm text-gray-600 mt-1">Analysis Time</div>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid md:grid-cols-2 gap-12 mb-12">
          {/* Left: Benefits Checklist */}
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <span className="text-green-600 mr-2">✓</span>
              What ContractGuard Does
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-600">
                <span className="text-2xl mr-3">🔍</span>
                <div>
                  <div className="font-bold text-gray-900">Finds Hidden Risks</div>
                  <div className="text-sm text-gray-600">Unlimited liability, unfavorable terms, IP issues</div>
                </div>
              </div>

              <div className="flex items-start bg-white p-4 rounded-lg shadow-sm border-l-4 border-yellow-500">
                <span className="text-2xl mr-3">⚖️</span>
                <div>
                  <div className="font-bold text-gray-900">Checks Against Your Playbook</div>
                  <div className="text-sm text-gray-600">Liability caps, payment terms, termination clauses</div>
                </div>
              </div>

              <div className="flex items-start bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-600">
                <span className="text-2xl mr-3">💡</span>
                <div>
                  <div className="font-bold text-gray-900">Suggests Fixes</div>
                  <div className="text-sm text-gray-600">Get actionable recommendations for every issue</div>
                </div>
              </div>

              <div className="flex items-start bg-white p-4 rounded-lg shadow-sm border-l-4 border-yellow-500">
                <span className="text-2xl mr-3">🔒</span>
                <div>
                  <div className="font-bold text-gray-900">100% Private</div>
                  <div className="text-sm text-gray-600">Your contracts never leave your AWS account</div>
                </div>
              </div>

              <div className="flex items-start bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-600">
                <span className="text-2xl mr-3">⚡</span>
                <div>
                  <div className="font-bold text-gray-900">Lightning Fast</div>
                  <div className="text-sm text-gray-600">2 hours → 60 seconds. Get results instantly</div>
                </div>
              </div>

              <div className="flex items-start bg-white p-4 rounded-lg shadow-sm border-l-4 border-yellow-500">
                <span className="text-2xl mr-3">💰</span>
                <div>
                  <div className="font-bold text-gray-900">Massive Cost Savings</div>
                  <div className="text-sm text-gray-600">$600/contract → $5. 98% cheaper than manual review</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Upload Box */}
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Try It Now - Free Demo
            </h3>

            <div
              {...getRootProps()}
              className={`
                border-4 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all
                bg-white shadow-lg
                ${isDragActive ? 'border-green-600 bg-green-50' : 'border-gray-300 hover:border-green-500'}
                ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <input {...getInputProps()} />
              
              {uploading ? (
                <div>
                  <div className="mb-4">
                    <svg className="animate-spin h-10 w-10 text-green-600 mx-auto" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                    <div 
                      className="bg-gradient-to-r from-green-600 to-yellow-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  
                  <p className="text-lg font-medium text-gray-700">{status}</p>
                  <p className="text-sm text-gray-500 mt-2">{progress}% complete</p>
                </div>
              ) : (
                <div>
                  <svg 
                    className="mx-auto h-12 w-12 text-green-600 mb-4" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" 
                    />
                  </svg>
                  
                  <p className="text-xl font-bold text-gray-800 mb-2">
                    {isDragActive ? '📄 Drop it here!' : '📄 Drop Your Contract'}
                  </p>
                  <p className="text-gray-600 mb-4">or click to browse</p>
                  <p className="text-sm text-gray-500">PDF or TXT • Max 10MB</p>
                  
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-full font-medium hover:from-green-700 hover:to-green-800 transition">
                      <span className="text-lg mr-2">⚡</span>
                      Upload & Analyze
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Trust Signals */}
            <div className="mt-6 text-center space-y-2">
              <p className="text-sm text-gray-600 flex items-center justify-center">
                <span className="text-green-600 mr-2">✓</span>
                Secure AWS Bedrock AI
              </p>
              <p className="text-sm text-gray-600 flex items-center justify-center">
                <span className="text-green-600 mr-2">🔒</span>
                Your data stays private
              </p>
              <p className="text-sm text-gray-600 flex items-center justify-center">
                <span className="text-green-600 mr-2">✓</span>
                No credit card required
              </p>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="bg-gradient-to-r from-green-700 to-green-900 rounded-2xl p-8 text-center text-white shadow-xl">
          <h3 className="text-2xl font-bold mb-2">Ready to Save Time & Money?</h3>
          <p className="text-green-200 mb-4">Join companies reducing contract review time by 85%</p>
          <div className="flex items-center justify-center space-x-4 text-sm">
            <span className="flex items-center">
              <span className="text-yellow-400 mr-1">★★★★★</span>
              Trusted by legal teams
            </span>
            <span>•</span>
            <span>Built on AWS</span>
            <span>•</span>
            <span>SOC 2 Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContractUpload;