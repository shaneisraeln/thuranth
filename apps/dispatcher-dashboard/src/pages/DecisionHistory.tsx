import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { fetchDecisions, selectDecision } from '../store/slices/decisionSlice';
import DecisionVisualization from '../components/DecisionVisualization';
import { Decision } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { Brain, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

const DecisionHistory: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { decisions, selectedDecision, isLoading } = useSelector((state: RootState) => state.decisions);
  const [filter, setFilter] = useState<'all' | 'executed' | 'overridden' | 'shadow'>('all');

  useEffect(() => {
    dispatch(fetchDecisions());
  }, [dispatch]);

  const filteredDecisions = decisions.filter(decision => {
    switch (filter) {
      case 'executed':
        return decision.executed && !decision.overridden;
      case 'overridden':
        return decision.overridden;
      case 'shadow':
        return decision.shadowMode;
      default:
        return true;
    }
  });

  const getDecisionIcon = (decision: Decision) => {
    if (decision.overridden) return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    if (decision.executed) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (decision.shadowMode) return <Clock className="w-5 h-5 text-blue-600" />;
    return <XCircle className="w-5 h-5 text-gray-600" />;
  };

  const getDecisionStatus = (decision: Decision) => {
    if (decision.overridden) return { text: 'Overridden', class: 'status-badge bg-yellow-100 text-yellow-800' };
    if (decision.executed) return { text: 'Executed', class: 'status-badge bg-green-100 text-green-800' };
    if (decision.shadowMode) return { text: 'Shadow Mode', class: 'status-badge bg-blue-100 text-blue-800' };
    return { text: 'Pending', class: 'status-badge bg-gray-100 text-gray-800' };
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Decision History</h1>
        <p className="text-gray-600">View and analyze consolidation decisions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Decision List */}
        <div className="lg:col-span-1">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Decisions</h3>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="text-sm border border-gray-300 rounded-md px-2 py-1"
              >
                <option value="all">All Decisions</option>
                <option value="executed">Executed</option>
                <option value="overridden">Overridden</option>
                <option value="shadow">Shadow Mode</option>
              </select>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="spinner mr-2"></div>
                <span>Loading decisions...</span>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                {filteredDecisions.map((decision) => {
                  const status = getDecisionStatus(decision);
                  return (
                    <div
                      key={decision.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md ${
                        selectedDecision?.id === decision.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                      onClick={() => dispatch(selectDecision(decision))}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-1 bg-gray-100 rounded">
                            {getDecisionIcon(decision)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              Parcel {decision.parcelId.slice(-6)}
                            </p>
                            <p className="text-sm text-gray-600">
                              Score: {decision.score.toFixed(1)}/10
                            </p>
                          </div>
                        </div>
                        <span className={status.class}>{status.text}</span>
                      </div>

                      <div className="mt-2 text-xs text-gray-500">
                        {formatDistanceToNow(new Date(decision.requestTimestamp), { addSuffix: true })}
                      </div>

                      {decision.recommendedVehicleId && (
                        <div className="mt-2 text-xs text-blue-600">
                          → Vehicle {decision.recommendedVehicleId.slice(-6)}
                        </div>
                      )}

                      {decision.overrideReason && (
                        <div className="mt-2 text-xs text-yellow-600">
                          Override: {decision.overrideReason}
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredDecisions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Brain className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No decisions found</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Decision Details */}
        <div className="lg:col-span-2">
          {selectedDecision ? (
            <div className="card">
              <DecisionVisualization decision={selectedDecision} />
            </div>
          ) : (
            <div className="card">
              <div className="text-center py-12 text-gray-500">
                <Brain className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Decision</h3>
                <p>Choose a decision from the list to view detailed analysis</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DecisionHistory;