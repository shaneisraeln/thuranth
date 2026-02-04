export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  ParcelDetails: {
    parcelId: string;
  };
  Navigation: {
    destination: {
      latitude: number;
      longitude: number;
      address: string;
    };
  };
};

export type TabParamList = {
  Route: undefined;
  Deliveries: undefined;
  Profile: undefined;
};