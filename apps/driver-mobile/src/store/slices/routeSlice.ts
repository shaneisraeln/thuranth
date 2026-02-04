import {createSlice, PayloadAction} from '@reduxjs/toolkit';

interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

interface RoutePoint {
  id: string;
  parcelId: string;
  address: string;
  location: GeoCoordinate;
  type: 'pickup' | 'delivery';
  estimatedTime: string;
  completed: boolean;
  sequence: number;
}

interface RouteState {
  currentRoute: RoutePoint[];
  optimizedRoute: RoutePoint[];
  currentLocation: GeoCoordinate | null;
  isNavigating: boolean;
  currentDestination: RoutePoint | null;
  routeDistance: number;
  routeDuration: number;
  loading: boolean;
  error: string | null;
}

const initialState: RouteState = {
  currentRoute: [],
  optimizedRoute: [],
  currentLocation: null,
  isNavigating: false,
  currentDestination: null,
  routeDistance: 0,
  routeDuration: 0,
  loading: false,
  error: null,
};

const routeSlice = createSlice({
  name: 'route',
  initialState,
  reducers: {
    setCurrentRoute: (state, action: PayloadAction<RoutePoint[]>) => {
      state.currentRoute = action.payload;
    },
    setOptimizedRoute: (state, action: PayloadAction<RoutePoint[]>) => {
      state.optimizedRoute = action.payload;
    },
    updateCurrentLocation: (state, action: PayloadAction<GeoCoordinate>) => {
      state.currentLocation = action.payload;
    },
    startNavigation: (state, action: PayloadAction<RoutePoint>) => {
      state.isNavigating = true;
      state.currentDestination = action.payload;
    },
    stopNavigation: (state) => {
      state.isNavigating = false;
      state.currentDestination = null;
    },
    completeRoutePoint: (state, action: PayloadAction<string>) => {
      const pointId = action.payload;
      state.currentRoute = state.currentRoute.map(point =>
        point.id === pointId ? {...point, completed: true} : point
      );
      state.optimizedRoute = state.optimizedRoute.map(point =>
        point.id === pointId ? {...point, completed: true} : point
      );
    },
    addRoutePoint: (state, action: PayloadAction<RoutePoint>) => {
      state.currentRoute.push(action.payload);
      // Re-optimize route when new point is added
      state.optimizedRoute = [...state.currentRoute].sort((a, b) => a.sequence - b.sequence);
    },
    removeRoutePoint: (state, action: PayloadAction<string>) => {
      const pointId = action.payload;
      state.currentRoute = state.currentRoute.filter(point => point.id !== pointId);
      state.optimizedRoute = state.optimizedRoute.filter(point => point.id !== pointId);
    },
    updateRouteMetrics: (state, action: PayloadAction<{distance: number; duration: number}>) => {
      state.routeDistance = action.payload.distance;
      state.routeDuration = action.payload.duration;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setCurrentRoute,
  setOptimizedRoute,
  updateCurrentLocation,
  startNavigation,
  stopNavigation,
  completeRoutePoint,
  addRoutePoint,
  removeRoutePoint,
  updateRouteMetrics,
  setLoading,
  setError,
} = routeSlice.actions;

export default routeSlice.reducer;