import React, {useEffect, useState} from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Linking,
} from 'react-native';
import {
  Text,
  Card,
  Title,
  Button,
  ActivityIndicator,
  Chip,
} from 'react-native-paper';
import MapView, {Marker, Polyline, PROVIDER_GOOGLE} from 'react-native-maps';
import {useRoute, useNavigation} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

import {useAppSelector} from '@/store/hooks';
import {RouteService} from '@/services/RouteService';
import {LocationService} from '@/services/LocationService';

interface NavigationParams {
  destination: {
    latitude: number;
    longitude: number;
    address: string;
  };
}

const NavigationScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const {destination} = route.params as NavigationParams;
  
  const [directions, setDirections] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [eta, setEta] = useState<{duration: number; distance: number} | null>(null);
  const [routeService] = useState(() => RouteService.getInstance());
  const [locationService] = useState(() => LocationService.getInstance());

  const {currentLocation} = useAppSelector(state => state.location);

  useEffect(() => {
    if (currentLocation) {
      loadDirections();
      calculateETA();
    }
  }, [currentLocation]);

  const loadDirections = async () => {
    try {
      if (!currentLocation) return;

      setLoading(true);
      const directionsData = await routeService.getNavigationDirections(destination);
      setDirections(directionsData);
    } catch (error) {
      console.error('Error loading directions:', error);
      Alert.alert('Error', 'Failed to load navigation directions');
    } finally {
      setLoading(false);
    }
  };

  const calculateETA = async () => {
    try {
      if (!currentLocation) return;

      const etaData = await routeService.calculateETA(destination);
      setEta(etaData);
    } catch (error) {
      console.error('Error calculating ETA:', error);
    }
  };

  const openInGoogleMaps = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}`;
    Linking.openURL(url).catch(err => {
      console.error('Error opening Google Maps:', err);
      Alert.alert('Error', 'Could not open Google Maps');
    });
  };

  const startNavigation = () => {
    Alert.alert(
      'Start Navigation',
      'Choose your preferred navigation app:',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Google Maps',
          onPress: openInGoogleMaps,
        },
        {
          text: 'Continue In-App',
          onPress: () => {
            // Continue with in-app navigation
            console.log('Starting in-app navigation');
          },
        },
      ]
    );
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${meters} m`;
  };

  const getPolylineCoordinates = () => {
    if (!directions || !directions.routes[0]) return [];

    const points = directions.routes[0].overview_polyline.points;
    return decodePolyline(points);
  };

  const decodePolyline = (encoded: string) => {
    const poly = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
      let b;
      let shift = 0;
      let result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      poly.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }

    return poly;
  };

  if (!currentLocation) {
    return (
      <View style={styles.container}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" />
              <Text style={styles.loadingText}>Getting your location...</Text>
            </View>
          </Card.Content>
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Destination Info Card */}
      <Card style={styles.infoCard}>
        <Card.Content>
          <Title numberOfLines={2}>{destination.address}</Title>
          <View style={styles.etaContainer}>
            {eta && (
              <>
                <Chip icon="clock-outline" style={styles.etaChip}>
                  {formatDuration(eta.duration)}
                </Chip>
                <Chip icon="map-marker-distance" style={styles.etaChip}>
                  {formatDistance(eta.distance)}
                </Chip>
              </>
            )}
          </View>
        </Card.Content>
      </Card>

      {/* Map View */}
      <Card style={styles.mapCard}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={{
            latitude: (currentLocation.latitude + destination.latitude) / 2,
            longitude: (currentLocation.longitude + destination.longitude) / 2,
            latitudeDelta: Math.abs(currentLocation.latitude - destination.latitude) * 1.5,
            longitudeDelta: Math.abs(currentLocation.longitude - destination.longitude) * 1.5,
          }}
          showsUserLocation={true}
          showsMyLocationButton={true}
          showsTraffic={true}
        >
          {/* Current location marker */}
          <Marker
            coordinate={currentLocation}
            title="Your Location"
            pinColor="blue"
          />
          
          {/* Destination marker */}
          <Marker
            coordinate={destination}
            title="Destination"
            description={destination.address}
            pinColor="red"
          />

          {/* Route polyline */}
          {directions && (
            <Polyline
              coordinates={getPolylineCoordinates()}
              strokeColor="#2196F3"
              strokeWidth={4}
            />
          )}
        </MapView>
      </Card>

      {/* Navigation Controls */}
      <Card style={styles.controlsCard}>
        <Card.Content>
          <View style={styles.controlsContainer}>
            <Button
              mode="contained"
              onPress={startNavigation}
              style={styles.navigationButton}
              icon="navigation"
              disabled={loading}
            >
              Start Navigation
            </Button>
            
            <View style={styles.secondaryButtons}>
              <Button
                mode="outlined"
                onPress={loadDirections}
                style={styles.secondaryButton}
                icon="refresh"
                disabled={loading}
              >
                Refresh Route
              </Button>
              
              <Button
                mode="outlined"
                onPress={() => navigation.goBack()}
                style={styles.secondaryButton}
                icon="arrow-left"
              >
                Back to Route
              </Button>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <Card style={styles.loadingCard}>
            <Card.Content>
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" />
                <Text style={styles.loadingText}>Loading directions...</Text>
              </View>
            </Card.Content>
          </Card>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  infoCard: {
    margin: 16,
    marginBottom: 8,
  },
  etaContainer: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  etaChip: {
    backgroundColor: '#E3F2FD',
  },
  mapCard: {
    flex: 1,
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
  },
  map: {
    flex: 1,
    borderRadius: 8,
  },
  controlsCard: {
    margin: 16,
    marginTop: 8,
  },
  controlsContainer: {
    gap: 16,
  },
  navigationButton: {
    paddingVertical: 8,
  },
  secondaryButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButton: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCard: {
    margin: 32,
    minWidth: 200,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  card: {
    margin: 16,
  },
});

export default NavigationScreen;