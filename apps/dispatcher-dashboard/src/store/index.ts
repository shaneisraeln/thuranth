import { configureStore } from '@reduxjs/toolkit';
import vehicleSlice from './slices/vehicleSlice';
import parcelSlice from './slices/parcelSlice';
import decisionSlice from './slices/decisionSlice';
import metricsSlice from './slices/metricsSlice';
import uiSlice from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    vehicles: vehicleSlice,
    parcels: parcelSlice,
    decisions: decisionSlice,
    metrics: metricsSlice,
    ui: uiSlice,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;