import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { 
  BarChart, 
  Bar, 
  RadarChart, 
  Radar, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
  Cell
} from 'recharts';
import { Brain, CheckCircle, XCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import { RootState } from '../store';
import { Decision, ConstraintResult, ScoringFactor } from '../types';

interface DecisionVisualizationProps {
  decision: Decision;
  showDetails?: boolean;
}

const DecisionVisualization: React.FC<DecisionVisualizationProps> = ({ 
  decision, 
  showDetails = true 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'constraints' | 'scoring' | 'alternatives'>('overview');

  // Transform scoring factors for radar chart
  const radarData = decision.explanation.scoringFactors.map(factor => ({
    factor: factor.name.replace(/([A-Z])/g, ' $1').trim(),
    score: factor.score * 10, // Scale to 0-100
    weight: factor.weight * 100,
  }));

  // Transform constraints for bar chart
  const constraintData = [
    ...decision.explanation.hardConstraints.map(c => ({
      name: c.name,
      value: c.value,
      threshold: c.threshold,
      passed: c.passed,
      type: 'Hard',
      color: c.passed ? '#10b981' : '#ef4444',
    })),
    ...decision.explanation.softConstraints.map(c => ({
      name: c.name,
      value: c.value,
      threshold: c.threshold,
      passed: c.passed,
      type: 'Soft',
      color: c.passed ? '#3b82f6' : '#f59e0b',
    })),
  ];

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    if (score >= 4) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Decision Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Brain className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Decision Analysis</h3>
            <p className="text-sm text-gray-600">
              {new Date(decision.requestTimestamp).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Confidence Score</p>
          <p className={`text-2xl font-bold ${getScoreColor(decision.score)}`}>
            {decision.score.toFixed(1)}/10
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'constraints', label: 'Constraints' },
            { id: 'scoring', label: 'Scoring' },
            { id: 'alternatives', label: 'Alternatives' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Decision Summary */}
          <div className="card">
            <h4 className="font-medium text-gray-900 mb-4">Decision Summary</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Recommendation:</span>
                <span className="font-medium">
                  {decision.recommendedVehicleId ? (
                    <span className="text-green-600">Consolidate</span>
                  ) : decision.requiresNewDispatch ? (
                    <span className="text-blue-600">New Dispatch</span>
                  ) : (
                    <span className="text-red-600">No Solution</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Vehicle ID:</span>
                <span className="font-medium">
                  {decision.recommendedVehicleId || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shadow Mode:</span>
                <span className={`font-medium ${decision.shadowMode ? 'text-yellow-600' : 'text-green-600'}`}>
                  {decision.shadowMode ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Executed:</span>
                <span className={`font-medium ${decision.executed ? 'text-green-600' : 'text-gray-600'}`}>
                  {decision.executed ? 'Yes' : 'Pending'}
                </span>
              </div>
            </div>
          </div>

          {/* Risk Assessment */}
          <div className={`border rounded-lg p-4 ${getRiskColor(decision.explanation.riskAssessment.level)}`}>
            <div className="flex items-center space-x-2 mb-3">
              <AlertTriangle className="w-5 h-5" />
              <h4 className="font-medium">
                Risk Level: {decision.explanation.riskAssessment.level.toUpperCase()}
              </h4>
            </div>
            
            <div className="space-y-3">
              <div>
                <h5 className="font-medium mb-1">Risk Factors:</h5>
                <ul className="text-sm space-y-1">
                  {decision.explanation.riskAssessment.factors.map((factor, index) => (
                    <li key={index} className="flex items-center">
                      <span className="w-1 h-1 bg-current rounded-full mr-2"></span>
                      {factor}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h5 className="font-medium mb-1">Mitigation:</h5>
                <ul className="text-sm space-y-1">
                  {decision.explanation.riskAssessment.mitigation.map((strategy, index) => (
                    <li key={index} className="flex items-center">
                      <span className="w-1 h-1 bg-current rounded-full mr-2"></span>
                      {strategy}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'constraints' && (
        <div className="space-y-6">
          <div className="card">
            <h4 className="font-medium text-gray-900 mb-4">Constraint Analysis</h4>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={constraintData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" name="Actual Value">
                  {constraintData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
                <Bar dataKey="threshold" fill="#e5e7eb" name="Threshold" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card">
              <h5 className="font-medium text-gray-900 mb-3">Hard Constraints</h5>
              <div className="space-y-2">
                {decision.explanation.hardConstraints.map((constraint, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center space-x-2">
                      {constraint.passed ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                      <span className="text-sm font-medium">{constraint.name}</span>
                    </div>
                    <span className="text-sm text-gray-600">
                      {constraint.value.toFixed(2)} / {constraint.threshold.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h5 className="font-medium text-gray-900 mb-3">Soft Constraints</h5>
              <div className="space-y-2">
                {decision.explanation.softConstraints.map((constraint, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center space-x-2">
                      {constraint.passed ? (
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-yellow-600" />
                      )}
                      <span className="text-sm font-medium">{constraint.name}</span>
                    </div>
                    <span className="text-sm text-gray-600">
                      {constraint.value.toFixed(2)} / {constraint.threshold.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'scoring' && (
        <div className="space-y-6">
          <div className="card">
            <h4 className="font-medium text-gray-900 mb-4">Scoring Factors Analysis</h4>
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="factor" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.3}
                />
                <Radar
                  name="Weight"
                  dataKey="weight"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.1}
                />
                <Tooltip />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {decision.explanation.scoringFactors.map((factor, index) => (
              <div key={index} className="card">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-gray-900">{factor.name}</h5>
                  <span className="text-lg font-bold text-blue-600">
                    {factor.score.toFixed(2)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{factor.description}</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Score:</span>
                    <span>{factor.score.toFixed(2)}/10</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${factor.score * 10}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Weight:</span>
                    <span>{(factor.weight * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between text-sm font-medium">
                    <span>Weighted Score:</span>
                    <span>{(factor.score * factor.weight).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'alternatives' && (
        <div className="space-y-4">
          <div className="card">
            <h4 className="font-medium text-gray-900 mb-4">Alternative Options</h4>
            {decision.alternatives.length > 0 ? (
              <div className="space-y-3">
                {decision.alternatives.map((alternative, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium">{index + 1}</span>
                        </div>
                        <span className="font-medium">Vehicle {alternative.vehicleId}</span>
                      </div>
                      <span className={`font-bold ${getScoreColor(alternative.score)}`}>
                        {alternative.score.toFixed(2)}/10
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Route Efficiency:</span>
                        <p className="font-medium">
                          {alternative.explanation.scoringFactors
                            .find(f => f.name.includes('Route'))?.score.toFixed(1) || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Capacity:</span>
                        <p className="font-medium">
                          {alternative.explanation.scoringFactors
                            .find(f => f.name.includes('Capacity'))?.score.toFixed(1) || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">SLA Safety:</span>
                        <p className="font-medium">
                          {alternative.explanation.scoringFactors
                            .find(f => f.name.includes('SLA'))?.score.toFixed(1) || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Risk Level:</span>
                        <p className={`font-medium ${
                          alternative.explanation.riskAssessment.level === 'low' ? 'text-green-600' :
                          alternative.explanation.riskAssessment.level === 'medium' ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {alternative.explanation.riskAssessment.level}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No alternative options available</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DecisionVisualization;