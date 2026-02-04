import axios from 'axios';
import { Vehicle, Parcel, Decision, ManualOverride, Metrics } from '../types';

const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:3000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Vehicle API
export const vehicleApi = {
  getVehicles: () => apiClient.get<Vehicle[]>('/vehicles'),
  getVehicle: (id: string) => apiClient.get<Vehicle>(`/vehicles/${id}`),
  updateVehicleLocation: (id: string, location: { latitude: number; longitude: number }) =>
    apiClient.patch<Vehicle>(`/vehicles/${id}/location`, location),
};

// Parcel API
export const parcelApi = {
  getParcels: () => apiClient.get<Parcel[]>('/parcels'),
  getPendingParcels: () => apiClient.get<Parcel[]>('/parcels/pending'),
  getParcel: (id: string) => apiClient.get<Parcel>(`/parcels/${id}`),
  assignParcelToVehicle: (parcelId: string, vehicleId: string) =>
    apiClient.post<Parcel>(`/parcels/${parcelId}/assign`, { vehicleId }),
};

// Decision API
export const decisionApi = {
  getDecisions: () => apiClient.get<Decision[]>('/decisions'),
  getDecision: (id: string) => apiClient.get<Decision>(`/decisions/${id}`),
  requestDecision: (parcelId: string) =>
    apiClient.post<Decision>('/decisions/evaluate', { parcelId }),
  submitManualOverride: (override: ManualOverride) =>
    apiClient.post<Decision>('/decisions/override', override),
};

// Analytics API
export const analyticsApi = {
  getCurrentMetrics: () => apiClient.get<Metrics>('/analytics/metrics/current'),
  getHistoricalMetrics: (startDate: string, endDate: string) =>
    apiClient.get<{ date: string; metrics: Metrics }[]>('/analytics/metrics/historical', {
      params: { startDate, endDate },
    }),
  getImpactReport: (startDate: string, endDate: string) =>
    apiClient.get('/analytics/reports/impact', {
      params: { startDate, endDate },
    }),
};

export default apiClient;