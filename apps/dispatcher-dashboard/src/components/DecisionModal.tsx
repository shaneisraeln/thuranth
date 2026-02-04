import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { X, Brain, CheckCircle, XCircle, AlertTriangle, Truck } from 'lucide-react';
import { RootState, AppDispatch } from '../store';
import { hideDecisionModal, addNotification } from '../store/slices/uiSlice';
import { requestDecision } from '../store/slices/decisionSlice';
import { Decision, ConstraintResult, ScoringFactor } from '../types';

const DecisionModal: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { showDecisionModal } = useSelector((state: RootState) => state.ui);
  const { selectedParcel } = useSelector((state: RootState) => state.parcels);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (showDecisionModal && selectedParcel && !decision) {
      handleRequestDecision();
    }
  }, [showDecisionModal, selectedParcel]);

  const handleRequestDecision = async () => {
    if (!selectedParcel) return;

    setIsLoading(true);
    try {
      const result = await dispatch(requestDecision(selectedParcel.id)).unwrap();
      setDecision(result);
    } catch (error) {
      dispatch(addNotification({
        type: 'error',
        message: 'Failed to request decision',
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setDecision(null);
    dispatch(hideDecisionModal());
  };

  const getConstraintIcon = (passed: boolean) => {
    return passed ? (
      <CheckCircle className="w-4 h-4 text-green-600" />
    ) : (
      <XCircle className="w-4 h-4 text-red-600" />
    );
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (!showDecisionModal || !selectedParcel) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Brain className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Decision Analysis</h2>
              <p className="text-sm text-gray-600">
                Automated consolidation decision for {selectedParcel.trackingNumber}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="spinner mr-3"></div>
              <span>Analyzing consolidation options...</span>
            </div>
          ) : decision ? (
            <div className="space-y-6">
              {/* Decision Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Decision Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-600">Recommendation:</span>
                    <p className="font-medium">
                      {decision.recommendedVehicleId ? (
                        <span className="text-green-600">Consolidate with existing vehicle</span>
                      ) : decision.requiresNewDispatch ? (
                        <span className="text-blue-600">Dispatch new vehicle</span>
                      ) : (
                        <span className="text-red-600">No suitable option found</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-600">Confidence Score:</span>
                    <p className="font-medium">{decision.score.toFixed(2)}/10</p>
                  </div>
                </div>
              </div>

              {/* Hard Constraints */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Hard Constraints</h3>
                <div className="space-y-2">
                  {decision.explanation.hardConstraints.map((constraint, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getConstraintIcon(constraint.passed)}
                        <div>
                          <p className="font-medium">{constraint.name}</p>
                          <p className="text-sm text-gray-600">{constraint.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{constraint.value.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">Threshold: {constraint.threshold.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Soft Constraints */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Soft Constraints</h3>
                <div className="space-y-2">
                  {decision.explanation.softConstraints.map((constraint, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getConstraintIcon(constraint.passed)}
                        <div>
                          <p className="font-medium">{constraint.name}</p>
                          <p className="text-sm text-gray-600">{constraint.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{constraint.value.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">Threshold: {constraint.threshold.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scoring Factors */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Scoring Factors</h3>
                <div className="space-y-2">
                  {decision.explanation.scoringFactors.map((factor, index) => (
                    <div key={index} className="p-3 bg-white border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">{factor.name}</p>
                        <p className="font-medium">{factor.score.toFixed(2)} × {factor.weight.toFixed(2)}</p>
                      </div>
                      <p className="text-sm text-gray-600">{factor.description}</p>
                      <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${Math.min(factor.score * 10, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk Assessment */}
              <div className={`border rounded-lg p-4 ${getRiskColor(decision.explanation.riskAssessment.level)}`}>
                <div className="flex items-center space-x-2 mb-3">
                  <AlertTriangle className="w-5 h-5" />
                  <h3 className="font-medium">Risk Assessment: {decision.explanation.riskAssessment.level.toUpperCase()}</h3>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Risk Factors:</h4>
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
                    <h4 className="font-medium mb-2">Mitigation Strategies:</h4>
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

              {/* Alternative Options */}
              {decision.alternatives.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Alternative Options</h3>
                  <div className="space-y-2">
                    {decision.alternatives.slice(0, 3).map((alternative, index) => (
                      <div key={index} className="p-3 bg-white border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Truck className="w-4 h-4 text-gray-600" />
                            <span className="font-medium">Vehicle {alternative.vehicleId}</span>
                          </div>
                          <span className="font-medium">Score: {alternative.score.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleClose}
                  className="btn-secondary"
                >
                  Close
                </button>
                {decision.recommendedVehicleId && (
                  <button className="btn-primary">
                    Execute Recommendation
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>No decision data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DecisionModal;