import Geolocation from 'react-native-geolocation-service';
import {Platform, PermissionsAndroid} from 'react-native';
import {store} from '@/store';
import {updateLocation, startTracking, stopTracking, setLocationError} from '@/store/slices/locationSlice';

interface LocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  interval?: number;
}

export class LocationService {
  private static instance: LocationService;
  private watchId: number | null = null;
  private isTracking: boolean = false;
  private trackingInterval: NodeJS.Timeout | null = null;

  public static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  public static async initialize(): Promise<void> {
    const instance = LocationService.getInstance();
    const hasPermission = await instance.requestLocationPermission();
    
    if (hasPermission) {
      // Start location tracking automatically
      instance.startLocationTracking();
    }
  }

  private async requestLocationPermission(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      // iOS permissions are handled in Info.plist and automatically requested
      return true;
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'This app needs access to your location to track deliveries.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );

      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  }

  public async getCurrentLocation(): Promise<{latitude: number; longitude: number} | null> {
    return new Promise((resolve) => {
      Geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          
          store.dispatch(updateLocation({
            location,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading || undefined,
            speed: position.coords.speed || undefined,
          }));
          
          resolve(location);
        },
        (error) => {
          console.error('Error getting current location:', error);
          store.dispatch(setLocationError(error.message));
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        }
      );
    });
  }

  public startLocationTracking(options: LocationOptions = {}): void {
    if (this.isTracking) {
      console.log('Location tracking already started');
      return;
    }

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 10000,
      interval: 30000, // 30 seconds as per requirements
    };

    const trackingOptions = {...defaultOptions, ...options};

    this.watchId = Geolocation.watchPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        
        store.dispatch(updateLocation({
          location,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading || undefined,
          speed: position.coords.speed || undefined,
        }));
        
        // Send location update to server (if online)
        this.sendLocationUpdate(location);
      },
      (error) => {
        console.error('Location tracking error:', error);
        store.dispatch(setLocationError(error.message));
      },
      {
        enableHighAccuracy: trackingOptions.enableHighAccuracy,
        timeout: trackingOptions.timeout,
        maximumAge: trackingOptions.maximumAge,
        distanceFilter: 10, // Update when moved 10 meters
      }
    );

    this.isTracking = true;
    store.dispatch(startTracking());

    // Set up interval for regular updates (every 30 seconds)
    this.trackingInterval = setInterval(() => {
      this.getCurrentLocation();
    }, trackingOptions.interval);

    console.log('Location tracking started');
  }

  public stopLocationTracking(): void {
    if (!this.isTracking) {
      console.log('Location tracking not active');
      return;
    }

    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }

    this.isTracking = false;
    store.dispatch(stopTracking());

    console.log('Location tracking stopped');
  }

  private async sendLocationUpdate(location: {latitude: number; longitude: number}): Promise<void> {
    try {
      const state = store.getState();
      const {isOnline} = state.offline;
      const {token} = state.auth;

      if (!isOnline || !token) {
        // Store for offline sync
        const {addPendingAction} = await import('@/store/slices/offlineSlice');
        store.dispatch(addPendingAction({
          type: 'location_update',
          payload: {
            location,
            timestamp: new Date().toISOString(),
          },
        }));
        return;
      }

      // Send to server
      const response = await fetch(`${process.env.API_BASE_URL}/api/vehicles/location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          location,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log('Location update sent successfully');
    } catch (error) {
      console.error('Error sending location update:', error);
      
      // Store for offline sync
      const {addPendingAction} = await import('@/store/slices/offlineSlice');
      store.dispatch(addPendingAction({
        type: 'location_update',
        payload: {
          location,
          timestamp: new Date().toISOString(),
        },
      }));
    }
  }

  public isLocationTrackingActive(): boolean {
    return this.isTracking;
  }

  public async calculateDistance(
    from: {latitude: number; longitude: number},
    to: {latitude: number; longitude: number}
  ): Promise<number> {
    // Haversine formula for calculating distance between two points
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(to.latitude - from.latitude);
    const dLon = this.toRadians(to.longitude - from.longitude);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(from.latitude)) * Math.cos(this.toRadians(to.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers
    
    return distance;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}