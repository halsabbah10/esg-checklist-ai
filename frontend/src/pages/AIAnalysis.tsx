// import React from 'react'; // Not needed in modern React
import AIAnalysisWorkflow from '../components/ai-analysis/AIAnalysisWorkflow';
import { PageTransition } from '../components/ui';

export default function AIAnalysis() {
  return (
    <PageTransition in={true} variant="fade" duration={500}>
      <div className="min-h-screen bg-gray-50 py-8">
        <AIAnalysisWorkflow />
      </div>
    </PageTransition>
  );
}