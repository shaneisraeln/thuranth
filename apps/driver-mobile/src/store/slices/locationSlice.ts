import {createSlice, PayloadAction} from '@reduxjs/toolkit';

interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

interface LocationState {
  currentLocation: GeoCoordinate | null;
  locationHistory: Array<{
    location: GeoCoordinate;
    timestamp: string;
  }>;
  isTracking: boolean;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  error: string | null;
}

const initialState: LocationState = {
  currentLocation: null,
  locationHistory: [],
  isTracking: false,
  accuracy: null,
  heading: null,
  speed: null,
  error: null,
};

const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    updateLocation: (state, action: PayloadAction<{
      location: GeoCoordinate;
      accuracy?: number;
      heading?: number;
      speed?: number;
    }>) => {
      const {location, accuracy, heading, speed} = action.payload;
      state.currentLocation = location;
      state.accuracy = accuracy || null;
      state.heading = heading || null;
      state.speed = speed || null;
      
      // Add to history (keep last 100 locations)
      state.locationHistory.push({
        location,
        timestamp: new Date().toISOString(),
      });
      
      if (state.locationHistory.length > 100) {
        state.locationHistory = state.locationHistory.slice(-100);
      }
      
      state.error = null;
    },
    startTracking: (state) => {
      state.isTracking = true;
      state.error = null;
    },
    stopTracking: (state) => {
      state.isTracking = false;
    },
    setLocationError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isTracking = false;
    },
    clearLocationHistory: (state) => {
      state.locationHistory = [];
    },
  },
});

export const {
  updateLocation,
  startTracking,
  stopTracking,
  setLocationError,
  clearLocationHistory,
} = locationSlice.actions;

export default locationSlice.reducer;