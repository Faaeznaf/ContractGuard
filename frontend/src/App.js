import React, { useState } from 'react';
import ContractUpload from './components/ContractUpload';
import AnalysisResults from './components/AnalysisResults';
import './App.css';

function App() {
  const [contractId, setContractId] = useState(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {!contractId ? (
        <ContractUpload onAnalysisComplete={setContractId} />
      ) : (
        <AnalysisResults 
          contractId={contractId} 
          onNewAnalysis={() => setContractId(null)} 
        />
      )}
    </div>
  );
}

export default App;