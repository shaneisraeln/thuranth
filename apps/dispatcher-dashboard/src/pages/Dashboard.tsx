import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { fetchVehicles, selectVehicle } from '../store/slices/vehicleSlice';
import { fetchPendingParcels, selectParcel, sortPendingParcelsByPriority } from '../store/slices/parcelSlice';
import { fetchCurrentMetrics } from '../store/slices/metricsSlice';
import GoogleMap from '../components/GoogleMap';
import VehicleList from '../components/VehicleList';
import ParcelQueue from '../components/ParcelQueue';
import MetricsOverview from '../components/MetricsOverview';
import RealTimeUpdates from '../components/RealTimeUpdates';
import { Vehicle, Parcel } from '../types';

const Dashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { vehicles, selectedVehicle } = useSelector((state: RootState) => state.vehicles);
  const { pendingParcels, selectedParcel } = useSelector((state: RootState) => state.parcels);
  const { currentMetrics } = useSelector((state: RootState) => state.metrics);

  useEffect(() => {
    // Load initial data
    dispatch(fetchVehicles());
    dispatch(fetchPendingParcels());
    dispatch(fetchCurrentMetrics());
    
    // Sort pending parcels by priority
    dispatch(sortPendingParcelsByPriority());
  }, [dispatch]);

  const handleVehicleClick = (vehicle: Vehicle) => {
    dispatch(selectVehicle(vehicle));
  };

  const handleParcelClick = (parcel: Parcel) => {
    dispatch(selectParcel(parcel));
  };

  return (
    <div className="h-full flex flex-col">
      <RealTimeUpdates />
      
      {/* Metrics Overview */}
      <div className="flex-shrink-0 p-4 bg-white border-b border-gray-200">
        <MetricsOverview metrics={currentMetrics} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Vehicle List */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Active Vehicles</h3>
            <p className="text-sm text-gray-500">{vehicles.length} vehicles online</p>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <VehicleList 
              vehicles={vehicles}
              selectedVehicle={selectedVehicle}
              onVehicleSelect={handleVehicleClick}
            />
          </div>
        </div>

        {/* Center Panel - Map */}
        <div className="flex-1 relative">
          <GoogleMap
            vehicles={vehicles}
            parcels={pendingParcels}
            onVehicleClick={handleVehicleClick}
            onParcelClick={handleParcelClick}
            className="w-full h-full"
          />
          
          {/* Map Controls */}
          <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-2">
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>On Route</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span>Delivering</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-0 h-0 border-l-2 border-r-2 border-b-3 border-transparent border-b-red-500"></div>
                <span>Urgent Parcels</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Parcel Queue */}
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Parcel Queue</h3>
            <p className="text-sm text-gray-500">{pendingParcels.length} parcels pending</p>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <ParcelQueue 
              parcels={pendingParcels}
              selectedParcel={selectedParcel}
              onParcelSelect={handleParcelClick}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;