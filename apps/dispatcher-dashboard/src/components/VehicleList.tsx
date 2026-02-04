import React from 'react';
import { Truck, MapPin, Battery, Clock } from 'lucide-react';
import { Vehicle } from '../types';
import { formatDistanceToNow } from 'date-fns';

interface VehicleListProps {
  vehicles: Vehicle[];
  selectedVehicle?: Vehicle;
  onVehicleSelect: (vehicle: Vehicle) => void;
}

const VehicleList: React.FC<VehicleListProps> = ({ 
  vehicles, 
  selectedVehicle, 
  onVehicleSelect 
}) => {
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'available':
        return 'status-badge status-available';
      case 'on_route':
        return 'status-badge status-on-route';
      case 'delivering':
        return 'status-badge status-delivering';
      case 'offline':
        return 'status-badge status-offline';
      default:
        return 'status-badge status-offline';
    }
  };

  const getCapacityColor = (utilization: number) => {
    if (utilization >= 90) return 'text-red-600';
    if (utilization >= 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="space-y-2 p-4">
      {vehicles.map((vehicle) => (
        <div
          key={vehicle.id}
          className={`
            p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md
            ${selectedVehicle?.id === vehicle.id 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-200 bg-white hover:border-gray-300'
            }
          `}
          onClick={() => onVehicleSelect(vehicle)}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Truck className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">{vehicle.registrationNumber}</h4>
                <p className="text-sm text-gray-600">{vehicle.driverName}</p>
              </div>
            </div>
            <span className={getStatusBadgeClass(vehicle.status)}>
              {vehicle.status.replace('_', ' ')}
            </span>
          </div>

          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Type:</span>
              <span className="font-medium">{vehicle.type}</span>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Capacity:</span>
              <span className={`font-medium ${getCapacityColor(vehicle.capacity.utilizationPercentage)}`}>
                {vehicle.capacity.utilizationPercentage.toFixed(1)}%
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Eligibility:</span>
              <span className="font-medium">{vehicle.eligibilityScore.toFixed(1)}/10</span>
            </div>

            <div className="flex items-center text-xs text-gray-500">
              <Clock className="w-3 h-3 mr-1" />
              Updated {formatDistanceToNow(new Date(vehicle.lastUpdated), { addSuffix: true })}
            </div>
          </div>

          {/* Capacity Bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>Load</span>
              <span>{vehicle.capacity.currentWeight}kg / {vehicle.capacity.maxWeight}kg</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  vehicle.capacity.utilizationPercentage >= 90
                    ? 'bg-red-500'
                    : vehicle.capacity.utilizationPercentage >= 70
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(vehicle.capacity.utilizationPercentage, 100)}%` }}
              />
            </div>
          </div>

          {selectedVehicle?.id === vehicle.id && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center text-xs text-gray-600">
                <MapPin className="w-3 h-3 mr-1" />
                {vehicle.currentLocation.latitude.toFixed(4)}, {vehicle.currentLocation.longitude.toFixed(4)}
              </div>
            </div>
          )}
        </div>
      ))}

      {vehicles.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Truck className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No vehicles available</p>
        </div>
      )}
    </div>
  );
};

export default VehicleList;