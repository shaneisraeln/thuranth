import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Vehicle } from '../../types';
import { vehicleApi } from '../../services/api';

interface VehicleState {
  vehicles: Vehicle[];
  selectedVehicle?: Vehicle;
  isLoading: boolean;
  error?: string;
}

const initialState: VehicleState = {
  vehicles: [],
  isLoading: false,
};

// Async thunks
export const fetchVehicles = createAsyncThunk(
  'vehicles/fetchVehicles',
  async () => {
    const response = await vehicleApi.getVehicles();
    return response.data;
  }
);

export const updateVehicleLocation = createAsyncThunk(
  'vehicles/updateLocation',
  async ({ vehicleId, location }: { vehicleId: string; location: { latitude: number; longitude: number } }) => {
    const response = await vehicleApi.updateVehicleLocation(vehicleId, location);
    return response.data;
  }
);

const vehicleSlice = createSlice({
  name: 'vehicles',
  initialState,
  reducers: {
    selectVehicle: (state, action: PayloadAction<Vehicle>) => {
      state.selectedVehicle = action.payload;
    },
    clearSelectedVehicle: (state) => {
      state.selectedVehicle = undefined;
    },
    updateVehicleRealtime: (state, action: PayloadAction<Vehicle>) => {
      const index = state.vehicles.findIndex(v => v.id === action.payload.id);
      if (index !== -1) {
        state.vehicles[index] = action.payload;
      } else {
        state.vehicles.push(action.payload);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVehicles.pending, (state) => {
        state.isLoading = true;
        state.error = undefined;
      })
      .addCase(fetchVehicles.fulfilled, (state, action) => {
        state.isLoading = false;
        state.vehicles = action.payload;
      })
      .addCase(fetchVehicles.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message;
      })
      .addCase(updateVehicleLocation.fulfilled, (state, action) => {
        const index = state.vehicles.findIndex(v => v.id === action.payload.id);
        if (index !== -1) {
          state.vehicles[index] = action.payload;
        }
      });
  },
});

export const { selectVehicle, clearSelectedVehicle, updateVehicleRealtime } = vehicleSlice.actions;
export default vehicleSlice.reducer;