import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Metrics } from '../../types';
import { analyticsApi } from '../../services/api';

interface MetricsState {
  currentMetrics: Metrics;
  historicalMetrics: { date: string; metrics: Metrics }[];
  isLoading: boolean;
  error?: string;
}

const initialState: MetricsState = {
  currentMetrics: {
    vehiclesAvoided: 0,
    utilizationImprovement: 0,
    emissionsSaved: 0,
    fuelSavings: 0,
    slaAdherence: 0,
    totalParcelsConsolidated: 0,
  },
  historicalMetrics: [],
  isLoading: false,
};

// Async thunks
export const fetchCurrentMetrics = createAsyncThunk(
  'metrics/fetchCurrent',
  async () => {
    const response = await analyticsApi.getCurrentMetrics();
    return response.data;
  }
);

export const fetchHistoricalMetrics = createAsyncThunk(
  'metrics/fetchHistorical',
  async ({ startDate, endDate }: { startDate: string; endDate: string }) => {
    const response = await analyticsApi.getHistoricalMetrics(startDate, endDate);
    return response.data;
  }
);

const metricsSlice = createSlice({
  name: 'metrics',
  initialState,
  reducers: {
    updateMetricsRealtime: (state, action) => {
      state.currentMetrics = { ...state.currentMetrics, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentMetrics.pending, (state) => {
        state.isLoading = true;
        state.error = undefined;
      })
      .addCase(fetchCurrentMetrics.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentMetrics = action.payload;
      })
      .addCase(fetchCurrentMetrics.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message;
      })
      .addCase(fetchHistoricalMetrics.fulfilled, (state, action) => {
        state.historicalMetrics = action.payload;
      });
  },
});

export const { updateMetricsRealtime } = metricsSlice.actions;
export default metricsSlice.reducer;