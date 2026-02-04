import React, { useState } from 'react';
import LiveMetricsDashboard from '../components/LiveMetricsDashboard';
import ImpactReporting from '../components/ImpactReporting';
import { BarChart3, TrendingUp } from 'lucide-react';

const Analytics: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'metrics' | 'impact'>('metrics');

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600">Performance metrics and impact analysis</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('metrics')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
              activeTab === 'metrics'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Live Metrics</span>
          </button>
          <button
            onClick={() => setActiveTab('impact')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
              activeTab === 'impact'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Impact Reports</span>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'metrics' && <LiveMetricsDashboard />}
      {activeTab === 'impact' && <ImpactReporting />}
    </div>
  );
};

export default Analytics;