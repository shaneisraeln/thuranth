import {configureStore, combineReducers} from '@reduxjs/toolkit';
import {persistStore, persistReducer} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

import authSlice from './slices/authSlice';
import routeSlice from './slices/routeSlice';
import deliverySlice from './slices/deliverySlice';
import offlineSlice from './slices/offlineSlice';
import locationSlice from './slices/locationSlice';

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'route', 'delivery', 'offline'], // Only persist these reducers
};

const rootReducer = combineReducers({
  auth: authSlice,
  route: routeSlice,
  delivery: deliverySlice,
  offline: offlineSlice,
  location: locationSlice,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;