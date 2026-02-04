import React, { useCallback, useRef, useEffect } from 'react';
import { Wrapper, Status } from '@google-maps/react-wrapper';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { setMapCenter, setMapZoom } from '../store/slices/uiSlice';
import { Vehicle, Parcel } from '../types';

const GOOGLE_MAPS_API_KEY = process.env.VITE_GOOGLE_MAPS_API_KEY || '';

interface MapProps {
  center: google.maps.LatLngLiteral;
  zoom: number;
  vehicles: Vehicle[];
  parcels: Parcel[];
  onVehicleClick?: (vehicle: Vehicle) => void;
  onParcelClick?: (parcel: Parcel) => void;
}

const Map: React.FC<MapProps> = ({ 
  center, 
  zoom, 
  vehicles, 
  parcels, 
  onVehicleClick, 
  onParcelClick 
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map>();
  const vehicleMarkersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const parcelMarkersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const dispatch = useDispatch();

  useEffect(() => {
    if (ref.current && !mapRef.current) {
      mapRef.current = new window.google.maps.Map(ref.current, {
        center,
        zoom,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }],
          },
        ],
      });

      // Listen for map changes
      mapRef.current.addListener('center_changed', () => {
        const newCenter = mapRef.current!.getCenter()!;
        dispatch(setMapCenter({
          latitude: newCenter.lat(),
          longitude: newCenter.lng(),
        }));
      });

      mapRef.current.addListener('zoom_changed', () => {
        const newZoom = mapRef.current!.getZoom()!;
        dispatch(setMapZoom(newZoom));
      });
    }
  }, [center, zoom, dispatch]);

  // Update vehicle markers
  useEffect(() => {
    if (!mapRef.current) return;

    const currentMarkers = vehicleMarkersRef.current;
    const currentVehicleIds = new Set(vehicles.map(v => v.id));

    // Remove markers for vehicles that no longer exist
    currentMarkers.forEach((marker, vehicleId) => {
      if (!currentVehicleIds.has(vehicleId)) {
        marker.setMap(null);
        currentMarkers.delete(vehicleId);
      }
    });

    // Add or update markers for current vehicles
    vehicles.forEach((vehicle) => {
      let marker = currentMarkers.get(vehicle.id);
      
      if (!marker) {
        marker = new google.maps.Marker({
          map: mapRef.current,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: getVehicleColor(vehicle.status),
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
        });

        marker.addListener('click', () => {
          onVehicleClick?.(vehicle);
        });

        currentMarkers.set(vehicle.id, marker);
      }

      // Update marker position and appearance
      marker.setPosition({
        lat: vehicle.currentLocation.latitude,
        lng: vehicle.currentLocation.longitude,
      });

      marker.setIcon({
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: getVehicleColor(vehicle.status),
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      });

      // Update info window content
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div class="p-2">
            <h3 class="font-semibold">${vehicle.registrationNumber}</h3>
            <p class="text-sm text-gray-600">Driver: ${vehicle.driverName}</p>
            <p class="text-sm text-gray-600">Type: ${vehicle.type}</p>
            <p class="text-sm text-gray-600">Status: ${vehicle.status}</p>
            <p class="text-sm text-gray-600">Capacity: ${vehicle.capacity.utilizationPercentage.toFixed(1)}%</p>
          </div>
        `,
      });

      marker.addListener('click', () => {
        infoWindow.open(mapRef.current, marker);
      });
    });
  }, [vehicles, onVehicleClick]);

  // Update parcel markers
  useEffect(() => {
    if (!mapRef.current) return;

    const currentMarkers = parcelMarkersRef.current;
    const currentParcelIds = new Set(parcels.map(p => p.id));

    // Remove markers for parcels that no longer exist
    currentMarkers.forEach((marker, parcelId) => {
      if (!currentParcelIds.has(parcelId)) {
        marker.setMap(null);
        currentMarkers.delete(parcelId);
      }
    });

    // Add or update markers for current parcels
    parcels.filter(p => p.status === 'pending').forEach((parcel) => {
      let marker = currentMarkers.get(parcel.id);
      
      if (!marker) {
        marker = new google.maps.Marker({
          map: mapRef.current,
          icon: {
            path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
            scale: 6,
            fillColor: getPriorityColor(parcel.priority),
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 1,
          },
        });

        marker.addListener('click', () => {
          onParcelClick?.(parcel);
        });

        currentMarkers.set(parcel.id, marker);
      }

      // Update marker position
      marker.setPosition({
        lat: parcel.pickupLocation.latitude,
        lng: parcel.pickupLocation.longitude,
      });

      // Update info window content
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div class="p-2">
            <h3 class="font-semibold">${parcel.trackingNumber}</h3>
            <p class="text-sm text-gray-600">Priority: ${parcel.priority}</p>
            <p class="text-sm text-gray-600">Weight: ${parcel.weight}kg</p>
            <p class="text-sm text-gray-600">SLA: ${new Date(parcel.slaDeadline).toLocaleString()}</p>
          </div>
        `,
      });

      marker.addListener('click', () => {
        infoWindow.open(mapRef.current, marker);
      });
    });
  }, [parcels, onParcelClick]);

  return <div ref={ref} className="w-full h-full" />;
};

const getVehicleColor = (status: string): string => {
  switch (status) {
    case 'available':
      return '#10b981'; // green
    case 'on_route':
      return '#3b82f6'; // blue
    case 'delivering':
      return '#f59e0b'; // yellow
    case 'offline':
      return '#6b7280'; // gray
    default:
      return '#6b7280';
  }
};

const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'urgent':
      return '#ef4444'; // red
    case 'high':
      return '#f97316'; // orange
    case 'medium':
      return '#eab308'; // yellow
    case 'low':
      return '#22c55e'; // green
    default:
      return '#6b7280';
  }
};

const render = (status: Status) => {
  switch (status) {
    case Status.LOADING:
      return <div className="flex items-center justify-center h-full">
        <div className="spinner"></div>
        <span className="ml-2">Loading map...</span>
      </div>;
    case Status.FAILURE:
      return <div className="flex items-center justify-center h-full text-red-600">
        <p>Error loading Google Maps</p>
      </div>;
    case Status.SUCCESS:
      return <Map />;
  }
};

interface GoogleMapProps {
  vehicles?: Vehicle[];
  parcels?: Parcel[];
  onVehicleClick?: (vehicle: Vehicle) => void;
  onParcelClick?: (parcel: Parcel) => void;
  className?: string;
}

const GoogleMap: React.FC<GoogleMapProps> = ({ 
  vehicles = [], 
  parcels = [], 
  onVehicleClick, 
  onParcelClick,
  className = "w-full h-full"
}) => {
  const { mapCenter, mapZoom } = useSelector((state: RootState) => state.ui);

  const MapComponent = useCallback(() => (
    <Map
      center={{ lat: mapCenter.latitude, lng: mapCenter.longitude }}
      zoom={mapZoom}
      vehicles={vehicles}
      parcels={parcels}
      onVehicleClick={onVehicleClick}
      onParcelClick={onParcelClick}
    />
  ), [mapCenter, mapZoom, vehicles, parcels, onVehicleClick, onParcelClick]);

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-100`}>
        <p className="text-gray-600">Google Maps API key not configured</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <Wrapper apiKey={GOOGLE_MAPS_API_KEY} render={render}>
        <MapComponent />
      </Wrapper>
    </div>
  );
};

export default GoogleMap;