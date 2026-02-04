import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { X, AlertTriangle, Truck, Package } from 'lucide-react';
import { RootState, AppDispatch } from '../store';
import { hideOverrideModal, addNotification } from '../store/slices/uiSlice';
import { submitManualOverride } from '../store/slices/decisionSlice';
import { ManualOverride } from '../types';

const ManualOverrideModal: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { showOverrideModal } = useSelector((state: RootState) => state.ui);
  const { selectedParcel } = useSelector((state: RootState) => state.parcels);
  const { vehicles } = useSelector((state: RootState) => state.vehicles);
  
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [justification, setJustification] = useState<string>('');
  const [riskAcknowledged, setRiskAcknowledged] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const availableVehicles = vehicles.filter(v => 
    v.status === 'available' || v.status === 'on_route'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedParcel) {
      dispatch(addNotification({
        type: 'error',
        message: 'No parcel selected for override',
      }));
      return;
    }

    if (!reason.trim() || !justification.trim()) {
      dispatch(addNotification({
        type: 'error',
        message: 'Reason and justification are required',
      }));
      return;
    }

    if (!riskAcknowledged) {
      dispatch(addNotification({
        type: 'error',
        message: 'You must acknowledge the risks before proceeding',
      }));
      return;
    }

    setIsSubmitting(true);

    try {
      const override: ManualOverride = {
        parcelId: selectedParcel.id,
        vehicleId: selectedVehicleId || undefined,
        reason,
        justification,
        riskAcknowledged,
      };

      await dispatch(submitManualOverride(override)).unwrap();
      
      dispatch(addNotification({
        type: 'success',
        message: 'Manual override submitted successfully',
      }));
      
      handleClose();
    } catch (error) {
      dispatch(addNotification({
        type: 'error',
        message: 'Failed to submit manual override',
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedVehicleId('');
    setReason('');
    setJustification('');
    setRiskAcknowledged(false);
    dispatch(hideOverrideModal());
  };

  if (!showOverrideModal || !selectedParcel) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Manual Override</h2>
              <p className="text-sm text-gray-600">Override automated decision for parcel assignment</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Parcel Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center">
              <Package className="w-4 h-4 mr-2" />
              Parcel Details
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Tracking Number:</span>
                <p className="font-medium">{selectedParcel.trackingNumber}</p>
              </div>
              <div>
                <span className="text-gray-600">Priority:</span>
                <p className={`font-medium ${
                  selectedParcel.priority === 'urgent' ? 'text-red-600' :
                  selectedParcel.priority === 'high' ? 'text-orange-600' :
                  selectedParcel.priority === 'medium' ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {selectedParcel.priority.toUpperCase()}
                </p>
              </div>
              <div>
                <span className="text-gray-600">Weight:</span>
                <p className="font-medium">{selectedParcel.weight} kg</p>
              </div>
              <div>
                <span className="text-gray-600">SLA Deadline:</span>
                <p className="font-medium">{new Date(selectedParcel.slaDeadline).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Vehicle Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign to Vehicle (Optional)
            </label>
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="input-field"
            >
              <option value="">Select a vehicle or leave empty for new dispatch</option>
              {availableVehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.registrationNumber} - {vehicle.driverName} 
                  ({vehicle.capacity.utilizationPercentage.toFixed(1)}% capacity)
                </option>
              ))}
            </select>
          </div>

          {/* Override Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Override Reason *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="input-field"
              required
            >
              <option value="">Select a reason</option>
              <option value="customer_request">Customer Request</option>
              <option value="sla_critical">SLA Critical</option>
              <option value="operational_efficiency">Operational Efficiency</option>
              <option value="vehicle_breakdown">Vehicle Breakdown</option>
              <option value="route_optimization">Route Optimization</option>
              <option value="emergency">Emergency</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Justification */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Detailed Justification *
            </label>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              className="input-field"
              rows={4}
              placeholder="Provide detailed justification for this manual override..."
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              This justification will be logged for audit purposes.
            </p>
          </div>

          {/* Risk Acknowledgment */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-yellow-800">Risk Acknowledgment</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Manual overrides bypass automated safety checks and may impact:
                </p>
                <ul className="text-sm text-yellow-700 mt-2 list-disc list-inside space-y-1">
                  <li>SLA compliance and delivery commitments</li>
                  <li>Vehicle capacity and route optimization</li>
                  <li>Overall system efficiency metrics</li>
                  <li>Customer satisfaction and service quality</li>
                </ul>
                <label className="flex items-center mt-3">
                  <input
                    type="checkbox"
                    checked={riskAcknowledged}
                    onChange={(e) => setRiskAcknowledged(e.target.checked)}
                    className="mr-2"
                    required
                  />
                  <span className="text-sm font-medium text-yellow-800">
                    I acknowledge these risks and take responsibility for this override
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-danger"
              disabled={isSubmitting || !riskAcknowledged}
            >
              {isSubmitting ? (
                <>
                  <div className="spinner mr-2"></div>
                  Submitting...
                </>
              ) : (
                'Submit Override'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManualOverrideModal;