import React from 'react';
import { useDispatch } from 'react-redux';
import { Package, Clock, MapPin, Weight, AlertTriangle } from 'lucide-react';
import { Parcel } from '../types';
import { formatDistanceToNow, isAfter, addHours } from 'date-fns';
import { showOverrideModal, showDecisionModal } from '../store/slices/uiSlice';

interface ParcelQueueProps {
  parcels: Parcel[];
  selectedParcel?: Parcel;
  onParcelSelect: (parcel: Parcel) => void;
}

const ParcelQueue: React.FC<ParcelQueueProps> = ({ 
  parcels, 
  selectedParcel, 
  onParcelSelect 
}) => {
  const dispatch = useDispatch();
  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'status-badge priority-urgent';
      case 'high':
        return 'status-badge priority-high';
      case 'medium':
        return 'status-badge priority-medium';
      case 'low':
        return 'status-badge priority-low';
      default:
        return 'status-badge priority-medium';
    }
  };

  const getSLARisk = (slaDeadline: Date) => {
    const now = new Date();
    const deadline = new Date(slaDeadline);
    const warningTime = addHours(now, 2); // 2 hours warning
    
    if (isAfter(now, deadline)) {
      return { level: 'overdue', color: 'text-red-600', icon: AlertTriangle };
    } else if (isAfter(warningTime, deadline)) {
      return { level: 'warning', color: 'text-yellow-600', icon: Clock };
    }
    return { level: 'safe', color: 'text-green-600', icon: Clock };
  };

  // Sort parcels by priority and SLA deadline
  const sortedParcels = [...parcels].sort((a, b) => {
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    
    return new Date(a.slaDeadline).getTime() - new Date(b.slaDeadline).getTime();
  });

  return (
    <div className="space-y-2 p-4">
      {sortedParcels.map((parcel) => {
        const slaRisk = getSLARisk(parcel.slaDeadline);
        const RiskIcon = slaRisk.icon;
        
        return (
          <div
            key={parcel.id}
            className={`
              p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md
              ${selectedParcel?.id === parcel.id 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 bg-white hover:border-gray-300'
              }
            `}
            onClick={() => onParcelSelect(parcel)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Package className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{parcel.trackingNumber}</h4>
                  <p className="text-sm text-gray-600">{parcel.recipient.name}</p>
                </div>
              </div>
              <span className={getPriorityBadgeClass(parcel.priority)}>
                {parcel.priority}
              </span>
            </div>

            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Weight:</span>
                <span className="font-medium">{parcel.weight} kg</span>
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Dimensions:</span>
                <span className="font-medium">
                  {parcel.dimensions.length}×{parcel.dimensions.width}×{parcel.dimensions.height} cm
                </span>
              </div>

              <div className="flex items-center text-xs text-gray-500">
                <MapPin className="w-3 h-3 mr-1" />
                {parcel.recipient.name}
              </div>

              <div className={`flex items-center text-xs ${slaRisk.color}`}>
                <RiskIcon className="w-3 h-3 mr-1" />
                SLA: {formatDistanceToNow(new Date(parcel.slaDeadline), { addSuffix: true })}
                {slaRisk.level === 'overdue' && ' (OVERDUE)'}
                {slaRisk.level === 'warning' && ' (URGENT)'}
              </div>
            </div>

            {selectedParcel?.id === parcel.id && (
              <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                <div className="text-xs text-gray-600">
                  <p><strong>Pickup:</strong> {parcel.sender.name}</p>
                  <p><strong>Phone:</strong> {parcel.recipient.phone}</p>
                  <p><strong>Created:</strong> {formatDistanceToNow(new Date(parcel.createdAt), { addSuffix: true })}</p>
                </div>
                
                <div className="flex space-x-2 mt-3">
                  <button 
                    className="btn-primary text-xs py-1 px-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch(showDecisionModal());
                    }}
                  >
                    Request Decision
                  </button>
                  <button 
                    className="btn-secondary text-xs py-1 px-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch(showOverrideModal());
                    }}
                  >
                    Manual Override
                  </button>
                </div>
              </div>
            )}

            {/* SLA Risk Indicator */}
            {slaRisk.level !== 'safe' && (
              <div className={`mt-2 p-2 rounded-md ${
                slaRisk.level === 'overdue' ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'
              }`}>
                <div className={`flex items-center text-xs ${slaRisk.color}`}>
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {slaRisk.level === 'overdue' ? 'SLA deadline exceeded' : 'SLA deadline approaching'}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {parcels.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No pending parcels</p>
        </div>
      )}
    </div>
  );
};

export default ParcelQueue;